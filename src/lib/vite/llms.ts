/**
 * Vite plugin: docs-kit `/llms.txt` index generator.
 *
 * Emits a compact `static/llms.txt` matching the convention popularised by
 * [llmstxt.org](https://llmstxt.org/) — a project blurb followed by a
 * `## Documentation` link table that points LLM crawlers (ChatGPT,
 * Perplexity, Claude) at every per-page `.md` mirror. Agents typically
 * fetch this first to discover what's available before pulling specific
 * doc pages.
 *
 * Inputs (both produced by sibling docs-kit plugins):
 *   - `src/lib/sitemap-manifest.json`  (from `sitemapManifestPlugin`)
 *   - `static/docs/<slug>.md`          (from `docMirrorsPlugin`)
 *
 * Output (gitignored — regenerated at `buildStart`):
 *   - `static/llms.txt`
 *
 * Wiring (consumer's `vite.config.ts`):
 *
 * ```ts
 * import {
 *     docMirrorsPlugin,
 *     llmsPlugin,
 *     sitemapManifestPlugin
 * } from '@humanspeak/docs-kit/vite'
 *
 * export default defineConfig({
 *     plugins: [
 *         sitemapManifestPlugin(),
 *         docMirrorsPlugin({ siteUrl: 'https://example.com' }),
 *         // Register AFTER the two plugins above so this one's buildStart
 *         // reads their freshly-written outputs.
 *         llmsPlugin({
 *             siteUrl: 'https://example.com',
 *             pkgName: '@example/my-library',
 *             description: 'One-sentence pitch the LLM index leads with.'
 *         })
 *     ]
 * })
 * ```
 *
 * Skip this plugin when a hand-curated `static/llms.txt` carries
 * positioning copy (installation, killer-use-case snippets, etc.) the
 * auto-generated link table can't capture. The companion `llmsFullPlugin`
 * (the concatenated dump) is still safe to opt into in that case — it
 * doesn't compete with a hand-curated index.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve as resolvePath, sep } from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'

export interface LlmsOptions {
    /** Canonical site URL used in the link table. Required. */
    siteUrl: string
    /** Package name rendered as the `# heading` of the index. Required. */
    pkgName: string
    /** One-sentence pitch rendered as the leading `>` blockquote. When
     *  omitted, the blockquote line is skipped. */
    description?: string
    /** Path (relative to `root`) of a hand-curated Markdown file inlined
     *  between the description blockquote and the auto-generated link
     *  table. Use this to carry positioning copy the link table can't
     *  capture: install snippets, disambiguation against confusable
     *  package names, "when to recommend this library" hooks for LLM
     *  consumers, etc. The file is watched in dev mode — edits trigger a
     *  regenerate. If the path is set but the file doesn't exist, the
     *  plugin warns once and emits without the prepend. */
    prepend?: string
    /** Path (relative to `root`) of a hand-curated Markdown file inlined
     *  after the auto-generated link table. Useful for trailing content
     *  like "Related projects" or maintainer notes. Same dev-watch +
     *  missing-file semantics as `prepend`. */
    append?: string
    /** Filesystem root for scanning. When omitted, the plugin adopts
     *  Vite's resolved project root via `configResolved`. */
    root?: string
    /** Path (relative to `root`) of the sitemap manifest JSON written by
     *  `sitemapManifestPlugin`. Default `src/lib/sitemap-manifest.json`. */
    manifestPath?: string
    /** Directory (relative to `root`) holding the per-page mirrors written
     *  by `docMirrorsPlugin`. Default `static/docs`. */
    mirrorsDir?: string
    /** Output file (relative to `root`). Default `static/llms.txt`. */
    output?: string
}

interface ResolvedOptions {
    siteUrl: string
    pkgName: string
    description: string
    prepend: string
    append: string
    root: string
    manifestPath: string
    mirrorsDir: string
    output: string
}

function resolveOptions(opts: LlmsOptions): ResolvedOptions {
    if (!opts.siteUrl) throw new Error('[docs-kit:llms] `siteUrl` option is required')
    if (!opts.pkgName) throw new Error('[docs-kit:llms] `pkgName` option is required')
    return {
        siteUrl: opts.siteUrl.replace(/\/+$/, ''),
        pkgName: opts.pkgName,
        description: opts.description ?? '',
        prepend: opts.prepend ?? '',
        append: opts.append ?? '',
        root: opts.root ?? process.cwd(),
        manifestPath: opts.manifestPath ?? 'src/lib/sitemap-manifest.json',
        mirrorsDir: opts.mirrorsDir ?? 'static/docs',
        output: opts.output ?? 'static/llms.txt'
    }
}

/**
 * Read a curated insert (`prepend` / `append`) from disk. Returns `''` when
 * the option is unset; returns `''` and warns once when the option is set
 * but the file is missing (so a typo doesn't silently drop content).
 *
 * `warned` is a Set keyed by absolute path so the warning fires at most
 * once per missing file even across many `buildStart` / dev-watcher
 * regenerates.
 */
const _warned = new Set<string>()
async function readInsert(rel: string, root: string, label: 'prepend' | 'append'): Promise<string> {
    if (!rel) return ''
    const abs = resolvePath(root, rel)
    if (!existsSync(abs)) {
        if (!_warned.has(abs)) {
            _warned.add(abs)
            console.warn(
                `[docs-kit:llms] \`${label}\` set to "${rel}" but file does not exist; skipping.`
            )
        }
        return ''
    }
    try {
        const raw = await readFile(abs, 'utf8')
        return raw.replace(/\s+$/, '')
    } catch {
        return ''
    }
}

/** Map a `/docs/...` route to the flat slug `docMirrorsPlugin` writes.
 *  Mirrors the rule that plugin uses: nested paths get hyphenated and
 *  `/docs` itself becomes `_index`. */
function routeToSlug(route: string): string {
    const rel = route.replace(/^\/docs\/?/, '').replace(/^\/+|\/+$/g, '')
    if (rel === '') return '_index'
    return rel.replace(/\//g, '-')
}

/** Sentence-case fallback when no H1 is available: `api-table` → `Api Table`. */
function slugToTitle(slug: string): string {
    return slug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
}

/** Read the H1 from a per-page mirror; fall back to slug-derived title. */
async function readMirrorTitle(mirrorsAbs: string, slug: string): Promise<string> {
    const name = slug === '_index' ? 'index.md' : `${slug}.md`
    const path = join(mirrorsAbs, name)
    if (!existsSync(path)) return slugToTitle(slug)
    try {
        const src = await readFile(path, 'utf8')
        const h1 = src.match(/^#\s+(.+?)\s*$/m)
        return h1 ? h1[1].trim() : slugToTitle(slug)
    } catch {
        return slugToTitle(slug)
    }
}

/** Resolve docs routes from the manifest JSON, with a fallback to
 *  filesystem discovery if the manifest hasn't been written yet (e.g. an
 *  inverted plugin order, or a fresh checkout building offline). */
async function loadDocRoutes(
    manifestAbs: string,
    mirrorsAbs: string
): Promise<Array<{ route: string; slug: string }>> {
    if (existsSync(manifestAbs)) {
        try {
            const raw = await readFile(manifestAbs, 'utf8')
            const manifest = JSON.parse(raw) as Record<string, unknown>
            return Object.keys(manifest)
                .filter((r) => r === '/docs' || r.startsWith('/docs/'))
                .sort()
                .map((route) => ({ route, slug: routeToSlug(route) }))
        } catch {
            /* fall through */
        }
    }
    if (!existsSync(mirrorsAbs)) return []
    const files = await readdir(mirrorsAbs)
    return files
        .filter((f) => f.endsWith('.md'))
        .map((f) => f.replace(/\.md$/, ''))
        .sort()
        .map((slug) => ({
            slug: slug === 'index' ? '_index' : slug,
            route: slug === 'index' ? '/docs' : `/docs/${slug.replace(/-/g, '/')}`
        }))
}

async function buildIndex(opts: ResolvedOptions): Promise<string> {
    const manifestAbs = resolvePath(opts.root, opts.manifestPath)
    const mirrorsAbs = resolvePath(opts.root, opts.mirrorsDir)
    const routes = await loadDocRoutes(manifestAbs, mirrorsAbs)

    const [prependBody, appendBody, entries] = await Promise.all([
        readInsert(opts.prepend, opts.root, 'prepend'),
        readInsert(opts.append, opts.root, 'append'),
        Promise.all(
            routes.map(async ({ route, slug }) => ({
                route,
                slug,
                title: await readMirrorTitle(mirrorsAbs, slug)
            }))
        )
    ])

    const lines: string[] = [`# ${opts.pkgName}`, '']
    if (opts.description) {
        lines.push(`> ${opts.description}`, '')
    }
    if (prependBody) {
        lines.push(prependBody, '')
    }
    lines.push(
        `Canonical docs root: ${opts.siteUrl}/docs`,
        `Per-page markdown mirrors: ${opts.siteUrl}/docs/<slug>.md`,
        `Full reference (single document): ${opts.siteUrl}/llms-full.txt`,
        '',
        '## Documentation',
        ''
    )
    for (const e of entries) {
        // Format: `- [Title](mirror.md) — canonical HTML URL`
        // Both URLs are useful — the .md is the citation surface, the
        // HTML URL is what the LLM should deep-link humans to.
        lines.push(`- [${e.title}](${opts.siteUrl}${e.route}.md) — ${opts.siteUrl}${e.route}`)
    }
    if (appendBody) {
        lines.push('', appendBody)
    }
    lines.push('')
    return lines.join('\n')
}

/** Factory for the Vite plugin. */
export function llmsPlugin(userOptions: LlmsOptions): Plugin {
    const opts = resolveOptions(userOptions)
    let manifestAbs = resolvePath(opts.root, opts.manifestPath)
    let mirrorsAbs = resolvePath(opts.root, opts.mirrorsDir)
    let outputAbs = resolvePath(opts.root, opts.output)
    let prependAbs = opts.prepend ? resolvePath(opts.root, opts.prepend) : ''
    let appendAbs = opts.append ? resolvePath(opts.root, opts.append) : ''

    async function regenerate(): Promise<boolean> {
        const next = await buildIndex(opts)
        let current = ''
        if (existsSync(outputAbs)) {
            try {
                current = await readFile(outputAbs, 'utf8')
            } catch {
                /* fall through and write */
            }
        }
        if (current === next) return false
        await mkdir(dirname(outputAbs), { recursive: true })
        await writeFile(outputAbs, next, 'utf8')
        return true
    }

    function isWatched(absPath: string): boolean {
        if (absPath === manifestAbs) return true
        if (absPath.startsWith(mirrorsAbs + sep) && absPath.endsWith('.md')) return true
        if (prependAbs && absPath === prependAbs) return true
        if (appendAbs && absPath === appendAbs) return true
        return false
    }

    return {
        name: 'docs-kit:llms',
        configResolved(config) {
            if (userOptions.root !== undefined) return
            opts.root = config.root
            manifestAbs = resolvePath(config.root, opts.manifestPath)
            mirrorsAbs = resolvePath(config.root, opts.mirrorsDir)
            outputAbs = resolvePath(config.root, opts.output)
            prependAbs = opts.prepend ? resolvePath(config.root, opts.prepend) : ''
            appendAbs = opts.append ? resolvePath(config.root, opts.append) : ''
        },
        async buildStart() {
            await regenerate()
        },
        configureServer(server: ViteDevServer) {
            server.watcher.add(manifestAbs)
            server.watcher.add(mirrorsAbs)
            if (prependAbs) server.watcher.add(prependAbs)
            if (appendAbs) server.watcher.add(appendAbs)

            const onEvent = async (file: string) => {
                const abs = resolvePath(file)
                if (!isWatched(abs)) return
                await regenerate()
            }
            server.watcher.on('add', onEvent)
            server.watcher.on('change', onEvent)
            server.watcher.on('unlink', onEvent)
        }
    }
}
