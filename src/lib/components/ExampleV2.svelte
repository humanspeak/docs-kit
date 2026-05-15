<!--
  @component
  Brutalist-mono example wrapper (v2).

  Drop-in shape-compatible with the v1 `Example` (`title` + `sourceUrl` +
  `exampleUrl` props, slot for the demo). Visual contract:
   - Hairline-bordered panel, no rounded corners.
   - Toolbar reads as `file · <title>` with mono separators and ↗ markers
     for the secondary actions, mirroring the file-path header on the
     homepage drag demo.
   - Bottom strip shows a FIG marker for sheet aesthetic continuity.
-->
<script lang="ts">
    import { MotionA, MotionButton } from '@humanspeak/svelte-motion'
    import ExternalLink from '@lucide/svelte/icons/external-link'
    import LayoutGrid from '@lucide/svelte/icons/layout-grid'
    import RotateCw from '@lucide/svelte/icons/rotate-cw'
    import type { Snippet } from 'svelte'

    const {
        children,
        title,
        sourceUrl,
        exampleUrl
    }: {
        children: Snippet
        title?: string
        sourceUrl?: string
        exampleUrl?: string
    } = $props()

    const sourceHost = $derived.by(() => {
        if (!sourceUrl) return ''
        try {
            const host = new URL(sourceUrl).hostname
                .replace(/^www\./i, '')
                .replace(/^examples\./i, '')
            return host
        } catch {
            return ''
        }
    })

    let refreshId = $state(0)
    const refresh = () => {
        refreshId++
    }

    const tapScale = { scale: 0.96 }
    const hoverScale = { scale: 1.02 }
</script>

<div class="dk-ex-v2">
    <!-- Toolbar -->
    <div class="dk-ex-bar">
        <div class="dk-ex-bar-left">
            <MotionA
                href="/examples"
                whileTap={tapScale}
                whileHover={hoverScale}
                class="dk-ex-ctrl"
                aria-label="All examples"
            >
                <LayoutGrid size={11} />
                <span>examples</span>
            </MotionA>
            <span class="dk-ex-sep">/</span>
            {#if title}
                <span class="dk-ex-title">{title}</span>
            {:else}
                <span class="dk-ex-title muted">live demo</span>
            {/if}
        </div>
        <div class="dk-ex-bar-right">
            {#if exampleUrl}
                <MotionA
                    href={exampleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileTap={tapScale}
                    whileHover={hoverScale}
                    class="dk-ex-ctrl"
                >
                    <ExternalLink size={11} />
                    <span>open</span>
                </MotionA>
            {/if}
            {#if sourceUrl}
                <MotionButton
                    type="button"
                    onclick={() => window.open(sourceUrl, '_blank')}
                    whileTap={tapScale}
                    whileHover={hoverScale}
                    class="dk-ex-ctrl"
                >
                    <span>↗ {sourceHost}</span>
                </MotionButton>
            {/if}
            <MotionButton
                type="button"
                onclick={refresh}
                whileTap={tapScale}
                whileHover={hoverScale}
                class="dk-ex-ctrl square"
                aria-label="Reset demo"
                title="Reset example"
            >
                <RotateCw size={11} />
            </MotionButton>
        </div>
    </div>

    {#if title}
        <h2 class="sr-only">{title}</h2>
    {/if}

    <!-- Stage -->
    <div class="dk-ex-stage">
        {#key refreshId}
            {@render children()}
        {/key}
    </div>

    <!-- Footer strip -->
    <div class="dk-ex-foot">
        <span class="dk-ex-foot-k">FIG · LIVE</span>
        <span class="dk-ex-foot-grow"></span>
        <span class="dk-ex-foot-k">// reset to re-run</span>
    </div>
</div>

<style>
    .dk-ex-v2 {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        border: 1px solid var(--border);
        background: var(--background);
        margin: 1.25rem 0;
    }
    .dk-ex-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 7px 12px;
        border-bottom: 1px solid var(--border);
        background: color-mix(in srgb, var(--card, var(--background)) 60%, transparent);
        font-size: 11px;
    }
    .dk-ex-bar-left {
        flex: 1;
        min-width: 0;
        display: inline-flex;
        align-items: center;
        gap: 8px;
    }
    .dk-ex-bar-right {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
    }
    .dk-ex-sep {
        color: var(--muted-foreground);
    }
    .dk-ex-title {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12px;
        color: var(--foreground);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .dk-ex-title.muted {
        color: var(--muted-foreground);
        text-transform: lowercase;
    }
    .dk-ex-v2 :global(.dk-ex-ctrl) {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 9px;
        border: 1px solid var(--border);
        background: var(--background);
        color: var(--muted-foreground);
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
    .dk-ex-v2 :global(.dk-ex-ctrl:hover) {
        color: var(--foreground);
        border-color: var(--color-brand-500, var(--brand-500, var(--accent)));
    }
    .dk-ex-v2 :global(.dk-ex-ctrl.square) {
        padding: 4px;
        width: 22px;
        height: 22px;
        justify-content: center;
    }
    .dk-ex-stage {
        position: relative;
        padding: 1.5rem;
        min-height: 220px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-image:
            radial-gradient(
                color-mix(in srgb, var(--color-brand-500, var(--brand-500, currentColor)) 12%, transparent) 1px,
                transparent 1px
            ),
            radial-gradient(
                color-mix(in srgb, var(--color-brand-500, var(--brand-500, currentColor)) 6%, transparent) 1px,
                transparent 1px
            );
        background-position:
            0 0,
            16px 16px;
        background-size: 32px 32px;
    }
    .dk-ex-foot {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        border-top: 1px solid var(--border);
        font-size: 10.5px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--muted-foreground);
    }
    .dk-ex-foot-k {
        color: var(--muted-foreground);
    }
    .dk-ex-foot-grow {
        flex: 1;
    }
</style>
