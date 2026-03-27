<!--
  @component
  Generates Article JSON-LD structured data for a blog post.
-->
<script lang="ts">
    import type { DocsKitConfig } from '../config.js'
    import type { BlogPostMeta } from '../types/blog.js'

    const {
        post,
        config,
        basePath = '/blog'
    }: {
        post: BlogPostMeta
        config: DocsKitConfig
        basePath?: string
    } = $props()

    const ogImageUrl = $derived(
        post.ogSlug
            ? `${config.url}/social-cards/og-${post.ogSlug}.png`
            : `${config.url}/og-default.png`
    )

    const jsonLd = $derived(
        `<${'script'} type="application/ld+json">${JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            author: {
                '@type': 'Organization',
                name: 'Humanspeak, Inc.',
                url: 'https://humanspeak.com'
            },
            publisher: {
                '@type': 'Organization',
                name: 'Humanspeak, Inc.',
                url: 'https://humanspeak.com',
                logo: {
                    '@type': 'ImageObject',
                    url: 'https://humanspeak.com/humanspeak.svg'
                }
            },
            mainEntityOfPage: {
                '@type': 'WebPage',
                '@id': `${config.url}${basePath}/${post.slug}`
            },
            image: ogImageUrl,
            keywords: post.tags.join(', ')
        })}</${'script'}>`
    )
</script>

<svelte:head>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- static JSON-LD, no user input -->
    {@html jsonLd}
</svelte:head>
