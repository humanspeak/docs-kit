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
        config: DocsKitConfig
        favicon: string
        version?: string
        nav?: NavLink[]
        breadcrumbResolver?: (pathname: string) => Breadcrumb[]
        children: Snippet
    }

    const { config, favicon, version, nav, breadcrumbResolver, children }: Props = $props()

    const breadcrumbContext = getBreadcrumbContext()

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
