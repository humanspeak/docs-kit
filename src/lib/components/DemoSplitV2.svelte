<!--
  @component
  Brutalist-mono two-pane split for live demos (v2).

  Mirrors the home-page streaming + playground pattern: a single bordered
  region (the surrounding `ExampleV2` panel provides the outer border)
  divided down the middle by a hairline, with a small-caps mono label
  above each pane. Both panes scroll independently; on narrow viewports
  the split stacks vertically.

  Drop this inside an `ExampleV2`'s body — `ExampleV2` owns the bar + foot
  chrome, this component just owns the body's interior layout.

  Wiring:

  ```svelte
  <DemoSplitV2 leftLabel="EDITOR / MARKDOWN" rightLabel="PREVIEW / RENDERED">
      {#snippet left()}
          <textarea bind:value={source}></textarea>
      {/snippet}
      {#snippet right()}
          <SvelteMarkdown {source} />
      {/snippet}
  </DemoSplitV2>
  ```
-->
<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        /** Left-pane content. Sits below `leftLabel` and scrolls
         *  independently of the right pane. */
        left: Snippet
        /** Right-pane content. Same scroll independence. */
        right: Snippet
        /** Optional small-caps mono label above the left pane. Convention
         *  is `<KIND> / <TONE>` — e.g. `SRC / STREAMING`, `EDITOR / MARKDOWN`. */
        leftLabel?: string
        /** Optional small-caps mono label above the right pane. */
        rightLabel?: string
        /** Explicit minimum height for the split region. Default `420px`
         *  matches the streaming-demo height on the homepage. Pass `auto`
         *  to let content decide. */
        minHeight?: string
        /** Mark the right pane as the "output" — currently a hook for
         *  consumers that want their prose styles to target the rendered
         *  half via `.dk-demo-split .pane.out`. Default `true` because
         *  most demos render preview output on the right. */
        outputOnRight?: boolean
        /** Optional small-caps tone applied to both labels' second segment
         *  via a trailing `<span>`. Lets the consumer pick a per-demo
         *  accent (e.g. `streaming`, `rendered`, `markdown`) shown in muted
         *  ink after the kind. */
        leftTone?: string
        rightTone?: string
    }

    const {
        left,
        right,
        leftLabel,
        rightLabel,
        leftTone,
        rightTone,
        minHeight = '420px',
        outputOnRight = true
    }: Props = $props()
</script>

<div class="dk-demo-split" style="--dk-demo-split-min-h: {minHeight}">
    <div class="pane">
        {#if leftLabel}
            <header class="pane-bar">
                <span class="pane-bar-kind">{leftLabel}</span>
                {#if leftTone}
                    <span class="pane-bar-sep" aria-hidden="true">·</span>
                    <span class="pane-bar-tone">{leftTone}</span>
                {/if}
            </header>
        {/if}
        <div class="pane-body">
            {@render left()}
        </div>
    </div>
    <div class="pane" class:out={outputOnRight}>
        {#if rightLabel}
            <header class="pane-bar">
                <span class="pane-bar-kind">{rightLabel}</span>
                {#if rightTone}
                    <span class="pane-bar-sep" aria-hidden="true">·</span>
                    <span class="pane-bar-tone">{rightTone}</span>
                {/if}
            </header>
        {/if}
        <div class="pane-body">
            {@render right()}
        </div>
    </div>
</div>

<style>
    .dk-demo-split {
        display: grid;
        grid-template-columns: 1fr 1fr;
        min-height: var(--dk-demo-split-min-h, 420px);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
    }
    .pane {
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 0;
    }
    .pane + .pane {
        border-left: 1px solid var(--brut-rule, rgba(127, 127, 127, 0.22));
    }

    /* Each pane carries its own thin header strip — same chrome vocabulary
       as `dk-ex-bar` so the demo reads as one coherent document. The strip
       has its own hairline bottom, a subtle bg-2 surface, and the small-caps
       mono label cells we use everywhere else in the brut theme. */
    .pane-bar {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border-bottom: 1px solid var(--brut-rule, rgba(127, 127, 127, 0.22));
        background: var(--brut-bg-2, rgba(127, 127, 127, 0.05));
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10.5px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--brut-ink-3, rgba(127, 127, 127, 0.9));
        white-space: nowrap;
    }
    .pane-bar-kind {
        color: var(--brut-ink-3, rgba(127, 127, 127, 0.9));
    }
    .pane-bar-sep {
        color: var(--brut-ink-3, rgba(127, 127, 127, 0.6));
    }
    .pane-bar-tone {
        color: var(--brut-accent, var(--color-brand-500, #54dbbc));
    }

    .pane-body {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        padding: 16px 18px;
        overflow: auto;
    }
    /* Most demos drop a single child (textarea, SvelteMarkdown, etc.) into
       the body — make it expand naturally so the pane scrolls only when
       content overflows. */
    .pane-body > :global(*) {
        flex: 1;
        min-height: 0;
    }

    /* Stack vertically below the inline-split breakpoint — matches the
       home page's responsive collapse so demos read sensibly on phones. */
    @media (max-width: 1024px) {
        .dk-demo-split {
            grid-template-columns: 1fr;
        }
        .pane + .pane {
            border-left: 0;
            border-top: 1px solid var(--brut-rule, rgba(127, 127, 127, 0.22));
        }
    }
</style>
