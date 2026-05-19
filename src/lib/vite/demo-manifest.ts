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
}

interface ResolvedOptions {
    root: string
    examplesDir: string
    output: string
    themes: [string, string]
    langs: string[]
}

const DEFAULT_LANGS = ['svelte', 'typescript', 'javascript', 'html']

function resolveOptions(opts: DemoManifestOptions): ResolvedOptions {
    const root = opts.root ?? process.cwd()
    return {
        root,
        examplesDir: opts.examplesDir ?? 'src/lib/examples',
        output: opts.output ?? 'src/lib/demo-manifest.json',
        themes: opts.themes ?? ['github-light', 'one-dark-pro'],
        langs: Array.from(new Set([...DEFAULT_LANGS, ...(opts.extraLangs ?? [])]))
    }
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
        // Display copy: docs-kit imports + their tags stripped, snippet
        // wrappers unwrapped, then prettier-formatted so the orphan
        // indentation left behind by the strip pass gets normalised. The
        // raw file on disk stays as-is.
        const stripped = stripDocsKitChrome(raw)
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
