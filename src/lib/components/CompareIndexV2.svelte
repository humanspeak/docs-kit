<!--
  @component
  Brutalist-mono `/compare` index page (v2).

  Thin adapter over `BrutIndexV2` that maps `Competitor[]` → grid items
  and supplies compare-specific JSON-LD, SEO, and default copy. The full
  brutalist sheet (coordinate strip, hero, grid, big-type footer) lives
  in `BrutIndexV2`.

  Wiring:

  ```svelte
  <script lang="ts">
    import { CompareIndexV2 } from '@humanspeak/docs-kit'
    import { competitors } from '../compare-data'
  </script>

  <CompareIndexV2
      {competitors}
      ours={{
          name: 'Svelte Markdown',
          npmPackage: '@humanspeak/svelte-markdown',
          slug: 'svelte-markdown',
          url: 'https://markdown.svelte.page'
      }}
  />
  ```

  Mount inside a brutalist wrapper (the per-site `/compare/+layout.svelte`
  using `CompareLayoutV2` provides this).
-->
<script lang="ts">
    import type { Competitor, ComparisonOurs, CompareFooterCta } from '../types/compare.js'
    import { getSeoContext } from '../contexts/seo.js'
    import BrutIndexV2 from './BrutIndexV2.svelte'

    interface Props {
        competitors: Competitor[]
        ours: ComparisonOurs
        /** Hero copy. Default: a generic intro built from competitor names. */
        introHtml?: string
        getStartedHref?: string
        examplesHref?: string
        footerCta?: CompareFooterCta
        emitJsonLd?: boolean
        ogFeatures?: string[]
        /** Hero "framework" line value — e.g. "svelte 5" / "react 19". */
        framework?: string
    }

    const {
        competitors,
        ours,
        introHtml,
        getStartedHref = '/docs',
        examplesHref = '/examples',
        footerCta,
        emitJsonLd = true,
        ogFeatures = ['Feature Matrices', 'Pros & Cons', 'Migration Guides', 'Honest Verdicts'],
        framework = 'svelte 5'
    }: Props = $props()

    const pad2 = (n: number) => String(n).padStart(2, '0')

    const seo = getSeoContext()
    $effect(() => {
        if (!seo) return
        const namesList = competitors.map((c) => c.name).join(', ')
        seo.title = `Compare | ${ours.name} vs ${namesList}`
        seo.description = `See how ${ours.npmPackage} compares to ${namesList}. Honest, side-by-side comparisons with feature matrices and verdicts.`
        seo.ogTitle = `${ours.name} vs Alternatives`
        seo.ogTagline = 'Honest, side-by-side comparisons.'
        seo.ogFeatures = ogFeatures
        seo.ogSlug = 'compare'
    })

    const collectionJsonLd = $derived.by(() => {
        if (!emitJsonLd) return ''
        return JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `Compare | ${ours.name} vs Alternatives`,
            description: `See how ${ours.npmPackage} compares to ${competitors
                .map((c) => c.name)
                .join(', ')}.`,
            url: `${ours.url}/compare`,
            mainEntity: {
                '@type': 'ItemList',
                itemListElement: competitors.map((c, i) => ({
                    '@type': 'ListItem',
                    position: i + 1,
                    name: `${ours.name} vs ${c.name}`,
                    url: `${ours.url}/compare/${c.slug}`
                }))
            },
            publisher: {
                '@type': 'Organization',
                name: 'Humanspeak',
                url: 'https://humanspeak.com'
            }
        })
    })

    const defaultIntro = $derived.by(() => {
        const named = competitors
            .slice(0, 3)
            .map((c) => `<b>${c.name}</b>`)
            .join(', ')
        const more = competitors.length > 3 ? ', and more' : ''
        return `Honest, side-by-side comparisons of <b>${ours.npmPackage}</b> against every major alternative you'd consider — including ${named}${more}. Feature matrices, pros / cons, verdicts. No spin.`
    })

    const defaultFooterLabel = $derived.by(() => {
        const parts = ours.name.toLowerCase().split(/\s+/)
        if (parts.length >= 2) {
            return { prefix: `try ${parts[0]} `, accent: parts.slice(1).join(' ') }
        }
        return { prefix: 'try ', accent: ours.name.toLowerCase() }
    })
    const footerBig = $derived({
        prefix: footerCta?.label?.prefix ?? defaultFooterLabel.prefix,
        accent: footerCta?.label?.accent ?? defaultFooterLabel.accent,
        href: footerCta?.href ?? getStartedHref,
        hint: footerCta?.hint ?? 'install in 30 seconds'
    })

    const hero = $derived({
        figLabel: 'FIG-001 · COMPARE INDEX',
        figId: 'FIG-001',
        sheetLabel: 'SHEET 01 / 02',
        meta: [
            { k: 'comparisons', v: String(competitors.length) },
            { k: 'format', v: 'feature matrix' },
            { k: 'tone', v: 'honest' },
            { rule: 'dashed' as const },
            { k: 'library', v: ours.npmPackage },
            { k: 'framework', v: framework, accent: true }
        ],
        metaFooter: '// scroll for matrices',
        kicker: `// compare / ${ours.slug} vs the field`,
        title: { accent: 'compare', end: '.' },
        subHtml: introHtml ?? defaultIntro,
        ctas: [
            { label: 'get started ↗', href: getStartedHref, primary: true },
            { label: 'examples', href: examplesHref }
        ]
    })

    const lede = {
        kicker: 'FIG-002 / COMPARISONS',
        title: { prefix: 'pick a ', accent: 'head-to-head', suffix: '.' },
        body: 'Each page is a feature matrix, strengths, limitations, and an honest verdict.'
    }

    const items = $derived(
        competitors.map((c, i) => ({
            href: `/compare/${c.slug}`,
            id: `№ ${pad2(i + 1)} / ${pad2(competitors.length)}`,
            title: `vs ${c.name.toLowerCase()}.`,
            tag: c.type,
            line: c.tagline
        }))
    )
</script>

<BrutIndexV2 {hero} {lede} {items} footer={{ big: footerBig }}>
    {#snippet head()}
        {#if collectionJsonLd}
            <!-- eslint-disable-next-line svelte/no-at-html-tags -- static JSON-LD, no user input -->
            {@html `<${'script'} type="application/ld+json">${collectionJsonLd}</${'script'}>`}
        {/if}
    {/snippet}
</BrutIndexV2>
