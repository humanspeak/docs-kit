<!--
  @component
  Brutalist-mono doc hero card.

  Card-style hero (no full-bleed) designed to sit at the top of a doc page
  or any prose-wrapped landing surface. Carries `not-prose` so it escapes
  Tailwind Typography rules when embedded inside a prose container.

  Visual contract:
   - Hairline bordered card with JetBrains Mono headings.
   - Optional `accent` word renders in the brand colour; trailing `.` is muted.
   - Optional CTA pills follow the same brutalist no-radius treatment as the
     marketing pages.
   - FIG corner markers + optional SHEET marker mirror the homepage.
-->
<script lang="ts">
    interface Cta {
        href: string
        label: string
        primary?: boolean
        external?: boolean
    }

    interface Props {
        figNo?: string
        figLabel?: string
        slug?: string
        title: string
        accent?: string
        tagline: string
        ctas?: Cta[]
        sheet?: string
    }

    const {
        figNo = 'FIG-DOC-001',
        figLabel = 'MASTHEAD',
        slug = 'docs',
        title,
        accent,
        tagline,
        ctas = [],
        sheet
    }: Props = $props()
</script>

<section class="dk-doc-hero not-prose">
    <div class="dk-doc-hero-corner tr">{figNo} · {figLabel}</div>
    <div class="dk-doc-hero-body">
        <div class="dk-doc-hero-k">// docs / {slug}</div>
        <h1>
            {#if accent}
                <span>{title}</span><span class="dk-doc-hero-hilite">&nbsp;{accent}</span><span
                    class="dk-doc-hero-end">.</span
                >
            {:else}
                <span>{title}</span><span class="dk-doc-hero-end">.</span>
            {/if}
        </h1>
        <p class="dk-doc-hero-sub">{tagline}</p>
        {#if ctas.length}
            <div class="dk-doc-hero-ctas">
                {#each ctas as cta (cta.href)}
                    <a
                        class={cta.primary ? 'pri' : ''}
                        href={cta.href}
                        target={cta.external ? '_blank' : undefined}
                        rel={cta.external ? 'noopener noreferrer' : undefined}>{cta.label}</a
                    >
                {/each}
            </div>
        {/if}
    </div>
    <div class="dk-doc-hero-corner bl">{figNo}</div>
    {#if sheet}
        <div class="dk-doc-hero-corner br">{sheet}</div>
    {/if}
</section>

<style>
    .dk-doc-hero {
        position: relative;
        margin: 0 0 36px;
        padding: 32px 28px 32px;
        border: 1px solid var(--border);
        background: var(--background);
        color: var(--foreground);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 13px;
        letter-spacing: 0;
    }
    .dk-doc-hero-corner {
        position: absolute;
        font-size: 10px;
        color: var(--muted-foreground);
        letter-spacing: 0.14em;
        text-transform: uppercase;
    }
    .dk-doc-hero-corner.tr {
        top: 10px;
        right: 14px;
    }
    .dk-doc-hero-corner.bl {
        bottom: 10px;
        left: 14px;
    }
    .dk-doc-hero-corner.br {
        bottom: 10px;
        right: 14px;
    }
    .dk-doc-hero-k {
        font-size: 10.5px;
        color: var(--muted-foreground);
        letter-spacing: 0.14em;
    }
    .dk-doc-hero h1 {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: clamp(40px, 6vw, 88px);
        line-height: 0.9;
        font-weight: 500;
        letter-spacing: -0.05em;
        text-transform: lowercase;
        margin: 8px 0 0;
        color: var(--foreground);
    }
    .dk-doc-hero-hilite {
        color: var(--brand-500, var(--accent));
    }
    :global(.dark) .dk-doc-hero-hilite {
        color: var(--brand-400, var(--accent));
    }
    .dk-doc-hero-end {
        color: var(--muted-foreground);
    }
    .dk-doc-hero-sub {
        margin: 22px 0 0;
        max-width: 640px;
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 16px;
        line-height: 1.55;
        color: var(--muted-foreground);
        letter-spacing: -0.005em;
    }
    .dk-doc-hero-ctas {
        margin-top: 22px;
        display: flex;
        flex-wrap: wrap;
        gap: 0;
        width: fit-content;
        max-width: 100%;
    }
    .dk-doc-hero-ctas > * {
        padding: 9px 14px;
        border: 1px solid var(--border);
        background: var(--background);
        color: var(--foreground);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 13px;
        text-decoration: none;
        position: relative;
        z-index: 1;
        transition:
            background 0.15s,
            border-color 0.15s;
    }
    .dk-doc-hero-ctas > * + * {
        margin-left: -1px;
    }
    .dk-doc-hero-ctas .pri {
        background: var(--brand-500, var(--accent));
        color: var(--background);
        font-weight: 600;
        border-color: var(--brand-500, var(--accent));
    }
    .dk-doc-hero-ctas .pri:hover {
        background: var(--brand-600, var(--accent));
        border-color: var(--brand-600, var(--accent));
    }
    .dk-doc-hero-ctas a:not(.pri):hover {
        background: var(--muted, color-mix(in srgb, var(--foreground) 6%, transparent));
        border-color: var(--muted-foreground);
    }
    @media (max-width: 720px) {
        .dk-doc-hero {
            padding: 28px 18px;
        }
        .dk-doc-hero h1 {
            font-size: clamp(36px, 11vw, 64px);
        }
    }
</style>
