<!--
  @component
  Brutalist-mono code-reference grid (v2).

  Drops into the body of an `ExampleV2` (or anywhere inside a `.brut-wrap`)
  and renders a horizontal grid of code samples — one cell per snippet,
  each with a single header strip carrying `tag · label` on the left and a
  copy-to-clipboard button on the right. Highlighting is consumer-supplied:
  pass each sample's pre-rendered shiki `html` for coloured output; omit it
  and the cell falls back to a plain `<pre><code>` block that still has the
  copy button.

  Designed for sheet sections like:

      FIG-002 / CODE   ·   code reference.

      [ allow-all  Allow All HTML        copy ]
       <code…>
      [ allow-safe Allow Only Safe       copy ]
       <code…>
      [ block-all  Block All HTML        copy ]
       <code…>

  Wiring:

  ```svelte
  <ExampleV2 mode="static" tag="CODE" title={{ accent: 'reference' }}>
    <CodeReferenceV2 samples={[
      { id: 'allow-all', label: 'Allow All HTML', code: '...', lang: 'svelte' },
      { id: 'allow-safe', label: 'Allow Only Safe', code: '...', lang: 'svelte', html: { light, dark } }
    ]} />
  </ExampleV2>
  ```
-->
<script lang="ts">
    import { MotionButton } from '@humanspeak/svelte-motion'
    import CheckIcon from '@lucide/svelte/icons/check'
    import CopyIcon from '@lucide/svelte/icons/copy'

    interface CodeSample {
        /** Stable identifier — surfaces as the small-caps tag on the left of
         *  the header strip. */
        id: string
        /** Display title rendered as the header's `<h3>`. */
        label: string
        /** The raw code text. Used for the copy button and as the plain-text
         *  fallback when `html` is not provided. */
        code: string
        /** Optional language hint. Unused visually now that the lang label
         *  was dropped, but kept on the type so shiki-rendered samples can
         *  carry it for future per-cell decisions. */
        lang?: string
        /** Pre-rendered shiki HTML for light + dark themes. When omitted, the
         *  cell renders a plain `<pre><code>` block. */
        html?: { light: string; dark: string }
    }

    interface Props {
        samples: CodeSample[]
        /** Columns at desktop width. Default `auto`, which uses the number of
         *  samples up to 3 (so 1 sample = 1 col, 4 samples = still 3 cols
         *  wrapping). Pass an integer to force a specific column count. */
        columns?: number | 'auto'
    }

    const { samples, columns = 'auto' }: Props = $props()

    const colCount = $derived(
        columns === 'auto' ? Math.min(samples.length, 3) : Math.max(1, columns)
    )

    // Track which cell most recently completed a successful copy so we can
    // swap the icon to a check and reset after 1.6s. Keyed by sample id so
    // multiple cells can show "copied" independently if the user clicks
    // through them quickly.
    let copiedId = $state<string | null>(null)
    let copyResetTimer: ReturnType<typeof setTimeout> | null = null

    const copy = async (sample: CodeSample) => {
        if (typeof navigator === 'undefined' || !navigator.clipboard) return
        try {
            await navigator.clipboard.writeText(sample.code)
            copiedId = sample.id
            if (copyResetTimer) clearTimeout(copyResetTimer)
            copyResetTimer = setTimeout(() => {
                copiedId = null
                copyResetTimer = null
            }, 1600)
        } catch {
            /* clipboard blocked — fail quiet, the user can select + copy */
        }
    }

    const tapScale = { scale: 0.94 }
    const hoverScale = { scale: 1.05 }
</script>

<div class="dk-coderef" style="--dk-coderef-cols: {colCount}">
    {#each samples as sample (sample.id)}
        <article class="dk-coderef-cell">
            <header class="dk-coderef-head">
                <div class="dk-coderef-meta">
                    <span class="dk-coderef-tag">{sample.id}</span>
                    <h3>{sample.label}</h3>
                </div>
                <MotionButton
                    type="button"
                    class="dk-coderef-copy"
                    aria-label="Copy {sample.label} snippet"
                    onclick={() => copy(sample)}
                    whileTap={tapScale}
                    whileHover={hoverScale}
                >
                    {#if copiedId === sample.id}
                        <CheckIcon size={11} />
                        <span>copied</span>
                    {:else}
                        <CopyIcon size={11} />
                        <span>copy</span>
                    {/if}
                </MotionButton>
            </header>
            <div class="dk-coderef-code">
                {#if sample.html}
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -- shiki-rendered HTML supplied by the consumer; treat as trusted input -->
                    <div class="shiki-light">{@html sample.html.light}</div>
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -- shiki-rendered HTML supplied by the consumer; treat as trusted input -->
                    <div class="shiki-dark">{@html sample.html.dark}</div>
                {:else}
                    <pre><code>{sample.code}</code></pre>
                {/if}
            </div>
        </article>
    {/each}
</div>

<style>
    .dk-coderef {
        display: grid;
        grid-template-columns: repeat(var(--dk-coderef-cols, 3), 1fr);
        gap: 0;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
    }
    .dk-coderef-cell {
        border-right: 1px solid var(--brut-rule);
        display: flex;
        flex-direction: column;
        min-width: 0;
        background: var(--brut-bg);
    }
    .dk-coderef-cell:last-child {
        border-right: 0;
    }

    /* ── Single header strip — tag / label / copy ─────────────────── */
    .dk-coderef-head {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        border-bottom: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
    }
    .dk-coderef-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
        flex: 1;
    }
    .dk-coderef-tag {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--brut-ink-3);
    }
    .dk-coderef-head h3 {
        margin: 0;
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: var(--brut-ink);
        letter-spacing: -0.01em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .dk-coderef :global(.dk-coderef-copy) {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 9px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        color: var(--brut-ink-2);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10.5px;
        text-transform: lowercase;
        letter-spacing: 0;
        cursor: pointer;
        flex-shrink: 0;
        transition:
            color 0.15s,
            border-color 0.15s,
            background 0.15s;
    }
    .dk-coderef :global(.dk-coderef-copy:hover) {
        color: var(--brut-accent);
        border-color: var(--brut-accent);
    }

    /* ── Code area — fills the cell so the scrollbar sits flush ───── */
    .dk-coderef-code {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        position: relative;
    }
    /* Each shiki variant + the fallback `<pre>` need to stretch to the
       full cell height so a sample shorter than its neighbours doesn't
       leave a weird blank strip below the code (and so the horizontal
       scrollbar — when present — lands at the bottom of the cell, not
       floating in the middle of the box). */
    .dk-coderef :global(.shiki-light),
    .dk-coderef :global(.shiki-dark) {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        width: 100%;
    }
    .dk-coderef :global(.dk-coderef-code pre),
    .dk-coderef :global(.shiki-light pre),
    .dk-coderef :global(.shiki-dark pre) {
        flex: 1;
        margin: 0;
        padding: 14px 16px;
        background: var(--brut-bg) !important;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11.5px;
        line-height: 1.65;
        color: var(--brut-ink);
        overflow-x: auto;
        overflow-y: hidden;
        white-space: pre;
        border-radius: 0;
    }
    .dk-coderef :global(.dk-coderef-code pre code) {
        font-family: inherit;
        background: transparent;
    }

    /* Light/dark switching for shiki-rendered samples. Prose.css scopes
       its toggle to `.prose`, so we re-state it here on the grid root to
       make the component usable outside any prose container. */
    :global(html:not(.dark)) .dk-coderef :global(.shiki-dark) {
        display: none;
    }
    :global(html.dark) .dk-coderef :global(.shiki-light) {
        display: none;
    }

    @media (max-width: 1024px) {
        .dk-coderef {
            grid-template-columns: 1fr;
        }
        .dk-coderef-cell {
            border-right: 0;
            border-bottom: 1px solid var(--brut-rule);
        }
        .dk-coderef-cell:last-child {
            border-bottom: 0;
        }
    }
</style>
