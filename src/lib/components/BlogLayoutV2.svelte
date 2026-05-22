<!--
  @component
  Brutalist-mono blog layout shell (v2).

  Thin adapter over `BrutLayoutV2` that supplies a `/blog`-specific
  breadcrumb fallback and the standard `<link rel="alternate">` RSS
  hint. Drop-in shape-compatible with the v1 `BlogLayout` (`config` +
  `favicon` + optional `head` snippet) but adds the brutalist chrome:
  `HeaderV2` (with version pill, nav, breadcrumbs) + `FooterV2` (with
  back-to-top), and the shared `.brut-wrap` background.

  Wire on `/blog/+layout.svelte`:

  ```svelte
  <script lang="ts">
    import { BlogLayoutV2 } from '@humanspeak/docs-kit/blog'
    import { docsConfig } from '$lib/docs-config'
    import { headerNav } from '$lib/docsNav'
    import favicon from '$lib/assets/logo.svg'
    import { version } from '../../../package.json'
    const { children } = $props()
  </script>

  <BlogLayoutV2 config={docsConfig} {favicon} {version} nav={headerNav}>
    {@render children?.()}
  </BlogLayoutV2>
  ```
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
        /** Override the default `/blog` breadcrumb resolver. Pass this when
         *  post slugs need pretty titles (e.g. "Rendering Agent HTML Safely"
         *  instead of "rendering-agent-html-safely"). */
        breadcrumbResolver?: (pathname: string) => Breadcrumb[]
        /** Optional content for `<svelte:head>` (e.g. extra meta). The RSS
         *  alternate link is always emitted. */
        head?: Snippet
        /** Page content. */
        children: Snippet
    }

    const { config, favicon, version, nav, breadcrumbResolver, head, children }: Props = $props()

    // Default mapping: `/blog` → ["Blog"], `/blog/<slug>` →
    // ["Blog", "<slug>"]. Consumers with prettier titles should pass
    // their own resolver via the prop.
    const defaultResolver = (pathname: string): Breadcrumb[] => {
        if (pathname === '/blog' || pathname === '/blog/') {
            return [{ title: 'Blog' }]
        }
        const slug = pathname.replace('/blog/', '')
        return [{ title: 'Blog', href: '/blog' }, { title: slug }]
    }

    const resolver = $derived(breadcrumbResolver ?? defaultResolver)
</script>

<svelte:head>
    {#if head}
        {@render head()}
    {/if}
    <link rel="alternate" type="application/rss+xml" title="{config.name} Blog" href="/blog/rss.xml" />
</svelte:head>

<BrutLayoutV2 {config} {favicon} {version} {nav} breadcrumbResolver={resolver}>
    {@render children()}
</BrutLayoutV2>
