<!--
  @component
  Root layout wrapper: ModeWatcher, SEO context, breadcrumbs, MotionConfig, and optional JSON-LD.
-->
<script lang="ts">
    import { ModeWatcher } from 'mode-watcher'
    import { MotionConfig } from '@humanspeak/svelte-motion'
    import type { Snippet } from 'svelte'
    import type { DocsKitConfig } from '../config.js'
    import type { SeoContext } from '../contexts/seo.js'
    import BreadcrumbContextProvider from './BreadcrumbContextProvider.svelte'
    import BreadcrumbJsonLd from './BreadcrumbJsonLd.svelte'
    import SeoContextProvider from './SeoContextProvider.svelte'
    import SeoHead from './SeoHead.svelte'

    const {
        config,
        favicon = '/logo.svg',
        stars,
        children
    }: {
        config: DocsKitConfig
        favicon?: string
        stars?: number
        children: Snippet
    } = $props()

    // SEO state — owned here, passed to SeoContextProvider for child access
    const seo = $state<SeoContext>({})

    const npmUrl = `https://www.npmjs.com/package/${config.npmPackage}`
    const repoUrl = `https://github.com/${config.repo}`

    const softwareAppJsonLd = $derived(
        stars != null
            ? '<script type="application/ld+json">' +
              JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'SoftwareApplication',
                  name: config.name,
                  description: config.description,
                  url: config.url,
                  downloadUrl: npmUrl,
                  applicationCategory: 'DeveloperApplication',
                  operatingSystem: 'Any',
                  softwareRequirements: config.softwareRequirements ?? 'Svelte 5',
                  license: 'https://opensource.org/licenses/MIT',
                  keywords: config.keywords,
                  releaseNotes: `${repoUrl}/releases`,
                  ...(config.programmingLanguages
                      ? { programmingLanguage: config.programmingLanguages }
                      : {}),
                  author: {
                      '@type': 'Organization',
                      name: 'Humanspeak, Inc.',
                      url: 'https://humanspeak.com',
                      sameAs: ['https://github.com/humanspeak', npmUrl, repoUrl]
                  },
                  offers: {
                      '@type': 'Offer',
                      price: '0',
                      priceCurrency: 'USD'
                  },
                  aggregateRating: {
                      '@type': 'AggregateRating',
                      ratingValue: '5',
                      ratingCount: String(stars),
                      bestRating: '5'
                  }
              }) +
              '<' +
              '/script>'
            : null
    )
</script>

<svelte:head>
    {#if softwareAppJsonLd}
        <!-- JSON-LD structured data: SoftwareApplication -->
        <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
        {@html softwareAppJsonLd}
    {/if}
</svelte:head>

<ModeWatcher />
<SeoContextProvider {seo}>
    <BreadcrumbContextProvider>
        <MotionConfig transition={{ duration: 0.5 }}>
            {@render children()}
        </MotionConfig>
        <BreadcrumbJsonLd {config} />
    </BreadcrumbContextProvider>
    <SeoHead {seo} {config} {favicon} />
</SeoContextProvider>
