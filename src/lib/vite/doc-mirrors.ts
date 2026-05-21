/**
 * Vite plugin: docs-kit LLM doc-mirror generator.
 *
 * Walks `src/routes/docs/**` for `+page.svx` files, strips Svelte-specific
 * syntax (script blocks, component tags) while preserving fenced code
 * blocks, and writes clean Markdown to `static/docs/<slug>.md`. The result
 * is served verbatim at `https://<site>/docs/<slug>.md` — the dominant
 * citation surface for ChatGPT, Perplexity, and other LLM crawlers
 * (Tailwind / shadcn / Astro all ship the same pattern).
 *
 * Why a Vite plugin (replacing the prior per-consumer `.mjs` script):
 *  - Initial generation hooks into `buildStart`, so it fires for both
 *    `vite dev` and `vite build` with no consumer-side scripts.
 *  - Dev-time watching reuses Vite's own file watcher — no second
 *    chokidar process to keep running.
 *  - Single source of truth across every docs-kit consumer; bug fixes
 *    propagate via a tag bump instead of N copy-pasted scripts.
 *
 * Wiring (consumer's `vite.config.ts`):
 *
 * ```ts
 * import { docMirrorsPlugin } from '@humanspeak/docs-kit/vite'
 *
 * export default defineConfig({
 *     plugins: [
 *         sveltekit(),
 *         docMirrorsPlugin({ siteUrl: 'https://example.com' })
 *     ]
 * })
 * ```
 *
 * Pair with a `.gitignore` entry for the output dir (`static/docs/`) — the
 * `.md` files are derived artifacts.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join, relative, resolve as resolvePath, sep } from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'

export interface DocMirrorsOptions {
    /** Public site URL used in source-attribution headers. Required —
     *  the comment + "Source:" link inside each mirror points back at the
     *  canonical HTML doc, so LLMs can deep-link to the page they cite. */
    siteUrl: string
    /** Filesystem root for scanning. When omitted, the plugin adopts
     *  Vite's resolved project root (`config.root`, i.e. the directory
     *  containing `vite.config.{ts,js}`). Override when the plugin
     *  should scan a directory outside the Vite project. */
    root?: string
    /** Directory (relative to `root`) holding the docs routes. Default
     *  `src/routes/docs`. */
    docsDir?: string
    /** Output directory (relative to `root`). Default `static/docs`. */
    outputDir?: string
    /** Source page filename. Default `+page.svx`. Override if your docs
     *  use `+page.md` or a custom MDsveX extension. */
    pageFile?: string
}

interface ResolvedOptions {
    siteUrl: string
    root: string
    docsDir: string
    outputDir: string
    pageFile: string
}

function resolveOptions(opts: DocMirrorsOptions): ResolvedOptions {
    if (!opts.siteUrl) {
        throw new Error('[docs-kit:doc-mirrors] `siteUrl` option is required')
    }
    return {
        siteUrl: opts.siteUrl.replace(/\/+$/, ''),
        root: opts.root ?? process.cwd(),
        docsDir: opts.docsDir ?? 'src/routes/docs',
        outputDir: opts.outputDir ?? 'static/docs',
        pageFile: opts.pageFile ?? '+page.svx'
    }
}

/** Normalise an OS-native path to posix slashes for slug derivation. */
const toPosix = (p: string): string => (sep === '/' ? p : p.split(sep).join('/'))

/** Recursively find every page file under `dir`. */
async function findPageFiles(dir: string, pageFile: string, out: string[] = []): Promise<string[]> {
    let entries
    try {
        entries = await readdir(dir, { withFileTypes: true })
    } catch {
        return out
    }
    for (const entry of entries) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
            await findPageFiles(full, pageFile, out)
        } else if (entry.name === pageFile) {
            out.push(full)
        }
    }
    return out
}

/** Map a page file path to its flat output slug. The path is posix-normalised
 *  so the separator math is the same on every host.
 *
 *  `<docsRoot>/api/table/+page.svx` → `api-table`
 *  `<docsRoot>/+page.svx`           → `_index`
 */
function toSlug(file: string, docsRoot: string, pageFile: string): string {
    const escaped = pageFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const stripRe = new RegExp(`/?${escaped}$`, 'i')
    const rel = toPosix(file.replace(docsRoot, '')).replace(stripRe, '')
    if (rel === '' || rel === '/') return '_index'
    return rel.replace(/^\/+/, '').replace(/\//g, '-')
}

/** Public route path for a page file, e.g. `/docs` or `/docs/api/table`. */
function toRoutePath(file: string, docsRoot: string, pageFile: string, docsDir: string): string {
    const escaped = pageFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const stripRe = new RegExp(`/?${escaped}$`, 'i')
    const rel = toPosix(file.replace(docsRoot, '')).replace(stripRe, '').replace(/^\/+/, '')
    // Translate `src/routes/docs` → `/docs` (drop the `src/routes` prefix
    // SvelteKit strips). If the consumer mounted docs elsewhere, mirror
    // that here.
    const routePrefix =
        '/' +
        toPosix(docsDir)
            .replace(/^src\/routes\/?/, '')
            .replace(/^\/+|\/+$/g, '')
    return rel ? `${routePrefix}/${rel}` : routePrefix
}

/** Parse YAML-ish frontmatter (title + description). Intentionally minimal
 *  — full YAML is overkill for our docs and pulling a dep into the plugin
 *  surface would bloat consumers. */
function parseFrontmatter(src: string): { rest: string; fm: Record<string, string> } {
    // `\r?\n` makes the regex CRLF-safe so Windows-edited .svx files don't
    // silently skip metadata extraction.
    const match = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
    if (!match) return { rest: src, fm: {} }
    const body = match[1]
    const fm: Record<string, string> = {}
    for (const line of body.split(/\r?\n/)) {
        const m = line.match(/^(\w+):\s*(.*?)\s*$/)
        if (!m) continue
        let value = m[2]
        // Strip surrounding quotes (frontmatter values may use either flavor —
        // both string literals are required for the check to be exhaustive).
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith(`'`) && value.endsWith(`'`))
        ) {
            value = value.slice(1, -1)
        }
        fm[m[1]] = value
    }
    return { rest: src.slice(match[0].length), fm }
}

/**
 * Strip Svelte-specific syntax from a `.svx` body so the result reads as
 * clean markdown. Fenced code blocks are preserved verbatim — only prose
 * is processed.
 *
 *   - Remove `<script>...</script>` blocks entirely.
 *   - Replace `<Example exampleUrl="X">…</Example>` with a "Live example: X"
 *     marker so the link is preserved.
 *   - Drop other component tags (uppercase or namespaced), keeping their
 *     children inline.
 *   - Collapse runs of blank lines to at most two.
 */
function stripSvelte(body: string, siteUrl: string): string {
    type Segment = { kind: 'prose' | 'code'; text: string }
    const segments: Segment[] = []
    const fenceRe = /^(```|~~~)[^\n]*\n[\s\S]*?\n\1[ \t]*$/gm
    let lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = fenceRe.exec(body)) !== null) {
        if (m.index > lastIndex) {
            segments.push({ kind: 'prose', text: body.slice(lastIndex, m.index) })
        }
        segments.push({ kind: 'code', text: m[0] })
        lastIndex = m.index + m[0].length
    }
    if (lastIndex < body.length) {
        segments.push({ kind: 'prose', text: body.slice(lastIndex) })
    }

    const processProse = (text: string): string => {
        let out = text

        // Strip <script> blocks (including <script lang="ts">).
        out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>\s*/gi, '')

        // <Example exampleUrl="/examples/x" …>…</Example> → marker link.
        out = out.replace(/<Example\b([^>]*)>[\s\S]*?<\/Example>/g, (_match, attrs) => {
            const urlMatch = attrs.match(/exampleUrl=["']([^"']+)["']/)
            if (urlMatch) {
                return `\n> Live example: [${urlMatch[1]}](${siteUrl}${urlMatch[1]})\n`
            }
            return ''
        })

        // Self-closing component tags: <SomeComponent ... /> → drop.
        out = out.replace(/<([A-Z][\w.]*)\b[^>]*\/>\s*/g, '')

        // Paired component tags: <SomeComponent>...</SomeComponent> → keep inner.
        // The backreference \1 ensures the closing tag matches the opening name.
        out = out.replace(/<([A-Z][\w.]*)\b[^>]*>([\s\S]*?)<\/\1>\s*/g, (..._m) => _m[2] as string)

        // Drop any leftover single-line component opens/closes.
        out = out.replace(/^<\/?[A-Z][\w.]*\b[^>]*>\s*$/gm, '')

        return out
    }

    let merged = segments.map((s) => (s.kind === 'prose' ? processProse(s.text) : s.text)).join('')

    merged = merged.replace(/\n{3,}/g, '\n\n')
    return merged.trim() + '\n'
}

/** Build the final `.md` body for one doc page. */
function buildMarkdown(args: {
    slug: string
    fm: Record<string, string>
    body: string
    routePath: string
    siteUrl: string
}): string {
    const { slug, fm, body, routePath, siteUrl } = args
    const title = fm.title || slug.replace(/-/g, ' ')
    const description = fm.description || ''

    // Strip a leading H1 from the body if it matches the frontmatter title, so
    // we don't render the same headline twice.
    let cleanedBody = stripSvelte(body, siteUrl)
    const leadingH1 = cleanedBody.match(/^#\s+(.+?)\s*\n/)
    if (leadingH1 && leadingH1[1].trim().toLowerCase() === title.trim().toLowerCase()) {
        cleanedBody = cleanedBody.slice(leadingH1[0].length).trimStart()
    }

    const headerLines = [`<!-- Source: ${siteUrl}${routePath} -->`, '', `# ${title}`, '']
    if (description) {
        headerLines.push(`> ${description}`, '')
    }
    headerLines.push(`**Source:** [${siteUrl}${routePath}](${siteUrl}${routePath})`, '', '---', '')

    return headerLines.join('\n') + '\n' + cleanedBody
}

/** Process a single file and write its mirror. Returns true if the on-disk
 *  content changed (so HMR can decide whether to broadcast). */
async function writeMirror(
    file: string,
    opts: ResolvedOptions,
    docsRoot: string,
    outputAbs: string
): Promise<boolean> {
    const slug = toSlug(file, docsRoot, opts.pageFile)
    const raw = await readFile(file, 'utf8')
    const { fm, rest } = parseFrontmatter(raw)
    const routePath = toRoutePath(file, docsRoot, opts.pageFile, opts.docsDir)
    const outName = slug === '_index' ? 'index.md' : `${slug}.md`
    const outPath = join(outputAbs, outName)
    const next = buildMarkdown({ slug, fm, body: rest, routePath, siteUrl: opts.siteUrl })

    let current = ''
    if (existsSync(outPath)) {
        try {
            current = await readFile(outPath, 'utf8')
        } catch {
            /* fall through and write */
        }
    }
    if (current === next) return false

    await mkdir(outputAbs, { recursive: true })
    await writeFile(outPath, next, 'utf8')
    return true
}

/** Wipe + regenerate every mirror. Used at `buildStart` so stale slugs from
 *  deleted/renamed docs don't linger. */
async function regenerateAll(
    opts: ResolvedOptions,
    docsRoot: string,
    outputAbs: string
): Promise<number> {
    const files = await findPageFiles(docsRoot, opts.pageFile)
    await rm(outputAbs, { recursive: true, force: true })
    await mkdir(outputAbs, { recursive: true })
    await Promise.all(files.map((f) => writeMirror(f, opts, docsRoot, outputAbs)))
    return files.length
}

/** Factory for the Vite plugin. Each call returns a fresh plugin so the
 *  same project can register it more than once if needed (one per docs
 *  tree, multiple site URLs, etc.). */
export function docMirrorsPlugin(userOptions: DocMirrorsOptions): Plugin {
    const opts = resolveOptions(userOptions)
    // Mutable so `configResolved` can re-resolve against Vite's project root
    // when the consumer didn't pass an explicit `root`. Without that,
    // `process.cwd()` (which only captures *invocation* cwd) lands the
    // mirrors at the wrong path when vite is invoked from outside the
    // project — e.g. `pnpm --filter docs dev` from the workspace root
    // produces `process.cwd()` = workspace root, not the docs subdirectory
    // where the consumer's `vite.config.ts` lives.
    let docsAbs = resolvePath(opts.root, opts.docsDir)
    let outputAbs = resolvePath(opts.root, opts.outputDir)

    /** Predicate: does this absolute path live inside the docs tree as a
     *  page file? Used for change/add events from the watcher. */
    function isWatched(absPath: string): boolean {
        if (!absPath.startsWith(docsAbs + sep) && absPath !== docsAbs) return false
        return absPath.endsWith(sep + opts.pageFile)
    }

    return {
        name: 'docs-kit:doc-mirrors',
        configResolved(config) {
            if (userOptions.root !== undefined) return
            opts.root = config.root
            docsAbs = resolvePath(config.root, opts.docsDir)
            outputAbs = resolvePath(config.root, opts.outputDir)
        },
        async buildStart() {
            // Skip silently when the docs dir doesn't exist — lets the
            // plugin be a safe default in starter templates.
            if (!existsSync(docsAbs)) return
            await regenerateAll(opts, docsAbs, outputAbs)
        },
        configureServer(server: ViteDevServer) {
            // Watch the docs root so newly-created +page files fire change
            // events even when the watcher hadn't picked them up yet.
            findPageFiles(docsAbs, opts.pageFile).then((files) => {
                for (const file of files) server.watcher.add(file)
                server.watcher.add(docsAbs)
            })

            const onChange = async (file: string) => {
                const abs = relative('', file) ? resolvePath(file) : file
                if (!isWatched(abs)) return
                const changed = await writeMirror(abs, opts, docsAbs, outputAbs)
                if (changed) {
                    // Mirrors are static assets; nothing in the dev module
                    // graph imports them. A full reload isn't needed —
                    // the next fetch of `/docs/<slug>.md` will pick up
                    // the new content directly from disk.
                }
            }

            const onUnlink = async (file: string) => {
                const abs = relative('', file) ? resolvePath(file) : file
                if (!isWatched(abs)) return
                // Easiest correct path: re-derive the slug, delete its
                // mirror. Faster than a full regenerate and avoids the
                // race window where a stale slug survives until the next
                // restart.
                const slug = toSlug(abs, docsAbs, opts.pageFile)
                const outName = slug === '_index' ? 'index.md' : `${slug}.md`
                const outPath = join(outputAbs, outName)
                if (existsSync(outPath)) {
                    await rm(outPath, { force: true })
                }
            }

            server.watcher.on('add', onChange)
            server.watcher.on('change', onChange)
            server.watcher.on('unlink', onUnlink)
        }
    }
}
