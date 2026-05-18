<!--
  @component
  Brutalist-mono examples-page shell (v2).

  Thin adapter over `BrutLayoutV2` that supplies an `/examples`-specific
  breadcrumb fallback. Use on `/examples/+layout.svelte` to cover both:
   - `/examples`            → index of interactive demos
   - `/examples/<slug>`     → individual demo page

  Consumers with custom per-slug breadcrumb titles should pass their own
  `breadcrumbResolver`; the default just splits the path.
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
        config: DocsKitConfig
        favicon: string
        version?: string
        nav?: NavLink[]
        breadcrumbResolver?: (pathname: string) => Breadcrumb[]
        children: Snippet
    }

    const { config, favicon, version, nav, breadcrumbResolver, children }: Props = $props()

    const defaultResolver = (pathname: string): Breadcrumb[] => {
        if (pathname === '/examples' || pathname === '/examples/') {
            return [{ title: 'Examples' }]
        }
        const slug = pathname.replace('/examples/', '')
        return [{ title: 'Examples', href: '/examples' }, { title: slug }]
    }

    const resolver = $derived(breadcrumbResolver ?? defaultResolver)
</script>

<BrutLayoutV2 {config} {favicon} {version} {nav} breadcrumbResolver={resolver}>
    {@render children()}
</BrutLayoutV2>
