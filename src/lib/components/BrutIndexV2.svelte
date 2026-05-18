<!--
  @component
  Brutalist-mono index page shell (v2).

  Renders the full sheet — coordinate strip, hero with meta sidebar + big
  monospace title + CTA row, a 3-column grid of items, and the big-type
  footer — used by both `/compare` and `/examples` style index pages.

  Mount inside a brutalist wrapper (a layout that puts `.brut-wrap` on the
  page root, e.g. `CompareLayoutV2` or any `<div class="brut-wrap …">` shell).

  Wiring example:

  ```svelte
  <script lang="ts">
    import { BrutIndexV2 } from '@humanspeak/docs-kit'
  </script>

  <BrutIndexV2
    hero={{
      figLabel: 'FIG-001 · EXAMPLES INDEX',
      meta: [
        { k: 'demos', v: '13' },
        { k: 'format', v: 'live editors' },
        { rule: 'dashed' },
        { k: 'library', v: '@humanspeak/svelte-markdown' },
        { k: 'framework', v: 'svelte 5', accent: true }
      ],
      kicker: '// examples / live demos',
      title: { accent: 'examples', end: '.' },
      subHtml: 'Hands-on demos of <b>@humanspeak/svelte-markdown</b> — …',
      ctas: [
        { label: 'open playground ↗', href: '/examples/playground', primary: true },
        { label: 'compare', href: '/compare' }
      ]
    }}
    lede={{ kicker: 'FIG-002 / DEMOS', title: { prefix: 'pick a ', accent: 'demo', suffix: '.' }, body: '…' }}
    items={examples.map((e, i) => ({
      href: `/examples/${e.slug}`,
      id: `№ ${pad(i + 1)} / ${pad(examples.length)}`,
      title: `${e.title.toLowerCase()}.`,
      tag: e.tag,
      line: e.description
    }))}
    footer={{
      big: { prefix: 'try ', accent: 'the playground', href: '/examples/playground', hint: 'edit markdown live' }
    }}
  />
  ```
-->
<script lang="ts">
    import type { Snippet } from 'svelte'
    import type {
        BrutIndexFooter,
        BrutIndexHero,
        BrutIndexItem,
        BrutIndexLede
    } from '../types/brut.js'

    interface Props {
        hero: BrutIndexHero
        lede: BrutIndexLede
        items: BrutIndexItem[]
        footer: BrutIndexFooter
        /** Optional content to render inside <svelte:head> (e.g. JSON-LD). */
        head?: Snippet
    }

    const { hero, lede, items, footer, head }: Props = $props()

    const COORD_MARKERS = Array.from({ length: 12 }, (_, i) => i)

    const footerLeft = $derived(
        footer.left ?? ['SET / JETBRAINS MONO + INTER', 'HUMANSPEAK · 2026', 'MIT LICENCE']
    )
    const footerRight = $derived(
        footer.right ?? ['SHEET 02 / 02', 'END OF INDEX', { label: '↩ HOME', href: '/' }]
    )
    const footerHint = $derived(footer.big.hint ?? 'install in 30 seconds')
</script>

<svelte:head>
    {#if head}{@render head()}{/if}
</svelte:head>

<main class="brut">
    <!-- ── Coordinate strip ─────────────────────────────────────── -->
    <div class="brut-coord" aria-hidden="true">
        {#each COORD_MARKERS as i (i)}
            <div>{String(i + 1).padStart(2, '0')}</div>
        {/each}
    </div>

    <!-- ── FIG-001 · MASTHEAD ───────────────────────────────────── -->
    <section class="brut-hero">
        {#if hero.figLabel}<div class="corner tr">{hero.figLabel}</div>{/if}
        {#if hero.meta && hero.meta.length}
            <aside class="meta">
                {#each hero.meta as row, i (i)}
                    {#if 'rule' in row}
                        <hr />
                    {:else}
                        <div>
                            <span class="k">{row.k}</span> ·
                            <span class="v" class:accent={row.accent}>{row.v}</span>
                        </div>
                    {/if}
                {/each}
                {#if hero.metaFooter}
                    <hr />
                    <div class="k">{hero.metaFooter}</div>
                {/if}
            </aside>
        {/if}
        <div class="hero-body">
            {#if hero.kicker}<div class="k">{hero.kicker}</div>{/if}
            <h1>
                <span>{hero.title.accent}</span>{#if hero.title.end}<span class="end"
                        >{hero.title.end}</span
                    >{/if}
            </h1>
            <p class="sub">
                <!-- eslint-disable-next-line svelte/no-at-html-tags -- consumer-supplied HTML for emphasis/code spans -->
                {@html hero.subHtml}
            </p>
            {#if hero.ctas && hero.ctas.length}
                <div class="cta-row">
                    {#each hero.ctas as cta (cta.href + cta.label)}
                        <a class:pri={cta.primary} href={cta.href}>{cta.label}</a>
                    {/each}
                </div>
            {/if}
        </div>
        {#if hero.figId}<div class="corner bl">{hero.figId}</div>{/if}
        {#if hero.sheetLabel}<div class="corner br">{hero.sheetLabel}</div>{/if}
    </section>

    <!-- ── FIG-002 · ITEM GRID ──────────────────────────────────── -->
    <section class="brut-grid-section">
        <div class="lede">
            {#if lede.kicker}<div class="k">{lede.kicker}</div>{/if}
            <h2>
                {#if lede.title.prefix}{lede.title.prefix}{/if}<span>{lede.title.accent}</span
                >{#if lede.title.suffix}{lede.title.suffix}{/if}
            </h2>
            {#if lede.body}<p>{lede.body}</p>{/if}
        </div>
        <div class="grid">
            {#each items as item (item.href)}
                <a class="cell" href={item.href}>
                    <div class="id">{item.id}</div>
                    <div class="corner">↗</div>
                    <h3>{item.title}</h3>
                    {#if item.tag}<p class="tag">{item.tag}</p>{/if}
                    {#if item.line}<p class="line">{item.line}</p>{/if}
                    <div class="marker"></div>
                </a>
            {/each}
        </div>
    </section>

    <!-- ── Big-type footer ──────────────────────────────────────── -->
    <section class="brut-foot">
        <div class="info">
            {#each footerLeft as line, i (i)}
                <div>{line}</div>
            {/each}
        </div>
        <a class="big" href={footer.big.href}>
            {footer.big.prefix}<br /><span>{footer.big.accent}</span> →
            <span class="copy-hint">{footerHint}</span>
        </a>
        <div class="info right">
            {#each footerRight as entry, i (i)}
                {#if typeof entry === 'string'}
                    <div>{entry}</div>
                {:else}
                    <a class="v" href={entry.href}>{entry.label}</a>
                {/if}
            {/each}
        </div>
    </section>
</main>

<style>
    /* Brutalist tokens + .brut / .brut-wrap base styles live in
       @humanspeak/docs-kit/styles/brutalist.css (imported via app.css). */

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

    .brut-hero {
        padding: 80px 24px 32px;
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
    }
    .brut-hero .meta .v.accent {
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
        font-size: clamp(56px, 11vw, 152px);
        line-height: 0.88;
        font-weight: 500;
        letter-spacing: -0.06em;
        text-transform: lowercase;
    }
    .brut-hero h1 span {
        color: var(--brut-accent);
    }
    .brut-hero h1 .end {
        color: var(--brut-ink-3);
    }
    .brut-hero .sub {
        margin: 28px 0 0;
        max-width: 720px;
        font-size: 17px;
        line-height: 1.5;
        color: var(--brut-ink-2);
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        letter-spacing: -0.01em;
    }
    .brut-hero .sub :global(b) {
        color: var(--brut-ink);
        font-weight: 600;
    }
    .brut-hero .sub :global(code) {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        background: var(--brut-bg-2);
        border: 1px solid var(--brut-rule);
        padding: 0 5px;
        font-size: 14.5px;
        color: var(--brut-ink);
    }
    .brut-hero .cta-row {
        margin-top: 28px;
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

    /* ── Grid section ─────────────────────────────────────────── */
    .brut-grid-section {
        padding: 28px 24px;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-grid-section .lede .k {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-grid-section .lede h2 {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 28px;
        color: var(--brut-ink);
        margin: 12px 0 0;
        letter-spacing: -0.02em;
        text-transform: lowercase;
        font-weight: 500;
    }
    .brut-grid-section .lede h2 span {
        color: var(--brut-accent);
    }
    .brut-grid-section .lede p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink-2);
        margin: 12px 0 0;
        font-size: 13px;
        line-height: 1.55;
        max-width: 220px;
    }
    .brut-grid-section .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        border-left: 1px solid var(--brut-rule);
        border-top: 1px solid var(--brut-rule);
    }
    .brut-grid-section .cell {
        display: block;
        border-right: 1px solid var(--brut-rule);
        border-bottom: 1px solid var(--brut-rule);
        padding: 22px 22px 26px;
        min-height: 240px;
        position: relative;
        color: var(--brut-ink);
        text-decoration: none;
        background: var(--brut-bg);
    }
    .brut-grid-section .cell::after {
        content: '';
        position: absolute;
        inset: 8px;
        border: 1px solid transparent;
        pointer-events: none;
        transition: border-color 0.2s;
    }
    .brut-grid-section .cell:hover::after {
        border-color: var(--brut-accent);
    }
    .brut-grid-section .cell .id {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-grid-section .cell h3 {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 28px;
        font-weight: 500;
        letter-spacing: -0.03em;
        margin: 26px 0 6px;
        color: var(--brut-ink);
        text-transform: lowercase;
    }
    .brut-grid-section .cell:hover h3 {
        color: var(--brut-accent);
    }
    .brut-grid-section .cell .tag {
        font-size: 10.5px;
        letter-spacing: 0.14em;
        color: var(--brut-ink-3);
        text-transform: uppercase;
        margin: 0;
    }
    .brut-grid-section .cell .line {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 13.5px;
        color: var(--brut-ink-2);
        line-height: 1.5;
        margin: 12px 0 0;
        max-width: 320px;
    }
    .brut-grid-section .cell .corner {
        position: absolute;
        top: 14px;
        right: 16px;
        font-size: 14px;
        color: var(--brut-ink-3);
        transition: color 0.2s;
    }
    .brut-grid-section .cell:hover .corner {
        color: var(--brut-accent);
    }
    .brut-grid-section .cell .marker {
        width: 14px;
        height: 14px;
        border: 1px solid var(--brut-ink-3);
        position: absolute;
        bottom: 16px;
        right: 16px;
    }
    .brut-grid-section .cell:nth-child(3n + 1) .marker {
        background: var(--brut-accent);
        border-color: var(--brut-accent);
    }

    /* ── Footer ───────────────────────────────────────────────── */
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
        font-size: clamp(40px, 7vw, 96px);
        line-height: 0.9;
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

    @media (max-width: 1024px) {
        .brut-grid-section .grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }
    @media (max-width: 720px) {
        .brut-coord {
            display: none;
        }
        .brut-hero,
        .brut-grid-section {
            grid-template-columns: 1fr;
            padding-left: 16px;
            padding-right: 16px;
        }
        .brut-hero {
            padding-top: 56px;
        }
        .brut-grid-section .grid {
            grid-template-columns: 1fr;
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
