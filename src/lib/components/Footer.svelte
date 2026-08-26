<script lang="ts">
    import { type Snippet } from 'svelte'
    import HeartIcon from '@lucide/svelte/icons/heart'
    import { MotionSpan } from '@humanspeak/svelte-motion'

    const { extra } = $props<{
        extra?: Snippet
    }>()
</script>

<footer
    class="flex items-center justify-center border-t border-border bg-background py-6 text-sm text-foreground"
>
    <div class="mx-auto flex max-w-7xl gap-2 px-4 text-center">
        Made with
        <!-- SVG heart, not the ❤️ emoji: emoji fonts can paint the glyph
             off-center in its advance box (worst in monospace contexts), so
             the scale beat visibly lurches sideways no matter where the
             transform origin sits. A vector glyph's box IS its ink — the
             beat stays centered on every platform. -->
        <MotionSpan
            aria-label="Love"
            animate={{
                scale: [1, 1.2, 1, 1.1, 1]
            }}
            transition={{
                duration: 1.2,
                repeat: Infinity,
                repeatDelay: 0.8,
                ease: 'easeInOut'
            }}
            style="transform-origin: center center;"
            class="inline-block origin-center align-middle leading-none"
        >
            <HeartIcon aria-hidden="true" class="dk-heart-glyph" />
        </MotionSpan>
        by
        <a
            href="https://humanspeak.com"
            target="_blank"
            class="text-brand-500 hover:text-brand-600 hover:underline"
        >
            Humanspeak
        </a>
        {#if extra}
            {@render extra()}
        {/if}
    </div>
</footer>

<style>
    /* Matches the ❤️ emoji this replaces: filled red, sized to the text. */
    footer :global(.dk-heart-glyph) {
        display: block;
        width: 1.1em;
        height: 1.1em;
        fill: #ef4444;
        stroke: #ef4444;
    }
</style>
