<script lang="ts">
    import { page } from '$app/stores'
    import type { DocsKitConfig } from '../config.js'
    import type { SeoContext } from '../contexts/seo.js'

    const { seo, config } = $props<{ seo: SeoContext; config: DocsKitConfig }>()

    const canonicalUrl = $derived(`${$page.url.origin}${$page.url.pathname}`)
    const resolvedTitle = $derived(seo.title)
    const resolvedDescription = $derived(seo.description || config.description)
    const ogImageUrl = $derived(
        seo.ogSlug
            ? `${$page.url.origin}/social-cards/og-${seo.ogSlug}.png`
            : `${$page.url.origin}/og-default.png`
    )

    const websiteJsonLd = `<${'script'} type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: config.name,
        alternateName: config.npmPackage,
        url: config.url,
        description: config.description,
        publisher: {
            '@type': 'Organization',
            name: 'Humanspeak',
            url: 'https://humanspeak.com',
            logo: 'https://humanspeak.com/humanspeak.svg'
        },
        sameAs: [
            `https://github.com/${config.repo}`,
            `https://www.npmjs.com/package/${config.npmPackage}`
        ]
    })}</${'script'}>`
</script>

<svelte:head>
    <title>{resolvedTitle}</title>
    <meta name="description" content={resolvedDescription} />
    <link rel="canonical" href={canonicalUrl} />
    <link rel="alternate" type="text/plain" href="/llms.txt" title="LLM-optimized content" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta name="author" content="Humanspeak" />
    <meta name="keywords" content={config.keywords.join(', ')} />
    <meta property="og:title" content={resolvedTitle} />
    <meta property="og:description" content={resolvedDescription} />
    <meta property="og:image" content={ogImageUrl} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />
    <meta
        property="og:image:alt"
        content={seo.ogTitle
            ? `${seo.ogTitle} — ${config.name}`
            : `${config.name} — ${config.description}`}
    />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content={config.name} />
    <meta property="og:url" content={canonicalUrl} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={resolvedTitle} />
    <meta name="twitter:description" content={resolvedDescription} />
    <meta name="twitter:image" content={ogImageUrl} />
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- static JSON-LD, no user input -->
    {@html websiteJsonLd}
</svelte:head>
