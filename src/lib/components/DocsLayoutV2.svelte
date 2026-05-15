<!--
  @component
  Brutalist-mono docs shell (v2).

  Wraps the full HeaderV2 + DocSlugStrip + SidebarV2 + article + TableOfContentsV2 + FooterV2
  layout that every Humanspeak docs site re-implements by hand. The boilerplate that previously
  lived in each consumer's `/docs/+layout.svelte` — breadcrumbs setup, TechArticle JSON-LD per
  page, optional FAQPage JSON-LD on the root, headings extraction with `afterNavigate` refresh
  — is internalised so consumer layouts shrink to ~15 lines of configuration.

  Per-consumer customisation flows through props:
   - `config` / `favicon` / `version` / `nav`     — passed straight to HeaderV2
   - `sections` / `otherProjects` / `loveAndRespect` — sidebar nav
   - `siteUrl` (e.g. "https://markdown.svelte.page") — canonical base used in TechArticle JSON-LD
   - `breadcrumbResolver`                            — same shape as DocsLayout v1
   - `defaultBreadcrumbTitle`                        — fallback when page.data.title is missing
                                                        (used in both SSR and client paths)
   - `faqs`                                          — { q, a } pairs for FAQPage JSON-LD
   - `faqRoute`                                      — pathname to emit FAQPage on (default '/docs')
   - `sitemapManifest`                               — `{ [pathname]: ISODate }`. When provided,
                                                        the per-page TechArticle JSON-LD picks
                                                        `dateModified` from it; otherwise the current
                                                        date is used.

  Note: this component renders a full page shell (header, sidebars, footer). Mount it from
  `/docs/+layout.svelte` and pass the page content as `children`. Do NOT also include a
  RootLayout wrapper — DocsLayoutV2 is the outer shell.
-->
<script lang="ts">
    import { afterNavigate } from '$app/navigation'
    import { page } from '$app/state'
    import { untrack, type Snippet } from 'svelte'
    import { enhanceCodeBlocks } from '../actions/enhanceCodeBlocks.js'
    import type { DocsKitConfig } from '../config.js'
    import { getBreadcrumbContext, type Breadcrumb } from '../contexts/breadcrumb.js'
    import type { NavItem, NavSection } from '../types/nav.js'
    import { extractHeadings, type TocHeading } from '../utils/headings.js'
    import DocSlugStrip from './DocSlugStrip.svelte'
    import FooterV2 from './FooterV2.svelte'
    import HeaderV2 from './HeaderV2.svelte'
    import SidebarV2 from './SidebarV2.svelte'
    import TableOfContentsV2 from './TableOfContentsV2.svelte'

    interface NavLink {
        label: string
        href: string
        external?: boolean
    }

    interface Faq {
        q: string
        a: string
    }

    interface Props {
        config: DocsKitConfig
        favicon: string
        sections: NavSection[]
        otherProjects?: NavItem[]
        loveAndRespect?: NavItem[]
        version?: string
        nav?: NavLink[]
        siteUrl?: string
        breadcrumbResolver?: (pathname: string) => Breadcrumb[]
        defaultBreadcrumbTitle?: string
        faqs?: Faq[]
        faqRoute?: string
        sitemapManifest?: Record<string, string>
        children: Snippet
    }

    const {
        config,
        favicon,
        sections,
        otherProjects = [],
        loveAndRespect,
        version,
        nav,
        siteUrl,
        breadcrumbResolver,
        defaultBreadcrumbTitle = 'Get Started',
        faqs,
        faqRoute = '/docs',
        sitemapManifest,
        children
    }: Props = $props()

    const breadcrumbContext = getBreadcrumbContext()

    /** Build breadcrumbs for a pathname. Uses the resolver if provided, otherwise the
     *  page title (or default) under a "Docs" root. The "Docs" root is suppressed on
     *  the doc index so a visitor never sees "Docs > Docs". */
    const buildCrumbs = (pathname: string): Breadcrumb[] => {
        if (breadcrumbResolver) return breadcrumbResolver(pathname)
        const title = (page.data?.title as string | undefined) || defaultBreadcrumbTitle
        if (pathname === '/docs' || pathname === '/docs/') {
            return [{ title }]
        }
        return [{ title: 'Docs', href: '/docs' }, { title }]
    }

    // Top-level assignment populates the context during SSR so HeaderV2 and any
    // BreadcrumbJsonLd consumer see crumbs in the server HTML; the $effect catches
    // client-side navigation between sibling doc pages where the layout doesn't remount.
    //
    // The write inside the $effect is wrapped in `untrack` because Svelte 5's `$state`
    // proxy reads the existing value during a `set` to dedupe equal writes, and that
    // read would otherwise subscribe this effect to `.breadcrumbs` — i.e. the effect
    // would observe its own writes and re-fire, blowing up as
    // `effect_update_depth_exceeded`. We still need the dependency on
    // `page.url.pathname`, so that read stays outside `untrack`.
    if (breadcrumbContext) {
        breadcrumbContext.breadcrumbs = buildCrumbs(page.url.pathname)
    }
    $effect(() => {
        if (!breadcrumbContext) return
        const next = buildCrumbs(page.url.pathname)
        untrack(() => {
            breadcrumbContext.breadcrumbs = next
        })
    })

    /** Pretty slug for the brut strip: "/docs" → "index", "/docs/use-spring" → "use-spring".
     *  Consumer can override the visual via the slug strip directly if a different mapping
     *  is desired — but for the standard case this is what every consumer wants. */
    const docSlug = $derived.by(() => {
        const path = page.url.pathname.replace(/\/+$/, '')
        if (path === '/docs' || path === '') return 'index'
        return path.replace('/docs/', '')
    })

    const techArticleJsonLd = $derived.by(() => {
        const title = page.data?.title as string | undefined
        const description = page.data?.description as string | undefined
        if (!title) return ''
        const pathname = page.url.pathname
        const lastmod = sitemapManifest?.[pathname] ?? new Date().toISOString().split('T')[0]
        const url = siteUrl ? `${siteUrl}${pathname}` : pathname
        return `<${'script'} type="application/ld+json">${JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'TechArticle',
            headline: title,
            description: description || title,
            url,
            dateModified: lastmod,
            author: {
                '@type': 'Organization',
                name: 'Humanspeak',
                url: 'https://humanspeak.com'
            },
            publisher: {
                '@type': 'Organization',
                name: 'Humanspeak',
                url: 'https://humanspeak.com'
            },
            proficiencyLevel: 'Beginner'
        })}</${'script'}>`
    })

    // FAQPage JSON-LD rides the configured route so the consumer can pin the FAQs to
    // their highest-authority doc URL. FAQ rich results lift CTR at typical SERP
    // positions and LLMs preferentially cite Q&A-structured content.
    const faqJsonLd = $derived.by(() => {
        if (!faqs || faqs.length === 0) return ''
        if (page.url.pathname !== faqRoute) return ''
        return `<${'script'} type="application/ld+json">${JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map(({ q, a }) => ({
                '@type': 'Question',
                name: q,
                acceptedAnswer: { '@type': 'Answer', text: a }
            }))
        })}</${'script'}>`
    })

    // Headings extraction. Refreshed by afterNavigate (route change swaps the whole
    // content tree) and by the initial $effect once contentElement binds. Cheap and
    // doesn't fight with motion animations the way a MutationObserver-based approach
    // would in svelte-motion's prose subtree.
    let contentElement: HTMLElement | undefined = $state(undefined)
    let headings: TocHeading[] = $state([])

    const refreshHeadings = () => {
        if (contentElement) headings = extractHeadings(contentElement)
    }

    $effect(() => {
        if (contentElement) refreshHeadings()
    })

    afterNavigate(() => {
        requestAnimationFrame(refreshHeadings)
    })
</script>

<svelte:head>
    {#if techArticleJsonLd}
        <!-- eslint-disable-next-line svelte/no-at-html-tags -- static JSON-LD, no user input -->
        {@html techArticleJsonLd}
    {/if}
    {#if faqJsonLd}
        <!-- eslint-disable-next-line svelte/no-at-html-tags -- static JSON-LD, no user input -->
        {@html faqJsonLd}
    {/if}
</svelte:head>

<div class="flex min-h-screen flex-col justify-between bg-background">
    <HeaderV2 {config} {favicon} {version} {nav} />

    <DocSlugStrip slug={docSlug} />

    <div class="flex flex-1">
        <!-- Left sidebar -->
        <aside
            class="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar-background/95 shadow-sm lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto"
        >
            <SidebarV2
                {config}
                {sections}
                currentPath={page.url.pathname}
                {otherProjects}
                {loveAndRespect}
            />
        </aside>

        <!-- Main content area -->
        <main class="min-w-0 flex-1">
            <div class="flex min-w-0">
                <!-- Content -->
                <article
                    bind:this={contentElement}
                    use:enhanceCodeBlocks
                    class="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8"
                >
                    <div
                        class="prose-v2 prose max-w-none text-text-primary prose-slate dark:prose-invert prose-headings:scroll-mt-20"
                    >
                        {@render children()}
                    </div>
                </article>

                <!-- Right sidebar - Table of Contents -->
                <aside
                    class="hidden w-56 shrink-0 border-l border-sidebar-border bg-sidebar-background/95 shadow-sm xl:sticky xl:top-0 xl:block xl:h-screen xl:overflow-y-auto"
                >
                    <TableOfContentsV2 {headings} />
                </aside>
            </div>
        </main>
    </div>
    <FooterV2 {version} />
</div>
