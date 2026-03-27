<!--
  @component
  Single-column blog layout: Header + centered prose content + Footer.
  Used as the layout wrapper for /blog routes.
-->
<script lang="ts">
    import type { Snippet } from 'svelte'
    import type { DocsKitConfig } from '../config.js'
    import { enhanceCodeBlocks } from '../actions/enhanceCodeBlocks.js'
    import Footer from './Footer.svelte'
    import Header from './Header.svelte'

    const {
        config,
        favicon = '/logo.svg',
        children,
        head
    }: {
        config: DocsKitConfig
        favicon?: string
        children: Snippet
        head?: Snippet
    } = $props()
</script>

<svelte:head>
    {#if head}
        {@render head()}
    {/if}
    <link rel="alternate" type="application/rss+xml" title="{config.name} Blog" href="/blog/rss.xml" />
</svelte:head>

<div class="flex min-h-screen flex-col justify-between bg-background">
    <Header {config} {favicon} />

    <main class="flex-1">
        <article
            use:enhanceCodeBlocks
            class="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8"
        >
            <div
                class="prose max-w-none text-text-primary prose-slate dark:prose-invert prose-headings:scroll-mt-20"
            >
                {@render children()}
            </div>
        </article>
    </main>

    <Footer />
</div>
