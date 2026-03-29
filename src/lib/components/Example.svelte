<!--
  @component
  Example wrapper with toolbar (refresh, source link, grid background).
  Uses MotionButton/MotionA for hover/tap effects.
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
        const host = new URL(sourceUrl).hostname.replace(/^www\./i, '').replace(/^examples\./i, '')
        return host.charAt(0).toUpperCase() + host.slice(1)
    })

    let refreshId = $state(0)
    const refresh = () => {
        refreshId++
    }

    const tapScale = { scale: 0.95 }
    const hoverScale = { scale: 1.05 }
</script>

<div class="isolate flex h-full w-full flex-1 flex-col">
    <!-- Toolbar -->
    <div class="flex h-12 w-full items-center border-b border-border bg-card/50 px-4">
        <div class="flex flex-1 items-center gap-2">
            <MotionA
                href="/examples"
                whileTap={tapScale}
                whileHover={hoverScale}
                class="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-brand-500/50 hover:text-foreground"
            >
                <LayoutGrid size={12} />
                Examples
            </MotionA>
            {#if title}
                <span class="text-muted-foreground">/</span>
                <span class="text-sm font-medium text-foreground">{title}</span>
            {/if}
        </div>
        <div class="flex items-center gap-2">
            {#if exampleUrl}
                <MotionA
                    href={exampleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileTap={tapScale}
                    whileHover={hoverScale}
                    class="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-brand-500/50 hover:text-foreground"
                >
                    <ExternalLink size={12} />
                    Open
                </MotionA>
            {/if}
            {#if sourceUrl}
                <MotionButton
                    onclick={() => window.open(sourceUrl, '_blank')}
                    whileTap={tapScale}
                    whileHover={hoverScale}
                    class="inline-flex items-center justify-center rounded-md border border-border px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-brand-500/50 hover:text-foreground"
                >
                    {sourceHost}
                </MotionButton>
            {/if}
            <MotionButton
                onclick={refresh}
                whileTap={tapScale}
                whileHover={hoverScale}
                class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-brand-500/50 hover:text-foreground"
                title="Reset example"
            >
                <RotateCw size={12} />
            </MotionButton>
        </div>
    </div>

    {#if title}
        <h1 class="sr-only">{title}</h1>
    {/if}

    <!-- Dotted grid background -->
    <div class="bg-grid-brand pointer-events-none fixed inset-0 top-12 bottom-16 z-0"></div>

    <!-- Content area -->
    <div class="relative z-10 flex flex-1 items-center justify-center p-8">
        {#key refreshId}
            {@render children()}
        {/key}
    </div>
</div>

<style>
    .bg-grid-brand {
        background-image:
            radial-gradient(
                color-mix(in srgb, var(--color-brand-600) 20%, transparent) 1.5px,
                transparent 1.5px
            ),
            radial-gradient(
                color-mix(in srgb, var(--color-brand-600) 10%, transparent) 1.5px,
                transparent 1.5px
            );
        background-position:
            0 0,
            12px 12px;
        background-size: 24px 24px;
        mask-image: linear-gradient(
            to top,
            rgba(0, 0, 0, 1) 0%,
            rgba(0, 0, 0, 0.8) 10%,
            rgba(0, 0, 0, 0) 30%
        );
        -webkit-mask-image: linear-gradient(
            to top,
            rgba(0, 0, 0, 1) 0%,
            rgba(0, 0, 0, 0.8) 10%,
            rgba(0, 0, 0, 0) 30%
        );
    }

    :global(.dark) .bg-grid-brand {
        background-image:
            radial-gradient(
                color-mix(in srgb, var(--color-brand-500) 18%, transparent) 1.5px,
                transparent 1.5px
            ),
            radial-gradient(
                color-mix(in srgb, var(--color-brand-500) 10%, transparent) 1.5px,
                transparent 1.5px
            );
    }
</style>
