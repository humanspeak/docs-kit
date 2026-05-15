<!--
  @component
  Brutalist-mono compare-page shell (v2).

  Wraps the HeaderV2 + content slot + FooterV2 layout that every consumer reaches for on
  `/compare` index + slug pages. Manages breadcrumbs internally via the optional
  `breadcrumbResolver` so the surrounding page just renders its content.

  Two surfaces this covers:
   - `/compare`           → index list of comparisons
   - `/compare/<slug>`    → individual head-to-head page

  Both want the same chrome + the same brut-themed page background (lighter sheet tone
  in light mode, deep ink in dark). The component sets the wrapper background via
  CSS variables so consumers don't have to re-implement that bit.
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

    const {
        config,
        favicon,
        version,
        nav,
        breadcrumbResolver,
        children
    }: Props = $props()

    const breadcrumbContext = getBreadcrumbContext()

    const buildCrumbs = (pathname: string): Breadcrumb[] => {
        if (breadcrumbResolver) return breadcrumbResolver(pathname)
        if (pathname === '/compare' || pathname === '/compare/') {
            return [{ title: 'Compare' }]
        }
        const slug = pathname.replace('/compare/', '')
        return [{ title: 'Compare', href: '/compare' }, { title: slug }]
    }

    if (breadcrumbContext) {
        breadcrumbContext.breadcrumbs = buildCrumbs(page.url.pathname)
    }
    afterNavigate(() => {
        if (breadcrumbContext) {
            breadcrumbContext.breadcrumbs = buildCrumbs(page.url.pathname)
        }
    })
</script>

<div class="dk-compare-wrap flex min-h-svh flex-col">
    <HeaderV2 {config} {favicon} {version} {nav} />
    {@render children()}
    <FooterV2 {version} />
</div>

<style>
    .dk-compare-wrap {
        background: #f8fcfb;
    }
    :global(html.dark) .dk-compare-wrap {
        background: #06090a;
    }
</style>
