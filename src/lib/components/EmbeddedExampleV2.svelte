<!--
  @component
  Embedded brutalist-mono example panel — the slim cousin of `ExampleV2`.

  Designed for inlining a live demo inside a doc page (markdown/MDsveX),
  where the surrounding prose carries the narrative and the panel only
  needs to host the interaction. Reuses ExampleV2's visual language
  (hairline-bordered card, mono bar with `mode · live` / running dot /
  reset pill) but drops the figure-id kicker, accent headline,
  description, notes, footer key/value strip, and code-toggle reveal —
  none of which belong in inline doc content.

  Wiring:

  ```svelte
  <EmbeddedExampleV2
      exampleUrl="/examples/my-hook"
      sourceUrl="https://github.com/.../MyHook.svelte"
      filename="MyHook.svelte"
  >
      <MyHookDemo />
  </EmbeddedExampleV2>
  ```

  When the consumer wants a separate full-page example for the same demo
  (the usual pattern), `exampleUrl` becomes the bar's `↗ open` link — same
  shape as ExampleV2's `↗ source` link but pointing back at the standalone
  example route.
-->
<script lang="ts">
    import { MotionA, MotionButton, MotionSpan } from '@humanspeak/svelte-motion'
    import ExternalLink from '@lucide/svelte/icons/external-link'
    import RotateCw from '@lucide/svelte/icons/rotate-cw'
    import type { Snippet } from 'svelte'

    interface BarCell {
        /** Label rendered in muted ink (e.g. `file`, `pattern`, `theme`). */
        k: string
        /** Value rendered in normal ink (e.g. `playground.svelte`). */
        v: string
    }

    interface Props {
        /** The demo — claims the panel body. */
        children: Snippet
        /** URL of the standalone example route this embed belongs to.
         *  Surfaces as `↗ open` in the panel bar. Omit when the embed is
         *  the only place this demo lives. */
        exampleUrl?: string
        /** Source file URL on GitHub (or other). Surfaces as `↗ source`. */
        sourceUrl?: string | null
        /** Filename rendered as `file · <name>` in the bar's left side.
         *  Auto-derived from `sourceUrl`'s final path segment when omitted.
         *  Ignored when `barCells` is provided — the consumer is opting
         *  out of the automatic file label entirely. */
        filename?: string
        /** Custom left-side cells for the panel bar. When provided, replaces
         *  the auto `file · <name>` cell entirely. */
        barCells?: BarCell[]
        /** Panel mode. `'live'` (default) shows the running dot in the
         *  bar and a reset button; `'static'` is for non-interactive
         *  embeds. Pass a string for a custom label (`mode · <value>`). */
        mode?: 'live' | 'static' | (string & {})
        /** Optional `aria-label` for the surrounding `<section>`. */
        label?: string
    }

    const {
        children,
        exampleUrl,
        sourceUrl,
        filename,
        barCells,
        mode = 'live',
        label
    }: Props = $props()

    const isLive = $derived(mode === 'live')

    const derivedFilename = $derived.by(() => {
        if (filename) return filename
        if (!sourceUrl) return ''
        try {
            const path = new URL(sourceUrl).pathname
            return path.split('/').filter(Boolean).pop() ?? ''
        } catch {
            return ''
        }
    })

    let refreshId = $state(0)
    let refreshSpinKey = $state(0)
    const refresh = () => {
        refreshId++
        refreshSpinKey++
    }

    const tapScale = { scale: 0.96 }
    const hoverScale = { scale: 1.02 }
</script>

<section class="dk-em" aria-label={label}>
    <div class="dk-em-bar">
        {#if barCells && barCells.length}
            {#each barCells as cell, i (i)}
                <span class="dk-em-cell">
                    <span class="lbl">{cell.k}</span> ·
                    <span class="v">{cell.v}</span>
                </span>
            {/each}
        {:else if derivedFilename}
            <span class="dk-em-cell">
                <span class="lbl">file</span> ·
                <span class="v">{derivedFilename}</span>
            </span>
        {/if}
        <span class="dk-em-cell">
            <span class="lbl">mode</span> ·
            <span class="v">{mode}</span>
        </span>
        {#if isLive}
            <span class="dk-em-cell live">
                <span class="dot"></span>
                <span class="v">running</span>
            </span>
        {/if}
        <span class="dk-em-grow"></span>
        {#if exampleUrl}
            <MotionA
                href={exampleUrl}
                whileTap={tapScale}
                whileHover={hoverScale}
                class="dk-em-ctrl"
                aria-label="Open example in a new page"
            >
                <ExternalLink size={11} />
                <span>open</span>
            </MotionA>
        {/if}
        {#if sourceUrl}
            <MotionA
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileTap={tapScale}
                whileHover={hoverScale}
                class="dk-em-ctrl"
            >
                <ExternalLink size={11} />
                <span>source</span>
            </MotionA>
        {/if}
        {#if isLive}
            <MotionButton
                type="button"
                onclick={refresh}
                whileTap={tapScale}
                whileHover={hoverScale}
                class="dk-em-ctrl"
                aria-label="Reset demo"
                title="Reset example"
            >
                {#key refreshSpinKey}
                    <MotionSpan
                        class="dk-em-reset-icon"
                        initial={{ rotate: 0 }}
                        animate={{ rotate: refreshSpinKey === 0 ? 0 : 360 }}
                        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <RotateCw size={11} />
                    </MotionSpan>
                {/key}
                <span>reset</span>
            </MotionButton>
        {/if}
    </div>

    <div class="dk-em-body">
        {#key refreshId}
            {@render children()}
        {/key}
    </div>
</section>

<style>
    /* Hairline-bordered card — same panel structure ExampleV2 uses, just
       without the lede column wrapped around it.

       Unlike ExampleV2 (which lives inside an `ExampleLayoutV2` /
       `BrutLayoutV2` ancestor that injects `--brut-*` tokens via
       `brutalist.css`), this component is designed to be dropped inline
       into a docs page where no brut wrapper exists. So it carries its
       own local copy of the brut surface tokens — values mirror
       `brutalist.css` exactly so the embed and the standalone example
       page look identical. Consumers who *do* wrap us in `.brut` /
       `.brut-wrap` still get the parent's tokens via cascade. */
    .dk-em {
        --brut-bg: #f8fcfb;
        --brut-bg-2: #eef4f1;
        --brut-ink: #0a0a0a;
        --brut-ink-2: #525252;
        --brut-ink-3: #9a9a9a;
        --brut-rule: #d6dedb;
        --brut-rule-2: #bbc4c0;
        --brut-accent: #247768;
        --brut-accent-hover: #1b5a4e;
        --brut-accent-ink: #f8fcfb;
        --brut-accent-soft: rgba(36, 119, 104, 0.1);

        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        color: var(--brut-ink);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        display: flex;
        flex-direction: column;
        min-width: 0;
        margin: 24px 0;
    }

    :global(html.dark) .dk-em {
        --brut-bg: #06090a;
        --brut-bg-2: #0d1110;
        --brut-ink: #ededed;
        --brut-ink-2: #9a9a9a;
        --brut-ink-3: #5a5a5a;
        --brut-rule: #1c2422;
        --brut-rule-2: #2a332f;
        --brut-accent: #54dbbc;
        --brut-accent-hover: #7fe9d1;
        --brut-accent-ink: #06090a;
        --brut-accent-soft: rgba(84, 219, 188, 0.14);
    }

    /* Top bar — file path / mode chip / running dot / actions. */
    .dk-em-bar {
        display: flex;
        align-items: center;
        gap: 18px;
        padding: 8px 14px;
        border-bottom: 1px solid var(--brut-rule);
        font-size: 11px;
        color: var(--brut-ink-2);
        background: var(--brut-bg-2);
        flex-wrap: wrap;
    }
    .dk-em-cell {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
    }
    .dk-em-cell .lbl {
        color: var(--brut-ink-3);
    }
    .dk-em-cell .v {
        color: var(--brut-ink);
    }
    .dk-em-cell.live {
        color: var(--brut-accent);
    }
    .dk-em-cell.live .v {
        color: var(--brut-accent);
    }
    .dk-em-cell.live .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--brut-accent);
        box-shadow: 0 0 0 0 var(--brut-accent);
        animation: dk-em-pulse 1.6s ease-out infinite;
        flex-shrink: 0;
    }
    @keyframes dk-em-pulse {
        0% {
            box-shadow: 0 0 0 0 color-mix(in srgb, var(--brut-accent) 60%, transparent);
        }
        80%,
        100% {
            box-shadow: 0 0 0 6px color-mix(in srgb, var(--brut-accent) 0%, transparent);
        }
    }
    .dk-em-grow {
        flex: 1;
    }

    /* Action chips — match ExampleV2's `.dk-ex-ctrl` exactly so the two
       components feel like one design language. Exposed via :global so
       the MotionA/MotionButton class prop reaches them through the slot. */
    .dk-em :global(.dk-em-ctrl) {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 9px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        color: var(--brut-ink-2);
        font-family: inherit;
        font-size: 11px;
        text-decoration: none;
        cursor: pointer;
        text-transform: lowercase;
        transition:
            background 0.15s,
            border-color 0.15s,
            color 0.15s;
    }
    .dk-em :global(.dk-em-ctrl:hover) {
        color: var(--brut-accent);
        border-color: var(--brut-accent);
    }
    .dk-em :global(.dk-em-reset-icon) {
        display: inline-flex;
        transform-origin: center;
    }

    /* Body — the demo claims the panel. */
    .dk-em-body {
        position: relative;
        min-height: 0;
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
    }
    :global(.dk-em-body > *) {
        flex: 1 1 auto;
        min-width: 0;
    }

    @media (max-width: 720px) {
        .dk-em-bar {
            padding-left: 12px;
            padding-right: 12px;
        }
    }
</style>
