<!--
  @component
  Brutalist-mono per-competitor compare page (v2).

  Renders the seven-section brutalist sheet (masthead → overview →
  feature matrix → strengths → limitations → verdict → more comparisons
  → big-type footer) from a `Competitor` data record plus the consumer's
  brand identity (`ours`). One file replaces ~800 lines of per-consumer
  layout/CSS that was previously copy-pasted across docs sites.

  Wiring:

  ```svelte
  <script lang="ts">
    import { ComparisonPageV2 } from '@humanspeak/docs-kit'
    import { competitors, getCompetitor } from '$lib/compare-data'
    import type { PageData } from './$types'

    const { data }: { data: PageData } = $props()
    const others = $derived(competitors.filter((c) => c.slug !== data.competitor.slug))
  </script>

  <ComparisonPageV2
      competitor={data.competitor}
      {others}
      ours={{
          name: 'Svelte Markdown',
          npmPackage: '@humanspeak/svelte-markdown',
          slug: 'svelte-markdown',
          url: 'https://markdown.svelte.page'
      }}
  />
  ```

  Must be mounted inside a brutalist wrapper that pulls in
  `@humanspeak/docs-kit/styles/brutalist.css`. The site's
  `/compare/+layout.svelte` (using `CompareLayoutV2`) already does this.
-->
<script lang="ts">
    import type { Competitor, ComparisonOurs, CompareFooterCta } from '../types/compare.js'
    import { getSeoContext } from '../contexts/seo.js'

    interface Props {
        competitor: Competitor
        /** Other competitors for the "more comparisons" grid at the bottom. */
        others: Competitor[]
        ours: ComparisonOurs
        /** Masthead primary CTA. Default `/docs`. */
        getStartedHref?: string
        /** Masthead secondary link. Default `/examples`. */
        examplesHref?: string
        /** Big-type footer CTA. */
        footerCta?: CompareFooterCta
        /** Whether to emit Article JSON-LD into <svelte:head>. Default true. */
        emitJsonLd?: boolean
        /** ogFeatures override for the SEO context. */
        ogFeatures?: string[]
    }

    const {
        competitor,
        others,
        ours,
        getStartedHref = '/docs',
        examplesHref = '/examples',
        footerCta,
        emitJsonLd = true,
        ogFeatures = ['Feature Comparison', 'Pros & Cons', 'Migration Guide', 'Honest Verdict']
    }: Props = $props()

    const seo = getSeoContext()
    // Apply SEO metadata. Synchronous call is what SSR sees — $effect is
    // client-only and would otherwise leave the SSR HTML with the config
    // fallback until hydration patched it. $effect still runs so client-side
    // navigation that reuses this component instance stays reactive on prop
    // change.
    const applySeo = () => {
        if (!seo) return
        seo.title = `${ours.name} vs ${competitor.name} | Compare`
        seo.description = competitor.description
        seo.ogTitle = `vs ${competitor.name}`
        seo.ogTagline = competitor.tagline
        seo.ogFeatures = ogFeatures
        seo.ogSlug = `compare-${competitor.slug}`
    }
    applySeo()
    $effect(applySeo)

    const articleJsonLd = $derived.by(() => {
        if (!emitJsonLd) return ''
        return `<${'script'} type="application/ld+json">${JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: `${ours.name} vs ${competitor.name}`,
            description: competitor.description,
            author: { '@type': 'Organization', name: 'Humanspeak', url: 'https://humanspeak.com' },
            publisher: {
                '@type': 'Organization',
                name: 'Humanspeak',
                url: 'https://humanspeak.com'
            },
            mainEntityOfPage: {
                '@type': 'WebPage',
                '@id': `${ours.url}/compare/${competitor.slug}`
            },
            about: [
                {
                    '@type': 'SoftwareApplication',
                    name: ours.npmPackage,
                    applicationCategory: 'DeveloperApplication',
                    operatingSystem: 'Any',
                    url: ours.url
                },
                {
                    '@type': 'SoftwareApplication',
                    name: competitor.name,
                    applicationCategory: 'DeveloperApplication',
                    ...(competitor.website ? { url: competitor.website } : {})
                }
            ],
            keywords: competitor.keywords
        })}</${'script'}>`
    })

    type CellShape = { kind: 'yes' | 'no' | 'text'; text: string }
    const cell = (value: string | boolean): CellShape => {
        if (value === true) return { kind: 'yes', text: 'yes' }
        if (value === false) return { kind: 'no', text: 'no' }
        return { kind: 'text', text: value }
    }

    const footerLabel = $derived(
        footerCta?.label ?? { prefix: 'try ', accent: ours.name.toLowerCase() }
    )
    const footerHref = $derived(footerCta?.href ?? getStartedHref)
    const footerHint = $derived(footerCta?.hint ?? 'install in 30 seconds')
    const oursLower = $derived(ours.name.toLowerCase())
</script>

<svelte:head>
    {#if articleJsonLd}
        <!-- eslint-disable-next-line svelte/no-at-html-tags -- static JSON-LD, no user input -->
        {@html articleJsonLd}
    {/if}
</svelte:head>

<main class="brut">
    <!-- ── Coordinate strip ─────────────────────────────────────── -->
    <div class="brut-coord" aria-hidden="true">
        {#each Array.from({ length: 12 }, (_, i) => i) as i (i)}
            <div>{String(i + 1).padStart(2, '0')}</div>
        {/each}
    </div>

    <!-- ── FIG-001 · MASTHEAD ───────────────────────────────────── -->
    <section class="brut-hero">
        <div class="corner tr">FIG-001 · MASTHEAD</div>
        <aside class="meta">
            <div><span class="k">type</span> · <span class="v">{competitor.type}</span></div>
            <div>
                <span class="k">approach</span> · <span class="v">{competitor.approach}</span>
            </div>
            <hr />
            {#if competitor.npm}
                <div>
                    <span class="k">npm</span> ·
                    <a
                        class="v"
                        href="https://www.npmjs.com/package/{competitor.npm}"
                        target="_blank"
                        rel="noopener noreferrer">{competitor.npm} ↗</a
                    >
                </div>
            {/if}
            {#if competitor.github}
                <div>
                    <span class="k">github</span> ·
                    <a class="v" href={competitor.github} target="_blank" rel="noopener noreferrer"
                        >repo ↗</a
                    >
                </div>
            {/if}
            {#if competitor.website}
                <div>
                    <span class="k">site</span> ·
                    <a class="v" href={competitor.website} target="_blank" rel="noopener noreferrer"
                        >homepage ↗</a
                    >
                </div>
            {/if}
            <hr />
            <div class="k">// honest comparison</div>
        </aside>
        <div class="hero-body">
            <div class="k">// compare / {ours.slug} vs {competitor.slug}</div>
            <h1>
                <span class="end vs">vs</span><span>{competitor.name.toLowerCase()}</span><span
                    class="end">.</span
                >
            </h1>
            <p class="sub">{competitor.tagline}</p>
            <div class="cta-row">
                <a class="pri" href={getStartedHref}>get started ↗</a>
                <a href={examplesHref}>examples</a>
                <a href="/compare">all comparisons</a>
            </div>
        </div>
        <div class="corner bl">FIG-001</div>
        <div class="corner br">SHEET 01 / 07</div>
    </section>

    <!-- ── FIG-002 · OVERVIEW ───────────────────────────────────── -->
    <section class="brut-section">
        <div class="lede">
            <div class="k">FIG-002 / OVERVIEW</div>
            <h2>at a <span>glance</span>.</h2>
        </div>
        <div class="panel overview">
            <p>{competitor.description}</p>
        </div>
    </section>

    <!-- ── FIG-003 · FEATURE MATRIX ─────────────────────────────── -->
    <section class="brut-section">
        <div class="lede">
            <div class="k">FIG-003 / FEATURE MATRIX</div>
            <h2>side-by-<span>side</span>.</h2>
            <p>Every surface that matters, compared without spin.</p>
        </div>
        <div class="panel">
            <div class="matrix-scroll">
                <table class="matrix">
                    <thead>
                        <tr>
                            <th>feature</th>
                            <th class="us">{ours.npmPackage}</th>
                            <th>{competitor.name}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each competitor.features as feature, i (feature.name)}
                            {@const u = cell(feature.us)}
                            {@const t = cell(feature.them)}
                            <tr class={i % 2 === 0 ? 'alt' : ''}>
                                <td>
                                    <span class="fname">{feature.name}</span>
                                    {#if feature.note}
                                        <span class="fnote">{feature.note}</span>
                                    {/if}
                                </td>
                                <td class={u.kind === 'yes' ? 'ok us' : u.kind === 'no' ? 'no' : ''}
                                    >{u.text}</td
                                >
                                <td class={t.kind === 'yes' ? 'ok' : t.kind === 'no' ? 'no' : ''}
                                    >{t.text}</td
                                >
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    </section>

    <!-- ── FIG-004 · STRENGTHS ──────────────────────────────────── -->
    <section class="brut-section">
        <div class="lede">
            <div class="k">FIG-004 / STRENGTHS</div>
            <h2>where each <span>shines</span>.</h2>
        </div>
        <div class="pair">
            <div class="panel list us">
                <header>
                    <span class="tag">▣ {oursLower}</span>
                    <span class="count">{competitor.prosUs.length}</span>
                </header>
                <ul>
                    {#each competitor.prosUs as pro (pro)}
                        <li><span class="bullet">+</span>{pro}</li>
                    {/each}
                </ul>
            </div>
            <div class="panel list them">
                <header>
                    <span class="tag">▢ {competitor.name.toLowerCase()}</span>
                    <span class="count">{competitor.prosThem.length}</span>
                </header>
                <ul>
                    {#each competitor.prosThem as pro (pro)}
                        <li><span class="bullet">+</span>{pro}</li>
                    {/each}
                </ul>
            </div>
        </div>
    </section>

    <!-- ── FIG-005 · LIMITATIONS ────────────────────────────────── -->
    <section class="brut-section">
        <div class="lede">
            <div class="k">FIG-005 / LIMITATIONS</div>
            <h2>where each <span>falls short</span>.</h2>
        </div>
        <div class="pair">
            <div class="panel list us muted">
                <header>
                    <span class="tag">▣ {oursLower}</span>
                    <span class="count">{competitor.consUs.length}</span>
                </header>
                <ul>
                    {#each competitor.consUs as con (con)}
                        <li><span class="bullet bad">−</span>{con}</li>
                    {/each}
                </ul>
            </div>
            <div class="panel list them muted">
                <header>
                    <span class="tag">▢ {competitor.name.toLowerCase()}</span>
                    <span class="count">{competitor.consThem.length}</span>
                </header>
                <ul>
                    {#each competitor.consThem as con (con)}
                        <li><span class="bullet bad">−</span>{con}</li>
                    {/each}
                </ul>
            </div>
        </div>
    </section>

    <!-- ── FIG-006 · VERDICT ────────────────────────────────────── -->
    <section class="brut-section">
        <div class="lede">
            <div class="k">FIG-006 / VERDICT</div>
            <h2>the <span>honest</span> call.</h2>
        </div>
        <div class="panel verdict">
            <p>{competitor.verdict}</p>
        </div>
    </section>

    <!-- ── FIG-007 · MORE COMPARISONS ───────────────────────────── -->
    <section class="brut-section">
        <div class="lede">
            <div class="k">FIG-007 / MORE</div>
            <h2>read <span>more</span>.</h2>
            <p>Every head-to-head, with the same matrix + pros / cons + verdict format.</p>
        </div>
        <div class="more-grid">
            {#each others as o (o.slug)}
                <a class="more-cell" href="/compare/{o.slug}">
                    <div class="more-tag">vs {o.name.toLowerCase()}</div>
                    <p class="more-line">{o.tagline}</p>
                    <span class="more-cta">read comparison ↗</span>
                </a>
            {/each}
            <a class="more-cell all" href="/compare">
                <div class="more-tag">all comparisons</div>
                <p class="more-line">The full /compare index — every head-to-head in one place.</p>
                <span class="more-cta">browse all ↗</span>
            </a>
        </div>
    </section>

    <!-- ── Big-type footer / next steps ─────────────────────────── -->
    <section class="brut-foot">
        <div class="info">
            <div>SET / JETBRAINS MONO + INTER</div>
            <div>HUMANSPEAK · 2026</div>
            <div>MIT LICENCE</div>
        </div>
        <a class="big" href={footerHref}>
            {footerLabel.prefix}<br /><span>{footerLabel.accent}</span> →
            <span class="copy-hint">{footerHint}</span>
        </a>
        <div class="info right">
            <div>SHEET 07 / 07</div>
            <div>END OF DOCUMENT</div>
            <a class="v" href="/compare">↩ ALL COMPARISONS</a>
        </div>
    </section>
</main>

<style>
    /* Core brutalist tokens come from @humanspeak/docs-kit/styles/brutalist.css
       (imported via the consumer's app.css). The `--brut-bad*` tokens below
       are component-specific — they tint the "limitations" rail on the
       comparison matrix and aren't part of the shared palette. */
    .brut {
        --brut-bad: #b8443c;
        --brut-bad-soft: rgba(184, 68, 60, 0.08);
    }
    :global(html.dark) .brut {
        --brut-bad: #f5736b;
        --brut-bad-soft: rgba(245, 115, 107, 0.12);
    }

    /* ── Coordinate strip ─────────────────────────────────────────── */
    .brut-coord {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        border-bottom: 1px solid var(--brut-rule);
        font-size: 10px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-coord div {
        padding: 6px 8px;
        border-right: 1px solid var(--brut-rule);
    }
    .brut-coord div:last-child {
        border-right: 0;
    }

    /* ── Hero / masthead ──────────────────────────────────────────── */
    .brut-hero {
        padding: 64px 24px 32px;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
        position: relative;
    }
    .brut-hero .meta {
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 11px;
        color: var(--brut-ink-3);
    }
    .brut-hero .meta .k {
        color: var(--brut-ink-3);
    }
    .brut-hero .meta .v {
        color: var(--brut-ink);
        text-decoration: none;
    }
    .brut-hero .meta a.v:hover {
        color: var(--brut-accent);
    }
    .brut-hero .meta hr {
        border: 0;
        border-top: 1px dashed var(--brut-rule);
        margin: 8px 0;
    }
    .brut-hero .hero-body .k {
        font-size: 11px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-hero h1 {
        margin: 8px 0 0;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: clamp(48px, 9vw, 128px);
        line-height: 0.92;
        font-weight: 500;
        letter-spacing: -0.05em;
        text-transform: lowercase;
        color: var(--brut-ink);
    }
    .brut-hero h1 span {
        color: var(--brut-accent);
    }
    .brut-hero h1 .end {
        color: var(--brut-ink-3);
    }
    .brut-hero h1 .vs {
        margin-right: 0.28em;
    }
    .brut-hero .sub {
        margin: 22px 0 0;
        max-width: 720px;
        font-size: 17px;
        line-height: 1.5;
        color: var(--brut-ink-2);
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        letter-spacing: -0.01em;
    }
    .brut-hero .cta-row {
        margin-top: 24px;
        display: flex;
        flex-wrap: wrap;
        gap: 0;
        width: fit-content;
        max-width: 100%;
    }
    .brut-hero .cta-row > * {
        padding: 10px 14px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        font-size: 13px;
        color: var(--brut-ink);
        text-decoration: none;
        position: relative;
        z-index: 1;
        transition:
            background 0.15s,
            border-color 0.15s;
    }
    .brut-hero .cta-row > * + * {
        margin-left: -1px;
    }
    .brut-hero .cta-row > *:hover {
        z-index: 2;
    }
    .brut-hero .cta-row .pri {
        background: var(--brut-accent);
        color: var(--brut-accent-ink);
        font-weight: 600;
        border-color: var(--brut-accent);
    }
    .brut-hero .cta-row .pri:hover {
        background: var(--brut-accent-hover);
        border-color: var(--brut-accent-hover);
    }
    .brut-hero .cta-row a:not(.pri):hover {
        background: var(--brut-bg-2);
        border-color: var(--brut-rule-2);
    }
    .brut-hero .corner {
        position: absolute;
        font-size: 10px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-hero .corner.tr {
        top: 12px;
        right: 24px;
    }
    .brut-hero .corner.bl {
        bottom: 12px;
        left: 24px;
    }
    .brut-hero .corner.br {
        bottom: 12px;
        right: 24px;
    }

    /* ── Section frame (shared) ───────────────────────────────────── */
    .brut-section {
        padding: 28px 24px;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-section .lede .k {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-section .lede h2 {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 28px;
        color: var(--brut-ink);
        margin: 12px 0 0;
        letter-spacing: -0.02em;
        text-transform: lowercase;
        font-weight: 500;
    }
    .brut-section .lede h2 span {
        color: var(--brut-accent);
    }
    .brut-section .lede p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink-2);
        margin: 12px 0 0;
        font-size: 13px;
        line-height: 1.55;
        max-width: 220px;
    }
    .brut-section .panel {
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
    }

    /* ── Overview panel ───────────────────────────────────────────── */
    .panel.overview {
        padding: 22px 24px;
    }
    .panel.overview p {
        margin: 0;
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 15px;
        line-height: 1.6;
        color: var(--brut-ink);
        letter-spacing: -0.005em;
    }

    /* ── Feature matrix ───────────────────────────────────────────── */
    .matrix-scroll {
        overflow-x: auto;
    }
    table.matrix {
        width: 100%;
        border-collapse: collapse;
        min-width: 640px;
    }
    table.matrix th,
    table.matrix td {
        text-align: left;
        padding: 12px 14px;
        border-bottom: 1px solid var(--brut-rule);
        font-size: 12.5px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        color: var(--brut-ink);
        vertical-align: top;
    }
    table.matrix th {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
        font-weight: 400;
        text-transform: lowercase;
        background: var(--brut-bg-2);
    }
    table.matrix th.us {
        color: var(--brut-accent);
    }
    table.matrix tbody tr:hover {
        background: var(--brut-bg-2);
    }
    table.matrix tr.alt {
        background: rgba(0, 0, 0, 0.015);
    }
    :global(html.dark) table.matrix tr.alt {
        background: rgba(255, 255, 255, 0.02);
    }
    table.matrix td.ok {
        color: var(--brut-accent);
    }
    table.matrix td.no {
        color: var(--brut-ink-3);
    }
    table.matrix td.us {
        font-weight: 600;
    }
    table.matrix .fname {
        display: inline-block;
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 13.5px;
    }
    table.matrix .fnote {
        display: block;
        margin-top: 4px;
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 11.5px;
        color: var(--brut-ink-2);
        line-height: 1.45;
    }

    /* ── Pair (strengths / limitations) ───────────────────────────── */
    .pair {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0;
    }
    .panel.list {
        border-right-width: 0;
    }
    .panel.list:last-child {
        border-right-width: 1px;
    }
    .panel.list header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        border-bottom: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }
    .panel.list.us header .tag {
        color: var(--brut-accent);
    }
    .panel.list.them header .tag {
        color: var(--brut-ink);
    }
    .panel.list header .count {
        color: var(--brut-ink-3);
        font-variant-numeric: tabular-nums;
    }
    .panel.list ul {
        list-style: none;
        margin: 0;
        padding: 0;
    }
    .panel.list li {
        display: flex;
        gap: 10px;
        padding: 10px 14px;
        border-bottom: 1px dashed var(--brut-rule);
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 13.5px;
        line-height: 1.5;
        color: var(--brut-ink);
    }
    .panel.list li:last-child {
        border-bottom: 0;
    }
    .panel.list .bullet {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        color: var(--brut-accent);
        flex-shrink: 0;
        width: 12px;
        line-height: 1.5;
    }
    .panel.list .bullet.bad {
        color: var(--brut-bad);
    }
    .panel.list.muted li {
        color: var(--brut-ink-2);
    }

    /* ── Verdict ──────────────────────────────────────────────────── */
    .panel.verdict {
        padding: 28px 32px;
        border: 1px solid var(--brut-accent);
        background: var(--brut-accent-soft);
    }
    .panel.verdict p {
        margin: 0;
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 16px;
        line-height: 1.6;
        color: var(--brut-ink);
        letter-spacing: -0.005em;
    }

    /* ── More comparisons grid ────────────────────────────────────── */
    .more-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        border-left: 1px solid var(--brut-rule);
        border-top: 1px solid var(--brut-rule);
    }
    .more-cell {
        display: block;
        border-right: 1px solid var(--brut-rule);
        border-bottom: 1px solid var(--brut-rule);
        padding: 20px 22px 22px;
        min-height: 180px;
        position: relative;
        color: var(--brut-ink);
        text-decoration: none;
        background: var(--brut-bg);
        transition: background 0.15s;
    }
    .more-cell:hover {
        background: var(--brut-bg-2);
    }
    .more-cell::after {
        content: '';
        position: absolute;
        inset: 8px;
        border: 1px solid transparent;
        pointer-events: none;
        transition: border-color 0.2s;
    }
    .more-cell:hover::after {
        border-color: var(--brut-accent);
    }
    .more-cell .more-tag {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 20px;
        font-weight: 500;
        letter-spacing: -0.02em;
        color: var(--brut-ink);
        text-transform: lowercase;
    }
    .more-cell:hover .more-tag {
        color: var(--brut-accent);
    }
    .more-cell .more-line {
        margin: 14px 0 0;
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 13px;
        line-height: 1.55;
        color: var(--brut-ink-2);
        max-width: 280px;
    }
    .more-cell .more-cta {
        position: absolute;
        bottom: 16px;
        left: 22px;
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--brut-accent);
    }
    .more-cell.all {
        background: var(--brut-bg-2);
    }
    .more-cell.all:hover {
        background: var(--brut-bg);
    }

    /* ── Footer / next ────────────────────────────────────────────── */
    .brut-foot {
        padding: 60px 24px 36px;
        display: grid;
        grid-template-columns: 200px 1fr 200px;
        gap: 24px;
        border-top: 1px solid var(--brut-rule);
        align-items: end;
    }
    .brut-foot .big {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: clamp(36px, 6.4vw, 88px);
        line-height: 0.92;
        letter-spacing: -0.06em;
        text-transform: lowercase;
        color: var(--brut-ink);
        text-decoration: none;
        display: inline-block;
    }
    .brut-foot .big span {
        color: var(--brut-accent);
    }
    .brut-foot .big .copy-hint {
        display: block;
        margin-top: 16px;
        font-size: 11px;
        letter-spacing: 0.14em;
        color: var(--brut-ink-3);
        text-transform: uppercase;
    }
    .brut-foot .big:hover .copy-hint {
        color: var(--brut-accent);
    }
    .brut-foot .info {
        font-size: 11px;
        color: var(--brut-ink-3);
        letter-spacing: 0.12em;
        line-height: 1.8;
    }
    .brut-foot .info.right {
        text-align: right;
    }
    .brut-foot .info .v,
    .brut-foot .info a.v {
        color: var(--brut-ink);
        text-decoration: none;
        display: block;
        margin-top: 12px;
    }
    .brut-foot .info a.v:hover {
        color: var(--brut-accent);
    }

    /* ── Responsive ───────────────────────────────────────────────── */
    @media (max-width: 1024px) {
        .pair {
            grid-template-columns: 1fr;
        }
        .panel.list {
            border-right-width: 1px;
            border-bottom-width: 0;
        }
        .panel.list:last-child {
            border-bottom-width: 1px;
        }
        .more-grid {
            grid-template-columns: 1fr 1fr;
        }
    }
    @media (max-width: 720px) {
        .more-grid {
            grid-template-columns: 1fr;
        }
        .brut-coord {
            display: none;
        }
        .brut-hero,
        .brut-section {
            grid-template-columns: 1fr;
            padding-left: 16px;
            padding-right: 16px;
        }
        .brut-hero {
            padding-top: 48px;
        }
        .brut-foot {
            grid-template-columns: 1fr;
            padding: 40px 16px 28px;
        }
        .brut-foot .info.right {
            text-align: left;
        }
    }
</style>
