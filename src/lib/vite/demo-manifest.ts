/**
 * Vite plugin: docs-kit demo manifest generator.
 *
 * Scans demo Svelte files inside `src/lib/examples/(any path)/demos/*.svelte`,
 * pre-renders their source with shiki (light + dark themes), and emits a
 * `src/lib/demo-manifest.json` file consumer pages import to populate the
 * "show code" panels in `ExampleV2`.
 *
 * Why a Vite plugin (not a chokidar script):
 *  - Initial generation hooks into `buildStart`, so it fires for both
 *    `vite dev` and `vite build` without consumer-side npm scripts.
 *  - Dev-time watching reuses Vite's own file watcher — no second chokidar
 *    process to keep running.
 *  - HMR: when a demo file changes, we regenerate the manifest and let
 *    Vite's standard JSON-import HMR push the new content to the page.
 *
 * Wiring (consumer's `vite.config.ts`):
 *
 * ```ts
 * import { demoManifestPlugin } from '@humanspeak/docs-kit/vite'
 *
 * export default defineConfig({
 *     plugins: [sveltekit(), demoManifestPlugin()]
 * })
 * ```
 *
 * That's it — no `package.json` scripts to wire, no watcher to manage.
 */
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve as resolvePath, sep } from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'

interface DemoManifestEntry {
    /** Raw source code of the demo file — what the copy button hands to the user. */
    code: string
    /** Language identifier shiki was asked to highlight as. Always `'svelte'` today. */
    lang: 'svelte'
    /** Pre-rendered shiki HTML for both themes. CodeReferenceV2 picks the
     *  variant matching the active theme via CSS at render time. */
    html: {
        light: string
        dark: string
    }
}

type DemoManifest = Record<string, DemoManifestEntry>

export interface DemoManifestOptions {
    /** Filesystem root for scanning. Default: `process.cwd()`. Override when
     *  the plugin runs from a non-standard CWD (monorepo packages, etc.). */
    root?: string
    /** Directory (relative to `root`) that contains the example folders.
     *  The plugin recursively walks this and picks up any `.svelte` file
     *  that lives under a `demos/` segment. Default: `src/lib/examples`. */
    examplesDir?: string
    /** Output manifest path (relative to `root`). Default:
     *  `src/lib/demo-manifest.json`. Keep it inside `src/lib/` so consumer
     *  pages can import it via the `$lib/` alias. */
    output?: string
    /** Shiki themes [light, dark]. Default mirrors what mdsvex uses elsewhere
     *  in docs-kit so colours stay consistent across surfaces. */
    themes?: [string, string]
    /** Extra shiki grammars to load beyond the defaults
     *  (`svelte`, `typescript`, `javascript`, `html`). Use for demos that
     *  reach for `css`, `bash`, `json`, etc. */
    extraLangs?: string[]
    /** Marker substrings whose enclosing comment should be stripped before
     *  highlighting. Catches both block comments inside
     *  `<script>` / `<style>` (`/* HUMANSPEAK ... *​/`) and template
     *  comments in markup (`<!-- HUMANSPEAK ... -->`). Useful for
     *  maintainer notes that explain *why* a demo file carries some
     *  positioning shell, without leaking that explanation into the
     *  published code panel. Match is plain `String.includes` —
     *  case-sensitive, no regex. Default `[]` (feature off). */
    stripComments?: string[]
    /** Class names whose wrapping element should be unwrapped — the
     *  opening + closing tags vanish, the element's children stay in
     *  place as siblings. Pairs with stripping the matching CSS rule
     *  from the demo's `<style>` block so the published source doesn't
     *  carry an orphan selector that targets nothing.
     *
     *  Match is plain class-token equality (`class="foo bar"` matches
     *  both `foo` and `bar`); no regex, no `.` prefix. Self-closing
     *  elements aren't unwrapped (they have no children to preserve);
     *  the plugin leaves them in place and logs a warning at build
     *  time. Default `[]` (feature off). */
    stripWrappers?: string[]
}

interface ResolvedOptions {
    root: string
    examplesDir: string
    output: string
    themes: [string, string]
    langs: string[]
    stripComments: string[]
    stripWrappers: string[]
}

const DEFAULT_LANGS = ['svelte', 'typescript', 'javascript', 'html']

function resolveOptions(opts: DemoManifestOptions): ResolvedOptions {
    const root = opts.root ?? process.cwd()
    return {
        root,
        examplesDir: opts.examplesDir ?? 'src/lib/examples',
        output: opts.output ?? 'src/lib/demo-manifest.json',
        themes: opts.themes ?? ['github-light', 'one-dark-pro'],
        langs: Array.from(new Set([...DEFAULT_LANGS, ...(opts.extraLangs ?? [])])),
        stripComments: opts.stripComments ?? [],
        stripWrappers: opts.stripWrappers ?? []
    }
}

/**
 * Strip block (`/* … *​/`) and template (`<!-- … -->`) comments whose body
 * contains any of the marker substrings. Lets consumers leave maintainer
 * notes inside demo files (explaining positioning chrome, internal
 * intent, etc.) without leaking that prose into the published code panel.
 *
 * Both comment forms are matched with non-greedy bodies so adjacent
 * comments don't accidentally fuse into a single regex match. Match is
 * `String.includes` — case-sensitive, no regex syntax to escape.
 *
 * Heuristic: doesn't try to tell apart comments inside strings/templates
 * from real comments. Demo files we ship don't embed comment delimiters
 * inside string literals, so we accept the simpler implementation.
 */
function stripMarkedComments(source: string, markers: string[]): string {
    if (markers.length === 0) return source

    // Block comments: /* … */, possibly multi-line.
    const blockCommentRe = /\/\*[\s\S]*?\*\//g
    // Template comments: <!-- … -->, possibly multi-line.
    const templateCommentRe = /<!--[\s\S]*?-->/g

    const shouldStrip = (body: string): boolean => markers.some((m) => body.includes(m))

    return source
        .replace(blockCommentRe, (match) => (shouldStrip(match) ? '' : match))
        .replace(templateCommentRe, (match) => (shouldStrip(match) ? '' : match))
}

/**
 * Unwrap every element whose `class` attribute contains any of the
 * given class tokens. The element's opening + closing tags vanish; the
 * children stay where they were as siblings of the original parent.
 *
 * Tag matching is depth-balanced by tag name so nested same-tag children
 * (e.g. a `<div>` inside our marker `<div>`) don't fool the close-tag
 * search. Multi-line attribute layouts are tolerated — we look at the
 * full text between `<` and `>` regardless of newlines.
 *
 * Self-closing matches (`<MarkerDiv ... />`) have no body to preserve;
 * we leave them in place and log a single warning per build (callers
 * presumably authored the marker class on a wrapping element, not a
 * leaf — silently dropping a leaf would be surprising).
 *
 * Heuristic, not an HTML parser: works for the closed set of patterns
 * a demo file's positioning shell uses. Won't correctly handle:
 *   - Tags inside string literals or template-literal expressions
 *   - Mismatched/unclosed tags (Svelte's compiler would have errored already)
 *   - Attribute-name collisions like `data-class="..."` (matches `class=`
 *     anchored, so this is fine in practice)
 */
function unwrapMarkedElements(source: string, classTokens: string[]): string {
    if (classTokens.length === 0) return source

    // Match opening tags + capture tag name and attrs body.
    // `[^<]*?` for the attrs body keeps the regex from consuming a `<`
    // belonging to a sibling/child element; the outer `[\s\S]` flag is
    // implicit via the character-class shape.
    const openTagRe = /<(\w[\w-]*)([^<>]*?)>/g

    // Within a captured attrs body, look for `class="…"` or `class='…'`
    // and split the value on whitespace. Tolerates spread-style
    // `class={…}` only loosely — we treat the literal text inside `{}`
    // as a class string, which is good enough for typical demo files
    // and degrades safely (no match → no strip) for dynamic classes.
    const classValueRe = /\bclass\s*=\s*(?:["']([^"']*)["']|\{([^}]*)\})/

    const hasMarkerClass = (attrs: string): boolean => {
        const m = classValueRe.exec(attrs)
        if (!m) return false
        const raw = m[1] ?? m[2] ?? ''
        const tokens = raw.replace(/['"]/g, '').split(/\s+/).filter(Boolean)
        return tokens.some((t) => classTokens.includes(t))
    }

    /** Find the index of the matching closing tag for `<tagName>` starting
     *  scanning at `from`. Depth-balanced by `tagName` so nested same-tag
     *  children don't fool us. Returns `-1` if no balanced close is found. */
    function findMatchingClose(tagName: string, from: number): number {
        const sameTagOpenRe = new RegExp(`<${tagName}\\b[^<>]*?>`, 'g')
        const sameTagSelfCloseRe = new RegExp(`<${tagName}\\b[^<>]*?/>`, 'g')
        const sameTagCloseRe = new RegExp(`</${tagName}\\s*>`, 'g')
        sameTagOpenRe.lastIndex = from
        sameTagSelfCloseRe.lastIndex = from
        sameTagCloseRe.lastIndex = from

        let depth = 1
        let cursor = from
        while (depth > 0) {
            sameTagOpenRe.lastIndex = cursor
            sameTagSelfCloseRe.lastIndex = cursor
            sameTagCloseRe.lastIndex = cursor
            const opens = sameTagOpenRe.exec(source)
            const selfs = sameTagSelfCloseRe.exec(source)
            const closes = sameTagCloseRe.exec(source)
            if (!closes) return -1

            // Pick whichever event happens first.
            const events = [opens, closes].filter(Boolean) as RegExpExecArray[]
            events.sort((a, b) => a.index - b.index)
            const next = events[0]
            if (!next) return -1

            // Self-closing same-tag elements aren't real depth changes; we
            // detect them by checking whether the open match ends with `/>`.
            const isSelfClose = next === opens && /\/>\s*$/.test(next[0])
            if (next === opens && !isSelfClose) depth++
            else if (next === closes) depth--

            cursor = next.index + next[0].length
        }
        return cursor - `</${tagName}>`.length
    }

    // Collect ranges to delete; apply them right-to-left so earlier
    // offsets stay valid as the string shrinks.
    type Range = { start: number; end: number }
    const deletions: Range[] = []
    let warned = false

    // We can't reuse `openTagRe.exec` mid-loop because we mutate the
    // string, so collect matches first and resolve close indices once.
    const matches: { tag: string; openStart: number; openEnd: number; isSelfClose: boolean }[] = []
    let m: RegExpExecArray | null
    while ((m = openTagRe.exec(source))) {
        const [full, tag, attrs] = m
        if (!hasMarkerClass(attrs)) continue
        const isSelfClose = /\/>\s*$/.test(full)
        matches.push({
            tag,
            openStart: m.index,
            openEnd: m.index + full.length,
            isSelfClose
        })
    }

    for (const { tag, openStart, openEnd, isSelfClose } of matches) {
        if (isSelfClose) {
            if (!warned) {
                // eslint-disable-next-line no-console
                console.warn(
                    `[docs-kit:demo-manifest] stripWrappers: self-closing <${tag}> with marker class is unsupported — leaving in place.`
                )
                warned = true
            }
            continue
        }
        const closeStart = findMatchingClose(tag, openEnd)
        if (closeStart === -1) {
            // No balanced close — leave the source untouched rather than
            // produce a half-stripped result.
            continue
        }
        const closeEnd = closeStart + `</${tag}>`.length
        deletions.push({ start: openStart, end: openEnd })
        deletions.push({ start: closeStart, end: closeEnd })
    }

    // Apply right-to-left.
    deletions.sort((a, b) => b.start - a.start)
    let out = source
    for (const { start, end } of deletions) {
        out = out.slice(0, start) + out.slice(end)
    }
    return out
}

/**
 * Strip rules from `<style>` blocks that target ONLY the given class
 * tokens. Pairs with `unwrapMarkedElements` so the published code
 * doesn't carry an orphan `.humanspeak-demo-shell { … }` rule pointing
 * at an element that no longer exists.
 *
 * Limitations:
 *  - Doesn't try to handle compound selectors. `.marker, .other`
 *    survives intact (it still has a useful arm). To strip the
 *    `.marker` arm specifically we'd need a CSS parser; deferred until
 *    we have a real reason.
 *  - At-rules (`@media`, `@supports`, …) aren't recursed into. A demo
 *    that hides its positioning shell behind `@media` will leave an
 *    orphan rule; rare enough that we accept it.
 *  - When the strip leaves the `<style>` body whitespace-only, the
 *    element itself is removed too. (Earlier versions left an empty
 *    `<style></style>` shell trailing the published code, which is
 *    visual noise — even though Svelte tolerates it at runtime.)
 */
function stripOrphanCSSRules(source: string, classTokens: string[]): string {
    if (classTokens.length === 0) return source

    const escaped = classTokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    // Selector that targets ONLY one of our marker tokens (no commas,
    // no descendant combinators). Allows for trailing pseudo-classes
    // or :global() wrapping so `.marker:hover { … }` and
    // `:global(.marker) { … }` both strip.
    const orphanRuleRe = new RegExp(
        `(?:^|\\n)[ \\t]*(?::global\\s*\\(\\s*)?\\.(?:${escaped})\\b[\\w:()\\-]*\\s*\\)?\\s*\\{[^}]*\\}`,
        'g'
    )

    return source.replace(/<style([^>]*)>([\s\S]*?)<\/style>/g, (_full, attrs, body) => {
        const cleaned = body.replace(orphanRuleRe, '').replace(/\n{3,}/g, '\n\n')
        // Drop the whole `<style>` element when the strip emptied it —
        // an empty shell in the published code panel is pure noise.
        // `collapseBlanks` later normalises the blank line we leave
        // behind. Preserve elements that still carry any non-whitespace
        // content (rules we didn't target, comments, etc.).
        if (cleaned.trim() === '') return ''
        return `<style${attrs}>${cleaned}</style>`
    })
}

/**
 * Strip docs-kit chrome from a demo source so the displayed snippet is
 * copy-pasteable. The raw file on disk stays as-is (it imports
 * `DemoSplitV2`, `CodeReferenceV2`, etc. so the rendered demo looks right
 * inside the brut sheet); the snippet readers see only the
 * library-against-which-this-demo-is-written usage.
 *
 * What gets stripped:
 *  1. Any `import ... from '@humanspeak/docs-kit'` line.
 *  2. Opening + closing + self-closing tags for any identifier imported
 *     from `@humanspeak/docs-kit`. Multi-line opening tags are tracked
 *     across lines (so attribute-on-its-own-line layouts don't leave
 *     orphan props in the output).
 *  3. `{#snippet name()}` and `{/snippet}` wrappers — the body inside
 *     each snippet stays in place as a sibling.
 *  4. Runs of three or more consecutive blank lines collapse to two.
 *
 * Heuristic, not a real parser — but the rule list above covers every
 * docs-kit chrome pattern the demos use today. If a demo later does
 * something fancier (conditional docs-kit tags, dynamic imports, etc.)
 * we'd need to swap this for a Svelte AST walk.
 */
function stripDocsKitChrome(source: string): string {
    // Collect identifiers imported from docs-kit. Handle both default and
    // named imports across one or more lines.
    const names = new Set<string>()
    const namedRe = /import\s+\{([^}]*)\}\s+from\s+['"]@humanspeak\/docs-kit(?:\/[^'"]+)?['"]/g
    const defaultRe = /import\s+(\w+)\s+from\s+['"]@humanspeak\/docs-kit(?:\/[^'"]+)?['"]/g
    let match: RegExpExecArray | null
    while ((match = namedRe.exec(source))) {
        for (const raw of match[1].split(',')) {
            const name = raw
                .trim()
                .split(/\s+as\s+/i)
                .pop()
            if (name) names.add(name)
        }
    }
    while ((match = defaultRe.exec(source))) {
        names.add(match[1].trim())
    }
    if (names.size === 0) {
        // No docs-kit imports — nothing to strip. Still collapse blank-line
        // runs so the output stays tidy.
        return collapseBlanks(source)
    }

    // Escape for regex.
    const namePattern = Array.from(names)
        .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|')
    const importLineRe = /from\s+['"]@humanspeak\/docs-kit(?:\/[^'"]+)?['"]/
    const openTagRe = new RegExp(`^\\s*<(?:${namePattern})(?:\\s|>|$)`)
    const selfCloseRe = new RegExp(`^\\s*<(?:${namePattern})\\b[^>]*\\/>\\s*$`)
    const closeTagRe = new RegExp(`^\\s*<\\/(?:${namePattern})>\\s*$`)
    const snippetOpenRe = /^\s*\{#snippet\s+\w+\([^)]*\)\}\s*$/
    const snippetCloseRe = /^\s*\{\/snippet\}\s*$/

    const lines = source.split('\n')
    const out: string[] = []
    let i = 0
    while (i < lines.length) {
        const line = lines[i]

        // Strip docs-kit imports (assume single-line — the demos we ship don't
        // use multi-line import bodies and a Svelte parser would be overkill).
        if (importLineRe.test(line)) {
            i++
            continue
        }

        // Self-closing tag fits on one line — skip just that line.
        if (selfCloseRe.test(line)) {
            i++
            continue
        }

        // Opening tag (possibly spans multiple lines). Skip ahead until we see
        // the `>` that closes the opening element so attribute lines don't
        // leak into the output.
        if (openTagRe.test(line)) {
            // The opening might end on this line if there's a `>` (but no `<` after).
            if (/>\s*$/.test(line) || line.includes('>')) {
                i++
                continue
            }
            // Multi-line: keep advancing until the line containing the
            // closing `>` of the opening tag.
            i++
            while (i < lines.length && !lines[i].includes('>')) i++
            i++ // consume the line with the closing `>`
            continue
        }

        // Closing tag for a docs-kit component.
        if (closeTagRe.test(line)) {
            i++
            continue
        }

        // Snippet wrappers — keep the body, drop the bracketing.
        if (snippetOpenRe.test(line)) {
            i++
            continue
        }
        if (snippetCloseRe.test(line)) {
            i++
            continue
        }

        out.push(line)
        i++
    }

    return collapseBlanks(out.join('\n'))
}

/** Collapse 3+ consecutive blank lines down to 2. Keeps deliberate
 *  visual gaps the consumer might have authored, but tidies the
 *  artefacts that the strip pass leaves behind when an entire block
 *  evaporated. */
function collapseBlanks(source: string): string {
    return source.replace(/\n{3,}/g, '\n\n')
}

/**
 * Recursively walk the examples directory and collect every `.svelte` file
 * that lives under a `demos/` segment somewhere on its path. Files outside
 * `demos/` are ignored so consumers can co-locate helpers, types, or
 * non-demo `.svelte` components alongside their demos without polluting
 * the manifest.
 */
async function findDemoFiles(dir: string, out: string[] = []): Promise<string[]> {
    let entries
    try {
        entries = await readdir(dir, { withFileTypes: true })
    } catch {
        // Examples directory doesn't exist yet — fine, return an empty list
        // so the manifest is `{}` rather than a build-time crash.
        return out
    }
    for (const entry of entries) {
        const full = resolvePath(dir, entry.name)
        if (entry.isDirectory()) {
            await findDemoFiles(full, out)
            continue
        }
        if (!entry.name.endsWith('.svelte')) continue
        if (!full.split(sep).includes('demos')) continue
        out.push(full)
    }
    return out
}

/**
 * Build the manifest. Returns the new JSON text rather than writing it so
 * the caller can compare against the on-disk version and skip the write
 * when nothing changed (avoids triggering reload loops in dev).
 */
async function buildManifestJson(
    files: string[],
    options: ResolvedOptions,
    /** Pre-loaded shiki highlighter. Hoisted out of this function so the
     *  caller can keep one instance across regenerations during dev. */
    highlighter: { codeToHtml: (code: string, opts: { lang: string; theme: string }) => string }
): Promise<{ manifest: DemoManifest; json: string }> {
    const examplesRoot = resolvePath(options.root, options.examplesDir)
    const manifest: DemoManifest = {}
    const formatter = await getPrettyPrinter()
    for (const file of files) {
        const rel = relative(examplesRoot, file).split(sep).join('/')
        const raw = await readFile(file, 'utf8')
        // Display copy pipeline (order matters):
        //   1. Drop consumer-marked comments (`stripComments`) — must
        //      run before structural strips so a comment that lives
        //      inside an about-to-be-unwrapped element still gets
        //      removed even if the rest of the strip succeeds.
        //   2. Unwrap consumer-marked wrapper elements
        //      (`stripWrappers`). Children stay in place.
        //   3. Strip orphan CSS rules targeting those marker classes
        //      from the demo's `<style>` block so the displayed source
        //      doesn't carry selectors pointing at nothing.
        //   4. Strip docs-kit chrome (imports + tags + snippet
        //      wrappers) the consumer didn't author themselves.
        //   5. Prettier-format the result so the orphan indentation
        //      left behind by every strip pass gets normalised.
        // The raw file on disk stays as-is for all of this — only the
        // emitted manifest sees the cleaned form.
        const noComments = stripMarkedComments(raw, options.stripComments)
        const unwrapped = unwrapMarkedElements(noComments, options.stripWrappers)
        const noOrphanCSS = stripOrphanCSSRules(unwrapped, options.stripWrappers)
        const stripped = stripDocsKitChrome(noOrphanCSS)
        const code = await formatter(stripped)
        manifest[rel] = {
            code,
            lang: 'svelte',
            html: {
                light: highlighter.codeToHtml(code, {
                    lang: 'svelte',
                    theme: options.themes[0]
                }),
                dark: highlighter.codeToHtml(code, {
                    lang: 'svelte',
                    theme: options.themes[1]
                })
            }
        }
    }
    return { manifest, json: JSON.stringify(manifest, null, 2) + '\n' }
}

/**
 * Build a prettier formatter for Svelte source. Lazy-loads `prettier` +
 * `prettier-plugin-svelte` so the plugin doesn't pay the parse cost when
 * neither is installed — falls back to a passthrough (the stripped text
 * goes straight to shiki) if either dep is missing or fails. Returns a
 * single-argument formatter so the per-file loop stays terse.
 */
async function getPrettyPrinter(): Promise<(source: string) => Promise<string>> {
    try {
        const [{ default: prettier }, sveltePlugin] = await Promise.all([
            import('prettier'),
            // The Svelte plugin's default export is the plugin object; some
            // resolvers expose it under `default`, others as the module
            // itself. Tolerate both.
            import('prettier-plugin-svelte').then((m: { default?: unknown }) => m.default ?? m)
        ])
        return async (source: string) => {
            try {
                return await prettier.format(source, {
                    parser: 'svelte',
                    plugins: [sveltePlugin as never],
                    // Match what most consumers want for a copy-pasteable
                    // snippet — readable line length, 4-space tabs, single
                    // quotes, no trailing commas in templates.
                    printWidth: 100,
                    tabWidth: 4,
                    useTabs: false,
                    singleQuote: true,
                    semi: false,
                    trailingComma: 'none'
                })
            } catch {
                // Formatter blew up on this specific source — keep the
                // stripped-but-unformatted version rather than failing the
                // whole manifest build.
                return source
            }
        }
    } catch {
        // Prettier (or the Svelte plugin) isn't installed in the consumer
        // — that's fine, the stripped source is still copy-pasteable.
        return async (source: string) => source
    }
}

/**
 * Factory for the Vite plugin. Each call returns a fresh plugin so a
 * project can register the plugin multiple times with different scan dirs
 * if it ever needs to (one for `src/lib/examples`, another for
 * `src/lib/playbook`, say).
 */
export function demoManifestPlugin(userOptions: DemoManifestOptions = {}): Plugin {
    const opts = resolveOptions(userOptions)
    const examplesAbs = resolvePath(opts.root, opts.examplesDir)
    const outputAbs = resolvePath(opts.root, opts.output)

    // Singleton highlighter — created lazily on first run, reused across
    // every subsequent regeneration so we don't repeatedly pay shiki's
    // grammar-loading cost during dev.
    let highlighter: {
        codeToHtml: (code: string, opts: { lang: string; theme: string }) => string
    } | null = null

    async function getHighlighter() {
        if (highlighter) return highlighter
        // Dynamic import keeps shiki out of consumers' bundles that don't
        // use the plugin and lets it stay an optional peer dep.
        const { createHighlighter } = await import('shiki')
        highlighter = await createHighlighter({
            themes: opts.themes,
            langs: opts.langs
        })
        return highlighter
    }

    async function regenerate() {
        const files = await findDemoFiles(examplesAbs)
        const h = await getHighlighter()
        const { json } = await buildManifestJson(files, opts, h)

        // Skip the write if the content hasn't changed — saves a no-op
        // round trip through Vite's watcher (which would otherwise see the
        // mtime bump and trigger HMR for a file whose content is identical).
        let current = ''
        if (existsSync(outputAbs)) {
            try {
                current = await readFile(outputAbs, 'utf8')
            } catch {
                /* fall through and write */
            }
        }
        if (current === json) return false

        await mkdir(dirname(outputAbs), { recursive: true })
        await writeFile(outputAbs, json, 'utf8')
        return true
    }

    /** Test whether a path that just changed should retrigger generation:
     *  it must live under the examples dir AND inside a `demos/` segment. */
    function isWatchedDemoFile(absPath: string): boolean {
        if (!absPath.startsWith(examplesAbs + sep)) return false
        if (!absPath.endsWith('.svelte')) return false
        const parts = absPath.split(sep)
        return parts.includes('demos')
    }

    return {
        name: 'docs-kit:demo-manifest',
        // Run before SvelteKit / svelte plugins so the manifest exists when
        // any +page.svelte that imports it is first resolved.
        enforce: 'pre',
        async buildStart() {
            await regenerate()
        },
        configureServer(server: ViteDevServer) {
            // Make sure Vite's watcher knows about every demo file even if
            // no module currently imports them — otherwise a brand-new
            // file's first save wouldn't fire `change`.
            findDemoFiles(examplesAbs).then((files) => {
                for (const file of files) server.watcher.add(file)
                // Also watch the examples dir itself so newly created
                // demo files get picked up.
                server.watcher.add(examplesAbs)
            })

            const onWatcherEvent = async (file: string) => {
                if (!isWatchedDemoFile(file)) return
                const changed = await regenerate()
                if (changed) {
                    // Vite's JSON-import HMR will fire automatically when the
                    // manifest file changes on disk, but a full reload makes
                    // the update predictable for snippet panels that bind to
                    // pre-highlighted HTML strings via `{@html ...}`.
                    server.ws.send({ type: 'full-reload', path: '*' })
                }
            }
            server.watcher.on('add', onWatcherEvent)
            server.watcher.on('change', onWatcherEvent)
            server.watcher.on('unlink', onWatcherEvent)
        }
    }
}
