<!--
  @component
  Three-column docs layout: left sidebar, content with prose, right ToC.
  Handles heading extraction, MutationObserver, breadcrumbs, and code block enhancement.
-->
<script lang="ts">
    import { page } from '$app/state'
    import type { Snippet } from 'svelte'
    import type { DocsKitConfig } from '../config.js'
    import { getBreadcrumbContext, type Breadcrumb } from '../contexts/breadcrumb.js'
    import type { NavItem, NavSection } from '../types/nav.js'
    import { getDocsTitleByPath } from '../utils/nav.js'
    import { extractHeadings, type TocHeading } from '../utils/headings.js'
    import { enhanceCodeBlocks } from '../actions/enhanceCodeBlocks.js'
    import Footer from './Footer.svelte'
    import Header from './Header.svelte'
    import Sidebar from './Sidebar.svelte'
    import TableOfContents from './TableOfContents.svelte'

    const {
        config,
        sections,
        otherProjects = [],
        loveAndRespect,
        favicon = '/logo.svg',
        breadcrumbResolver,
        children,
        head
    }: {
        config: DocsKitConfig
        sections: NavSection[]
        otherProjects?: NavItem[]
        loveAndRespect?: NavItem[]
        favicon?: string
        breadcrumbResolver?: (pathname: string) => Breadcrumb[]
        children: Snippet
        head?: Snippet
    } = $props()

    const breadcrumbContext = getBreadcrumbContext()
    $effect(() => {
        if (breadcrumbContext) {
            const pathname = page.url.pathname as string
            if (breadcrumbResolver) {
                breadcrumbContext.breadcrumbs = breadcrumbResolver(pathname)
            } else {
                const title = getDocsTitleByPath(sections, pathname)
                breadcrumbContext.breadcrumbs =
                    title && pathname !== '/docs'
                        ? [{ title: 'Docs', href: '/docs' }, { title }]
                        : [{ title: 'Docs' }]
            }
        }
    })

    let contentElement: HTMLElement | undefined = $state(undefined)
    let headings: TocHeading[] = $state([])

    function refreshHeadings() {
        if (!contentElement) return
        headings = extractHeadings(contentElement)
    }

    // Setup MutationObserver to watch for DOM changes and initial extraction
    $effect(() => {
        if (!contentElement) return

        // Initial extraction
        refreshHeadings()

        // Watch for DOM mutations (new content loaded via navigation)
        let rafId: number | null = null
        const observer = new MutationObserver(() => {
            if (rafId) cancelAnimationFrame(rafId)
            rafId = requestAnimationFrame(() => {
                rafId = null
                refreshHeadings()
            })
        })

        observer.observe(contentElement, {
            childList: true,
            subtree: true
        })

        return () => {
            if (rafId) cancelAnimationFrame(rafId)
            observer.disconnect()
        }
    })
</script>

<svelte:head>
    {#if head}
        {@render head()}
    {/if}
</svelte:head>

<div class="flex min-h-screen flex-col justify-between bg-background">
    <Header {config} {favicon} />

    <div class="flex flex-1">
        <!-- Left sidebar - Navigation -->
        <aside
            class="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar-background/95 shadow-sm lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto"
        >
            <Sidebar
                {config}
                {sections}
                currentPath={page.url.pathname}
                {otherProjects}
                {loveAndRespect}
            />
        </aside>

        <!-- Main content area -->
        <main class="flex-1">
            <div class="flex">
                <!-- Content -->
                <article
                    bind:this={contentElement}
                    use:enhanceCodeBlocks
                    class="flex-1 px-4 py-8 sm:px-6 lg:px-8"
                >
                    <div
                        class="prose max-w-none text-text-primary prose-slate dark:prose-invert prose-headings:scroll-mt-20"
                    >
                        {@render children()}
                    </div>
                </article>

                <!-- Right sidebar - Table of Contents -->
                <aside
                    class="hidden w-56 shrink-0 border-l border-sidebar-border bg-sidebar-background/95 shadow-sm xl:sticky xl:top-0 xl:block xl:h-screen xl:overflow-y-auto"
                >
                    <TableOfContents {headings} />
                </aside>
            </div>
        </main>
    </div>
    <Footer />
</div>
