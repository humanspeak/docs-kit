<!--
  @component
  Renders a single blog post with metadata header, markdown content via SvelteMarkdown,
  and Article JSON-LD structured data.
-->
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { DocsKitConfig } from '../config.js'
    import { getSeoContext } from '../contexts/seo.js'
    import type { BlogPostData } from '../types/blog.js'
    import BlogArticleJsonLd from './BlogArticleJsonLd.svelte'

    const {
        post,
        config,
        basePath = '/blog'
    }: {
        post: BlogPostData
        config: DocsKitConfig
        basePath?: string
    } = $props()

    const seo = getSeoContext()

    $effect(() => {
        if (seo) {
            seo.title = `${post.title} | ${config.name}`
            seo.description = post.description
            seo.ogSlug = post.ogSlug ?? `blog-${post.slug}`
            seo.ogTitle = post.title
        }
    })

    const formattedDate = $derived(
        new Date(post.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    )
</script>

<BlogArticleJsonLd {post} {config} {basePath} />

<header class="mb-8 border-b border-border pb-8">
    <div class="flex flex-wrap items-center gap-2 text-sm text-text-muted">
        <time datetime={post.date}>{formattedDate}</time>
        <span aria-hidden="true">&middot;</span>
        <span>{post.readingTime} min read</span>
        <span aria-hidden="true">&middot;</span>
        <span>By {post.author}</span>
    </div>

    <h1 class="mt-3 text-4xl font-bold text-text-primary">
        {post.title}
    </h1>

    <p class="mt-3 text-lg text-text-secondary">
        {post.description}
    </p>

    {#if post.tags.length > 0}
        <div class="mt-4 flex flex-wrap gap-1.5">
            {#each post.tags as tag}
                <span
                    class="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-text-secondary"
                >
                    {tag}
                </span>
            {/each}
        </div>
    {/if}
</header>

<SvelteMarkdown source={post.content} />
