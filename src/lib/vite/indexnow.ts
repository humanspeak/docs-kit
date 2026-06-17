/**
 * Vite plugin: docs-kit IndexNow submitter.
 *
 * Reads the sitemap manifest emitted by `sitemapManifestPlugin()` and submits
 * the public URLs to IndexNow after a production build. This replaces per-repo
 * `deploy:indexnow` scripts while keeping the ping coupled to real production
 * builds only; `pnpm dev` and non-production build modes do not call IndexNow.
 *
 * Wiring (consumer's `vite.config.ts`):
 *
 * ```ts
 * import { indexNowPlugin, sitemapManifestPlugin } from '@humanspeak/docs-kit/vite'
 *
 * export default defineConfig({
 *     plugins: [
 *         sitemapManifestPlugin(),
 *         indexNowPlugin({
 *             siteUrl: 'https://example.com',
 *             key: '00000000-0000-0000-0000-000000000000'
 *         })
 *     ]
 * })
 * ```
 */
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve as resolvePath } from 'node:path'
import type { Plugin } from 'vite'

type SitemapManifest = Record<string, string>

const submissionPromisesKey = Symbol.for('docs-kit:indexnow:submission-promises')

interface IndexNowGlobal {
    [submissionPromisesKey]?: Map<string, Promise<void>>
}

export interface IndexNowOptions {
    /** Public site origin, e.g. `https://virtualchat.svelte.page`. Required. */
    siteUrl: string
    /** IndexNow key. Required. The matching `<key>.txt` file must be publicly reachable. */
    key: string
    /** Host sent to IndexNow. Defaults to the hostname parsed from `siteUrl`. */
    host?: string
    /** Public key file URL. Defaults to `${siteUrl}/${key}.txt`. */
    keyLocation?: string
    /**
     * Local verification file path, relative to the Vite root.
     * Default `static/<key>.txt`. Pass `false` to disable the local existence check.
     */
    keyFilePath?: string | false
    /** Manifest path relative to the Vite root. Default `src/lib/sitemap-manifest.json`. */
    manifestPath?: string
    /** Route prefixes to exclude from submission. Default `['/social-cards']`. */
    excludePrefixes?: string[]
    /** Extra route paths or absolute URLs to submit in addition to the manifest. */
    extraUrls?: string[]
    /** IndexNow endpoint. Default `https://api.indexnow.org/indexnow`. */
    endpoint?: string
    /** Set false to log IndexNow failures without failing the build. Default true. */
    failOnError?: boolean
    /**
     * Build mode that is allowed to submit. Default `production`.
     * Pass `false` to allow any `vite build` mode.
     */
    productionMode?: string | false
    /** Filesystem root. When omitted, the plugin adopts Vite's resolved root. */
    root?: string
}

function assertOptions(options: IndexNowOptions) {
    if (!options.siteUrl) throw new Error('[docs-kit:indexnow] `siteUrl` option is required')
    if (!options.key) throw new Error('[docs-kit:indexnow] `key` option is required')
}

function normalizeSiteUrl(siteUrl: string): URL {
    const url = new URL(siteUrl)
    url.pathname = url.pathname.replace(/\/+$/, '')
    url.search = ''
    url.hash = ''
    return url
}

function normalizeRoute(routeOrUrl: string, siteUrl: URL): string {
    if (/^https?:\/\//i.test(routeOrUrl)) return routeOrUrl

    const route = routeOrUrl.startsWith('/') ? routeOrUrl : `/${routeOrUrl}`
    return new URL(route, siteUrl).toString()
}

function uniqueSorted(values: string[]): string[] {
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))
}

function resolveKeyFilePath(root: string, options: IndexNowOptions): string | false {
    const keyFilePath = options.keyFilePath
    if (keyFilePath === false) return false
    return resolvePath(root, keyFilePath ?? `static/${options.key}.txt`)
}

async function readManifest(path: string): Promise<SitemapManifest> {
    const raw = await readFile(path, 'utf8')
    const parsed = JSON.parse(raw) as unknown

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`[docs-kit:indexnow] Expected sitemap manifest at ${path} to be an object`)
    }

    return parsed as SitemapManifest
}

/** Factory for the Vite plugin. */
export function indexNowPlugin(userOptions: IndexNowOptions): Plugin {
    assertOptions(userOptions)

    const siteUrl = normalizeSiteUrl(userOptions.siteUrl)
    const host = userOptions.host ?? siteUrl.hostname
    const endpoint = userOptions.endpoint ?? 'https://api.indexnow.org/indexnow'
    const excludePrefixes = userOptions.excludePrefixes ?? ['/social-cards']
    const failOnError = userOptions.failOnError ?? true
    const productionMode = userOptions.productionMode ?? 'production'
    let root = userOptions.root ?? process.cwd()
    let manifestPath = resolvePath(
        root,
        userOptions.manifestPath ?? 'src/lib/sitemap-manifest.json'
    )
    let keyFilePath = resolveKeyFilePath(root, userOptions)
    let shouldSubmit = false

    async function submitOnce() {
        const globalState = globalThis as typeof globalThis & IndexNowGlobal
        const submissionPromises =
            globalState[submissionPromisesKey] ?? new Map<string, Promise<void>>()
        globalState[submissionPromisesKey] = submissionPromises

        const submissionKey = JSON.stringify({
            root,
            siteUrl: siteUrl.toString(),
            host,
            key: userOptions.key,
            keyLocation: userOptions.keyLocation,
            keyFilePath,
            manifestPath,
            excludePrefixes,
            extraUrls: userOptions.extraUrls,
            endpoint
        })

        let submissionPromise = submissionPromises.get(submissionKey)
        if (!submissionPromise) {
            submissionPromise = submitIndexNow()
            submissionPromises.set(submissionKey, submissionPromise)
        }

        await submissionPromise
    }

    async function submitIndexNow() {
        if (keyFilePath !== false && !existsSync(keyFilePath)) {
            console.log(
                `[docs-kit:indexnow] Skipping submission because key file is missing: ${keyFilePath}`
            )
            return
        }

        const manifest = await readManifest(manifestPath)
        const manifestUrls = Object.keys(manifest)
            .filter((route) => !excludePrefixes.some((prefix) => route.startsWith(prefix)))
            .map((route) => normalizeRoute(route, siteUrl))
        const extraUrls = (userOptions.extraUrls ?? []).map((url) => normalizeRoute(url, siteUrl))
        const urlList = uniqueSorted([...manifestUrls, ...extraUrls])

        if (urlList.length === 0) {
            console.log('[docs-kit:indexnow] No URLs to submit')
            return
        }

        console.log(`[docs-kit:indexnow] Submitting ${urlList.length} URLs to IndexNow`)

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
                host,
                key: userOptions.key,
                keyLocation:
                    userOptions.keyLocation ??
                    new URL(`/${userOptions.key}.txt`, siteUrl).toString(),
                urlList
            })
        })

        if (response.ok || response.status === 202) {
            console.log(
                `[docs-kit:indexnow] Accepted (${response.status}): ${urlList.length} URLs submitted`
            )
            return
        }

        const message = `[docs-kit:indexnow] Rejected (${response.status}): ${await response.text()}`
        if (failOnError) throw new Error(message)
        console.warn(message)
    }

    return {
        name: 'docs-kit:indexnow',
        apply: 'build',
        configResolved(config) {
            if (userOptions.root === undefined) root = config.root
            manifestPath = resolvePath(
                root,
                userOptions.manifestPath ?? 'src/lib/sitemap-manifest.json'
            )
            keyFilePath = resolveKeyFilePath(root, userOptions)
            shouldSubmit = productionMode === false || config.mode === productionMode
        },
        async closeBundle() {
            if (!shouldSubmit) return
            await submitOnce()
        }
    }
}
