<!--
  @component
  Brutalist-mono compare-page shell (v2).

  Thin adapter over `BrutLayoutV2` that supplies a `/compare`-specific
  breadcrumb fallback. Use on `/compare/+layout.svelte` to cover both:
   - `/compare`           → index list of comparisons
   - `/compare/<slug>`    → individual head-to-head page

  Both surfaces share the same chrome and brut-themed background; that
  shared shell lives in `BrutLayoutV2`. This component only adds the
  breadcrumb default if the consumer doesn't pass one.
-->
<script lang="ts">
    import type { Snippet } from 'svelte'
    import type { DocsKitConfig } from '../config.js'
    import type { Breadcrumb } from '../contexts/breadcrumb.js'
    import BrutLayoutV2 from './BrutLayoutV2.svelte'

    interface NavLink {
        label: string
        href: string
        external?: boolean
    }

    interface Props {
        /** Site identity. Passed straight through to the underlying `BrutLayoutV2`. */
        config: DocsKitConfig
        /** Brand mark image URL. */
        favicon: string
        /** Package version string for the brand pill. */
        version?: string
        /** Inline header nav links. */
        nav?: NavLink[]
        /** Override the default `/compare` breadcrumb resolver. Pass this when
         *  your `/compare/<slug>` pages need custom titles (e.g. competitor
         *  display names rather than raw slugs). */
        breadcrumbResolver?: (pathname: string) => Breadcrumb[]
        /** Page content. */
        children: Snippet
    }

    const { config, favicon, version, nav, breadcrumbResolver, children }: Props = $props()

    // Default mapping: `/compare` → ["Compare"], `/compare/<slug>` →
    // ["Compare", "<slug>"]. Consumers with prettier titles for individual
    // comparisons should pass their own resolver via the prop.
    const defaultResolver = (pathname: string): Breadcrumb[] => {
        if (pathname === '/compare' || pathname === '/compare/') {
            return [{ title: 'Compare' }]
        }
        const slug = pathname.replace('/compare/', '')
        return [{ title: 'Compare', href: '/compare' }, { title: slug }]
    }

    const resolver = $derived(breadcrumbResolver ?? defaultResolver)
</script>

<BrutLayoutV2 {config} {favicon} {version} {nav} breadcrumbResolver={resolver}>
    {@render children()}
</BrutLayoutV2>
