<!--
  @component
  Brutalist-mono page shell (v2).

  HeaderV2 + content + FooterV2 inside a `.brut-wrap`. Manages breadcrumbs
  internally via the optional `breadcrumbResolver` so consumer pages just
  render their content.

  The brutalist surface background (`.brut-wrap { background: var(--brut-bg) }`)
  is supplied by `@humanspeak/docs-kit/styles/brutalist.css` — no consumer
  CSS required.

  Most consumers should reach for the category-specific wrappers — see
  `CompareLayoutV2`, `ExampleLayoutV2`. Use this directly only when a new
  top-level brut surface is being introduced and there's no adapter yet.
-->
<script lang="ts">
    import { afterNavigate } from '$app/navigation'
    import { page } from '$app/state'
    import type { Snippet } from 'svelte'
    import type { DocsKitConfig } from '../config.js'
    import { getBreadcrumbContext, type Breadcrumb } from '../contexts/breadcrumb.js'

    import FooterV2 from './FooterV2.svelte'
    import HeaderV2 from './HeaderV2.svelte'

    interface NavLink {
        label: string
        href: string
        external?: boolean
    }

    interface Props {
        /** Site identity (brand name, social, etc.). Passed straight to `HeaderV2`. */
        config: DocsKitConfig
        /** Brand mark image URL. */
        favicon: string
        /** Package version string rendered as a small pill next to the brand. */
        version?: string
        /** Inline header nav links. */
        nav?: NavLink[]
        /** Pathname → breadcrumbs. If omitted, the breadcrumb context is left untouched. */
        breadcrumbResolver?: (pathname: string) => Breadcrumb[]
        /** Page content. Rendered between `HeaderV2` and `FooterV2`. */
        children: Snippet
    }

    const { config, favicon, version, nav, breadcrumbResolver, children }: Props = $props()

    const breadcrumbContext = getBreadcrumbContext()

    // Push the resolved breadcrumbs into the shared context on initial mount
    // and on every subsequent client-side navigation. No-op if either the
    // resolver or the context isn't available.
    const applyBreadcrumbs = (pathname: string) => {
        if (!breadcrumbContext || !breadcrumbResolver) return
        breadcrumbContext.breadcrumbs = breadcrumbResolver(pathname)
    }

    applyBreadcrumbs(page.url.pathname)
    afterNavigate(() => applyBreadcrumbs(page.url.pathname))
</script>

<div class="brut-wrap flex min-h-svh flex-col">
    <HeaderV2 {config} {favicon} {version} {nav} />
    {@render children()}
    <FooterV2 {version} />
</div>
