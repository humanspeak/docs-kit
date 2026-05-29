/**
 * Vite plugin: docs-kit sitemap manifest generator.
 *
 * Scans `src/routes/**` for `+page.{svelte,svx,md}` files and writes a
 * `src/lib/sitemap-manifest.json` keyed by route path → ISO last-modified
 * date. Optional: also discovers blog posts from a Markdown content
 * directory and includes them in the manifest.
 *
 * Why a Vite plugin (replacing the prior chokidar + npm-script setup):
 *  - Initial generation hooks into `buildStart`, so it fires for both
 *    `vite dev` and `vite build` with no consumer-side scripts.
 *  - Dev-time watching reuses Vite's own file watcher — no second
 *    chokidar process to keep running.
 *  - HMR: changes to `+page.*` files (or blog markdown) regenerate the
 *    manifest and Vite reloads any modules that imported it.
 *
 * Wiring (consumer's `vite.config.ts`):
 *
 * ```ts
 * import { sitemapManifestPlugin } from '@humanspeak/docs-kit/vite'
 *
 * export default defineConfig({
 *     plugins: [sveltekit(), sitemapManifestPlugin()]
 * })
 * ```
 *
 * Pair with the existing `routes/sitemap.xml/+server.ts` (or equivalent)
 * that reads the JSON and emits the XML feed.
 */
import { existsSync } from 'node:fs'
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve as resolvePath, sep } from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'

type SitemapManifest = Record<string, string>
type SitemapPageData =
    | string
    | {
          route: string
          /** ISO `YYYY-MM-DD` last-modified date. Defaults to `source` mtime
           *  when provided, otherwise today's date. */
          lastmod?: string
          /** File path, relative to `root` unless absolute, whose mtime should
           *  drive this route. Useful for SvelteKit dynamic route entries. */
          source?: string
      }

export interface SitemapManifestOptions {
    /** Filesystem root for scanning. When omitted, the plugin adopts
     *  Vite's resolved project root (`config.root`, i.e. the directory
     *  containing `vite.config.{ts,js}`). Override when the plugin
     *  should scan a directory outside the Vite project. */
    root?: string
    /** Directory (relative to `root`) holding the SvelteKit routes. Default
     *  `src/routes`. */
    routesDir?: string
    /** Output manifest path (relative to `root`). Default
     *  `src/lib/sitemap-manifest.json`. */
    output?: string
    /** Optional: directory (relative to `root`) holding blog posts as
     *  Markdown files. When set, every `.md` file becomes a `/blog/<slug>`
     *  entry in the manifest and a `/blog` index entry is added. Pass
     *  `false` to disable. Default `src/content/blog`. */
    blogDir?: string | false
    /** Route prefixes to exclude from the manifest (e.g. internal-only
     *  generators). Default `['/social-cards']`. */
    excludePrefixes?: string[]
    /** Concrete routes to add after filesystem discovery. Use this for
     *  prerendered dynamic routes such as `/compare/<slug>`, since the route
     *  file itself is only a placeholder like `/compare/[slug]`. Mirrors
     *  `socialCardsPlugin({ extraPages })` for runtime-built pages. */
    extraPages?: SitemapPageData[]
}

interface ResolvedOptions {
    root: string
    routesDir: string
    output: string
    blogDir: string | false
    excludePrefixes: string[]
    extraPages: SitemapPageData[]
}

function resolveOptions(opts: SitemapManifestOptions): ResolvedOptions {
    const root = opts.root ?? process.cwd()
    return {
        root,
        routesDir: opts.routesDir ?? 'src/routes',
        output: opts.output ?? 'src/lib/sitemap-manifest.json',
        blogDir: opts.blogDir === false ? false : (opts.blogDir ?? 'src/content/blog'),
        excludePrefixes: opts.excludePrefixes ?? ['/social-cards'],
        extraPages: opts.extraPages ?? []
    }
}

/** Convert a `+page.svelte` (or .svx / .md) absolute path to the route it
 *  serves: strip the routes root and the `/+page.*` suffix; map empty to
 *  `/` for the home route. */
function toRoutePath(file: string, routesRoot: string): string {
    let p = file.replace(routesRoot, '')
    p = p.replace(/[\\/]\+page\.(svelte|svx|md)$/i, '')
    p = p.split(sep).join('/')
    return p === '' ? '/' : p
}

function isDynamicRoute(route: string): boolean {
    return route.split('/').some((segment) => /^\[.+\]$/.test(segment))
}

function normalizeRoute(route: string): string {
    return route.startsWith('/') ? route : `/${route}`
}

async function getExtraPageDate(page: SitemapPageData, root: string): Promise<string> {
    if (typeof page !== 'string') {
        if (page.lastmod) return page.lastmod
        if (page.source) {
            const source = resolvePath(root, page.source)
            const s = await stat(source)
            return new Date(s.mtimeMs).toISOString().slice(0, 10)
        }
    }
    return new Date().toISOString().slice(0, 10)
}

/** Recursively walk `dir` and collect every `+page.{svelte,svx,md}` path. */
async function findPageFiles(dir: string, out: string[] = []): Promise<string[]> {
    let entries
    try {
        entries = await readdir(dir, { withFileTypes: true })
    } catch {
        return out
    }
    for (const entry of entries) {
        const full = resolvePath(dir, entry.name)
        if (entry.isDirectory()) {
            await findPageFiles(full, out)
            continue
        }
        if (/^\+page\.(svelte|svx|md)$/i.test(entry.name)) {
            out.push(full)
        }
    }
    return out
}

/** Build the manifest JSON from the routes dir (and optional blog dir).
 *  Returns the stringified JSON so callers can compare against the on-disk
 *  copy and skip the write when nothing changed. */
async function buildManifest(options: ResolvedOptions): Promise<string> {
    const routesRoot = resolvePath(options.root, options.routesDir)
    const files = await findPageFiles(routesRoot)
    const manifest: SitemapManifest = {}
    for (const file of files) {
        const route = toRoutePath(file, routesRoot)
        if (isDynamicRoute(route)) continue
        if (options.excludePrefixes.some((p) => route.startsWith(p))) continue
        const s = await stat(file)
        manifest[route] = new Date(s.mtimeMs).toISOString().slice(0, 10)
    }

    if (options.blogDir) {
        const blogRoot = resolvePath(options.root, options.blogDir)
        if (existsSync(blogRoot)) {
            const blogEntries = await readdir(blogRoot, { withFileTypes: true })
            let hasAny = false
            for (const entry of blogEntries) {
                if (!entry.isFile() || !entry.name.endsWith('.md')) continue
                const slug = entry.name.replace(/\.md$/, '')
                const s = await stat(join(blogRoot, entry.name))
                manifest[`/blog/${slug}`] = new Date(s.mtimeMs).toISOString().slice(0, 10)
                hasAny = true
            }
            if (hasAny) manifest['/blog'] = new Date().toISOString().slice(0, 10)
        }
    }

    for (const page of options.extraPages) {
        const route = normalizeRoute(typeof page === 'string' ? page : page.route)
        if (options.excludePrefixes.some((p) => route.startsWith(p))) continue
        manifest[route] = await getExtraPageDate(page, options.root)
    }

    return JSON.stringify(manifest, null, 2) + '\n'
}

/** Factory for the Vite plugin. Each call returns a fresh plugin so the
 *  same project can register it more than once if it ever needs to (one
 *  per routes dir, etc.). */
export function sitemapManifestPlugin(userOptions: SitemapManifestOptions = {}): Plugin {
    const opts = resolveOptions(userOptions)
    // Mutable so `configResolved` can re-resolve against Vite's project
    // root when the consumer didn't pass an explicit `root`. Without
    // that, `process.cwd()` (which only captures *invocation* cwd) lands
    // the manifest at the wrong path when vite is invoked from outside
    // the project — e.g. `pnpm --filter docs dev` from the workspace
    // root produces `process.cwd()` = workspace root, not the docs
    // subdirectory where the consumer's `vite.config.ts` lives.
    let routesAbs = resolvePath(opts.root, opts.routesDir)
    let blogAbs = opts.blogDir ? resolvePath(opts.root, opts.blogDir) : null
    let outputAbs = resolvePath(opts.root, opts.output)
    let extraPageSources = new Set(
        opts.extraPages.flatMap((page) =>
            typeof page === 'string' || page.source === undefined
                ? []
                : [resolvePath(opts.root, page.source)]
        )
    )

    async function regenerate(): Promise<boolean> {
        const next = await buildManifest(opts)

        // Skip writes that wouldn't change the file — saves a no-op
        // watcher round trip during dev.
        let current = ''
        if (existsSync(outputAbs)) {
            try {
                const { readFile } = await import('node:fs/promises')
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

    /** Should an event for `absPath` retrigger regeneration? +page files
     *  inside the routes dir always count; blog markdown counts when the
     *  blog dir is configured. */
    function isWatched(absPath: string): boolean {
        if (absPath.startsWith(routesAbs + sep)) {
            return /[\\/]\+page\.(svelte|svx|md)$/i.test(absPath)
        }
        if (blogAbs && absPath.startsWith(blogAbs + sep) && absPath.endsWith('.md')) {
            return true
        }
        return false
    }

    return {
        name: 'docs-kit:sitemap-manifest',
        // Run before SvelteKit so the manifest exists when any module that
        // imports it (e.g. `routes/sitemap.xml/+server.ts`) first resolves.
        enforce: 'pre',
        configResolved(config) {
            // Honor an explicit `root` option from the consumer. Otherwise
            // adopt Vite's resolved project root — `config.root` is the
            // directory containing the consumer's `vite.config.{ts,js}`,
            // not the cwd vite was launched from.
            if (userOptions.root !== undefined) return
            opts.root = config.root
            routesAbs = resolvePath(config.root, opts.routesDir)
            blogAbs = opts.blogDir ? resolvePath(config.root, opts.blogDir) : null
            outputAbs = resolvePath(config.root, opts.output)
            extraPageSources = new Set(
                opts.extraPages.flatMap((page) =>
                    typeof page === 'string' || page.source === undefined
                        ? []
                        : [resolvePath(config.root, page.source)]
                )
            )
        },
        async buildStart() {
            await regenerate()
        },
        configureServer(server: ViteDevServer) {
            // Watch every page file even if no module currently imports
            // it, so a brand-new file's first save fires `change`.
            findPageFiles(routesAbs).then((files) => {
                for (const file of files) server.watcher.add(file)
                server.watcher.add(routesAbs)
            })
            if (blogAbs) {
                server.watcher.add(blogAbs)
            }
            for (const source of extraPageSources) {
                server.watcher.add(source)
            }

            const onEvent = async (file: string) => {
                // `findPageFiles` only finds files that exist, so for
                // additions we need a wider net — match on the path
                // pattern directly via `isWatched`.
                const abs = relative('', file) ? resolvePath(file) : file
                if (!isWatched(abs) && !extraPageSources.has(abs)) return
                const changed = await regenerate()
                if (changed) {
                    // The sitemap-manifest JSON is imported as a regular
                    // JSON module — Vite's HMR will reload any importer
                    // automatically when the file changes on disk. We
                    // also broadcast a soft signal in case a consumer
                    // pinned the manifest to a server-only path.
                    server.ws.send({ type: 'full-reload', path: '*' })
                }
            }
            server.watcher.on('add', onEvent)
            server.watcher.on('change', onEvent)
            server.watcher.on('unlink', onEvent)
        }
    }
}
