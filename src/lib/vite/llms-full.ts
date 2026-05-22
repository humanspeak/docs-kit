/**
 * Vite plugin: docs-kit `/llms-full.txt` concatenated-dump generator.
 *
 * Emits a single `static/llms-full.txt` that inlines every per-page
 * Markdown mirror in slug order, separated by a thin horizontal rule.
 * Optimised for "paste the whole library into one context window"
 * workflows — the surface agentic LLMs (Claude Code, Cursor) reach for
 * when they need a complete reference instead of a discovery index.
 *
 * Pairs cleanly with a hand-curated `static/llms.txt` (skip the
 * companion `llmsPlugin` when that's the strategy) — the index and the
 * full dump serve different consumers.
 *
 * Inputs:
 *   - `static/docs/<slug>.md`  (from `docMirrorsPlugin`)
 *
 * Output (gitignored — regenerated at `buildStart`):
 *   - `static/llms-full.txt`
 *
 * Wiring (consumer's `vite.config.ts`):
 *
 * ```ts
 * import {
 *     docMirrorsPlugin,
 *     llmsFullPlugin
 * } from '@humanspeak/docs-kit/vite'
 *
 * export default defineConfig({
 *     plugins: [
 *         docMirrorsPlugin({ siteUrl: 'https://example.com' }),
 *         // Register AFTER docMirrorsPlugin so this one's buildStart reads
 *         // freshly-written mirrors.
 *         llmsFullPlugin({
 *             siteUrl: 'https://example.com',
 *             pkgName: '@example/my-library'
 *         })
 *     ]
 * })
 * ```
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve as resolvePath, sep } from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'

export interface LlmsFullOptions {
    /** Canonical site URL used in the header attribution line. Required. */
    siteUrl: string
    /** Package name rendered as the `# heading` of the dump. Required. */
    pkgName: string
    /** Filesystem root for scanning. When omitted, the plugin adopts
     *  Vite's resolved project root via `configResolved`. */
    root?: string
    /** Directory (relative to `root`) holding the per-page mirrors written
     *  by `docMirrorsPlugin`. Default `static/docs`. */
    mirrorsDir?: string
    /** Output file (relative to `root`). Default `static/llms-full.txt`. */
    output?: string
}

interface ResolvedOptions {
    siteUrl: string
    pkgName: string
    root: string
    mirrorsDir: string
    output: string
}

function resolveOptions(opts: LlmsFullOptions): ResolvedOptions {
    if (!opts.siteUrl) throw new Error('[docs-kit:llms-full] `siteUrl` option is required')
    if (!opts.pkgName) throw new Error('[docs-kit:llms-full] `pkgName` option is required')
    return {
        siteUrl: opts.siteUrl.replace(/\/+$/, ''),
        pkgName: opts.pkgName,
        root: opts.root ?? process.cwd(),
        mirrorsDir: opts.mirrorsDir ?? 'static/docs',
        output: opts.output ?? 'static/llms-full.txt'
    }
}

/** Read every `.md` file under `mirrorsAbs` in slug-sorted order. Returns
 *  an empty array (rather than throwing) when the directory doesn't
 *  exist yet — lets the plugin be a safe default in starter templates. */
async function readMirrors(mirrorsAbs: string): Promise<string[]> {
    if (!existsSync(mirrorsAbs)) return []
    const files = await readdir(mirrorsAbs)
    const md = files.filter((f) => f.endsWith('.md')).sort()
    return Promise.all(md.map((f) => readFile(join(mirrorsAbs, f), 'utf8')))
}

async function buildFull(opts: ResolvedOptions): Promise<string> {
    const mirrorsAbs = resolvePath(opts.root, opts.mirrorsDir)
    const bodies = await readMirrors(mirrorsAbs)

    const header = [
        `# ${opts.pkgName} — full reference`,
        '',
        `> Concatenated dump of every doc page under ${opts.siteUrl}/docs.`,
        `> Each section is bounded by an HTML comment with the source URL,`,
        `> so agents can extract individual pages or cite a specific section.`,
        '',
        '---',
        ''
    ].join('\n')

    // Each mirror already starts with its `<!-- Source: ... -->` attribution
    // line — that's enough boundary signal for an LLM to extract sections
    // without us re-emitting separators.
    const body = bodies.map((b) => b.trim()).join('\n\n')

    return header + '\n' + body + '\n'
}

/** Factory for the Vite plugin. */
export function llmsFullPlugin(userOptions: LlmsFullOptions): Plugin {
    const opts = resolveOptions(userOptions)
    let mirrorsAbs = resolvePath(opts.root, opts.mirrorsDir)
    let outputAbs = resolvePath(opts.root, opts.output)

    async function regenerate(): Promise<boolean> {
        const next = await buildFull(opts)
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
        if (!absPath.startsWith(mirrorsAbs + sep)) return false
        return absPath.endsWith('.md')
    }

    return {
        name: 'docs-kit:llms-full',
        configResolved(config) {
            if (userOptions.root !== undefined) return
            opts.root = config.root
            mirrorsAbs = resolvePath(config.root, opts.mirrorsDir)
            outputAbs = resolvePath(config.root, opts.output)
        },
        async buildStart() {
            await regenerate()
        },
        configureServer(server: ViteDevServer) {
            server.watcher.add(mirrorsAbs)

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
