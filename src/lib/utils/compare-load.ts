import { error } from '@sveltejs/kit'
import type { Competitor } from '../types/compare.js'

/**
 * Per-route data returned by `createCompareSlugLoad`'s `load`. Consumers
 * who need to extend it (e.g. add an `ogImage` URL, override `title`)
 * should intersect on top of this in their `+page.ts`.
 */
export interface CompareSlugLoadData {
    competitor: Competitor
    title: string
    description: string
}

/**
 * Bundle of `+page.ts` exports for the dynamic `/compare/[slug]/` route.
 * `entries` powers SvelteKit's prerender enumeration; `load` resolves the
 * slug to a competitor and 404s for unknown values.
 */
export interface CompareSlugLoad {
    entries: () => { slug: string }[]
    load: (event: { params: { slug: string } }) => CompareSlugLoadData
}

/**
 * Build the `entries` + `load` pair for the brutalist `/compare/[slug]/`
 * dynamic route. Every Humanspeak docs site that ships head-to-heads
 * has the same shape — enumerate slugs for prerender, throw 404 on
 * unknown slugs, return `{ competitor, title, description }` — so it
 * lives here instead of being copy-pasted per consumer.
 *
 * ```ts
 * // docs/src/routes/compare/[slug]/+page.ts
 * import { createCompareSlugLoad } from '@humanspeak/docs-kit'
 * import { competitors } from '$lib/compare-data'
 *
 * export const prerender = true
 * export const { entries, load } = createCompareSlugLoad(competitors)
 * ```
 *
 * `prerender` stays on the consumer because SvelteKit only reads the
 * literal symbol from the page module — re-exporting it from a helper
 * doesn't satisfy the compiler.
 */
export function createCompareSlugLoad(competitors: Competitor[]): CompareSlugLoad {
    return {
        entries: () => competitors.map(({ slug }) => ({ slug })),
        load: ({ params }) => {
            const competitor = competitors.find((c) => c.slug === params.slug)
            if (!competitor) {
                throw error(404, `Unknown comparison: ${params.slug}`)
            }
            return {
                competitor,
                title: `vs ${competitor.name}`,
                description: competitor.description
            }
        }
    }
}
