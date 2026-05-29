/**
 * Server-only utilities for SvelteKit `+page.server.ts` / `+layout.server.ts`
 * files. Importing from this subpath signals to Vite that the module
 * must not be bundled into client code.
 */

export {
    createPackageStatsLoad,
    fetchPackageStats,
    type FetchPackageStatsOptions,
    type PackageStats,
    type PackageStatsLoadOptions
} from './package-stats.js'
export { createSitemapResponse, type CreateSitemapResponseOptions } from './sitemap.js'
