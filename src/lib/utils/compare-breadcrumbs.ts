import type { Breadcrumb } from '../contexts/breadcrumb.js'

/**
 * Look up a competitor's display name by slug. The full `Competitor`
 * shape lives in `types/compare.ts`, but the breadcrumb resolver only
 * cares about the name — narrowing the surface keeps consumers free to
 * pass in any lookup that returns a name (full record, lazy index,
 * pre-stringified map, etc).
 */
export type CompareSlugLookup = (slug: string) => { name?: string } | undefined

export interface BuildCompareBreadcrumbsOptions {
    /** Lookup that turns a slug into a competitor record. */
    getCompetitor?: CompareSlugLookup
    /** Label for the index crumb. Defaults to `Compare`. */
    indexLabel?: string
    /** Path of the compare index. Defaults to `/compare`. */
    indexHref?: string
    /**
     * Fallback that runs when `getCompetitor` returns undefined for the
     * slug. Defaults to a heuristic: strip a leading `vs-`, replace
     * `-` with spaces, Title Case. Returning `null`/`undefined` makes
     * the resolver fall back to the raw slug.
     */
    fallbackName?: (slug: string) => string | null | undefined
}

const defaultFallback = (slug: string): string =>
    slug
        .replace(/^vs-/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (ch) => ch.toUpperCase())

/**
 * Resolve `/compare` and `/compare/<slug>` URLs to a breadcrumb chain.
 *
 * Splits + filters path segments so both `/compare` and `/compare/`
 * collapse to the index, and `/compare/<slug>` / `/compare/<slug>/`
 * both yield the same slug. Use this from your `/compare/+layout.svelte`
 * via the `breadcrumbResolver` prop on `CompareLayoutV2`.
 *
 * ```ts
 * import { buildCompareBreadcrumbs } from '@humanspeak/docs-kit'
 * import { getCompetitor } from '$lib/compare-data'
 *
 * const breadcrumbResolver = (pathname: string) =>
 *     buildCompareBreadcrumbs(pathname, { getCompetitor })
 * ```
 */
export function buildCompareBreadcrumbs(
    pathname: string,
    options: BuildCompareBreadcrumbsOptions = {}
): Breadcrumb[] {
    const {
        getCompetitor,
        indexLabel = 'Compare',
        indexHref = '/compare',
        fallbackName = defaultFallback
    } = options

    const segments = pathname.split('/').filter(Boolean)
    if (segments.length <= 1 || segments[0] !== indexHref.replace(/^\//, '')) {
        return [{ title: indexLabel }]
    }

    const slug = segments[1]
    const name = getCompetitor?.(slug)?.name ?? fallbackName(slug) ?? slug
    return [{ title: indexLabel, href: indexHref }, { title: `vs ${name}` }]
}
