import type { ServerLoadEvent } from '@sveltejs/kit'

/**
 * Runtime package stats helper — fetches `{ name, version, tarballBytes,
 * unpackedBytes, updatedAt }` from the npm registry at request time, with
 * an in-memory cache and HTTP `cache-control` headers so Cloudflare's
 * edge holds the response.
 *
 * Why this exists:
 *
 * Every Humanspeak docs site documents a published npm package and wants
 * to surface live size + version stats in its UI. Baking those values in
 * at deploy time means the docs go stale every time the library
 * publishes without a paired docs change. Fetching them at request time
 * with a sensible cache breaks that coupling entirely.
 *
 * Typical consumer wiring:
 *
 * ```ts
 * // docs/src/routes/+page.server.ts
 * import rootPkg from '../../../package.json'
 * import { createPackageStatsLoad } from '@humanspeak/docs-kit/server'
 *
 * export const prerender = false
 * export const load = createPackageStatsLoad({
 *     pkg: rootPkg,
 *     devFallback: { tarballBytes: 81458, unpackedBytes: 324332 }
 * })
 * ```
 *
 * IMPORTANT: do not add `export const prerender = true` to a route that
 * uses this loader — prerendering would freeze the stats at build time
 * and reintroduce the staleness problem this helper exists to solve.
 */

export interface PackageStats {
    name: string
    version: string
    /** Packed tarball size in bytes (gzipped). `null` when registry was unreachable. */
    tarballBytes: number | null
    /** Unpacked install size in bytes. `null` when registry was unreachable. */
    unpackedBytes: number | null
    /** ISO timestamp of the last successful registry fetch. */
    updatedAt: string
}

interface RegistryDist {
    fileCount?: number
    unpackedSize?: number
    tarball?: string
}

interface RegistryVersionRecord {
    name?: string
    version?: string
    dist?: RegistryDist
}

const DEFAULT_TIMEOUT_MS = 4000

const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
        return await fetch(url, { signal: ctrl.signal })
    } finally {
        clearTimeout(t)
    }
}

export interface FetchPackageStatsOptions {
    /** Network timeout in milliseconds. Defaults to 4000ms. */
    timeoutMs?: number
    /** Alternative npm registry base URL (mirrors, private registries). */
    registryBase?: string
}

/**
 * Hits the npm registry for `<name>@<versionOrTag>` and returns the
 * size metadata, or `null` on any error (network failure, 404, timeout,
 * malformed response). Safe to call from a Cloudflare Worker or any
 * other edge runtime that exposes `fetch`.
 *
 * `versionOrTag` accepts either a concrete version (e.g. `'1.5.0'`) or
 * a dist-tag (e.g. `'latest'`, `'next'`). Defaults to `'latest'` so the
 * page reflects what's actually installable from npm right now rather
 * than whatever the consumer's local `package.json` happens to say.
 * The returned `version` field is always the *resolved* version from
 * the registry response, not the input argument.
 */
export const fetchPackageStats = async (
    name: string,
    versionOrTag: string = 'latest',
    opts: FetchPackageStatsOptions = {}
): Promise<PackageStats | null> => {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const registryBase = opts.registryBase ?? 'https://registry.npmjs.org'
    try {
        const url = `${registryBase}/${encodeURIComponent(name)}/${encodeURIComponent(versionOrTag)}`
        const res = await fetchWithTimeout(url, timeoutMs)
        if (!res.ok) return null
        const record = (await res.json()) as RegistryVersionRecord
        const resolvedVersion = record.version ?? versionOrTag
        const dist = record.dist
        let tarballBytes: number | null = null
        if (dist?.tarball) {
            try {
                const head = await fetchWithTimeout(dist.tarball, timeoutMs)
                const len = head.headers.get('content-length')
                if (head.ok && len) tarballBytes = Number(len)
            } catch {
                /* tarball HEAD is optional — fall back to null */
            }
        }
        return {
            name,
            version: resolvedVersion,
            tarballBytes,
            unpackedBytes: dist?.unpackedSize ?? null,
            updatedAt: new Date().toISOString()
        }
    } catch {
        return null
    }
}

export interface PackageStatsLoadOptions {
    /**
     * Workspace `package.json` import (or any `{ name, version }`
     * shape). `name` drives the registry lookup. `version` is used only
     * as an offline fallback when the registry can't be reached — the
     * canonical displayed version is whatever `dist-tags.latest`
     * currently resolves to.
     */
    pkg: { name: string; version: string }
    /**
     * Which dist-tag (or concrete version) to surface. Defaults to
     * `'latest'`, which is almost always what a public docs site
     * wants: the version a user installs *right now*, not whatever
     * the consumer's checkout happens to have in its package.json.
     */
    versionOrTag?: string
    /** Cache TTL in milliseconds. Defaults to 1 hour. */
    ttlMs?: number
    /** Network timeout in milliseconds. Defaults to 4000ms. */
    timeoutMs?: number
    /** Alternative npm registry base URL. */
    registryBase?: string
    /**
     * Values to substitute when the registry can't be reached AND we're
     * running in dev. Lets the design preview properly without a network
     * round-trip. In production, registry failures still surface as
     * `null` so we never display incorrect numbers.
     */
    devFallback?: {
        tarballBytes: number | null
        unpackedBytes: number | null
    }
    /** True when running under `vite dev`. Pass `import { dev } from '$app/environment'`. */
    dev?: boolean
}

interface CacheEntry {
    fetchedAt: number
    data: PackageStats
}

/**
 * Builds a SvelteKit `PageServerLoad` (or `LayoutServerLoad`) that
 * resolves `{ packageStats }` to PageData. Memoised per-worker-instance
 * for `ttlMs`, and sets HTTP cache-control headers matching the same TTL
 * so the edge can share one rendered HTML response across requests.
 */
export const createPackageStatsLoad = (opts: PackageStatsLoadOptions) => {
    const ttlMs = opts.ttlMs ?? 60 * 60 * 1000
    const versionOrTag = opts.versionOrTag ?? 'latest'

    let memo: CacheEntry | null = null

    const fallback = (): PackageStats => ({
        name: opts.pkg.name,
        version: opts.pkg.version,
        tarballBytes: opts.dev ? (opts.devFallback?.tarballBytes ?? null) : null,
        unpackedBytes: opts.dev ? (opts.devFallback?.unpackedBytes ?? null) : null,
        updatedAt: new Date(0).toISOString()
    })

    return async (event: Pick<ServerLoadEvent, 'setHeaders'>) => {
        event.setHeaders({
            'cache-control': `public, max-age=${ttlMs / 1000}, s-maxage=${ttlMs / 1000}`
        })

        if (memo && Date.now() - memo.fetchedAt < ttlMs) {
            return { packageStats: memo.data }
        }

        const fresh = await fetchPackageStats(opts.pkg.name, versionOrTag, {
            timeoutMs: opts.timeoutMs,
            registryBase: opts.registryBase
        })
        const data = fresh ?? fallback()
        memo = { fetchedAt: Date.now(), data }
        return { packageStats: data }
    }
}
