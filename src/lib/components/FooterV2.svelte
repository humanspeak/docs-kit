<script lang="ts">
    import { type Snippet } from 'svelte'
    import { MotionSpan } from '@humanspeak/svelte-motion'

    /**
     * Brutalist-mono footer (v2).
     *
     * Drop-in compatible with the v1 `Footer` (`extra` snippet still supported)
     * but adds optional `license` and `version` metadata fields plus a built-in
     * back-to-top anchor. Layout collapses to a single centred row on narrow
     * viewports.
     */
    const {
        extra,
        license = 'MIT',
        version,
        year = new Date().getFullYear()
    } = $props<{
        extra?: Snippet
        license?: string
        version?: string
        year?: number
    }>()
</script>

<footer
    class="dk-footer-v2 border-t border-border bg-background text-foreground"
>
    <div class="dk-footer-grid">
        <div class="dk-footer-cell dk-footer-meta">
            <span>{license}</span>
            {#if version}
                <span class="dk-footer-sep" aria-hidden="true">·</span>
                <span>v{version}</span>
            {/if}
            <span class="dk-footer-sep" aria-hidden="true">·</span>
            <span>{year}</span>
        </div>
        <div class="dk-footer-cell dk-footer-mid">
            <span>made with</span>
            <MotionSpan
                aria-label="Love"
                animate={{ scale: [1, 1.2, 1, 1.1, 1] }}
                transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    repeatDelay: 0.8,
                    ease: 'easeInOut'
                }}
                style="transform-origin: center center; display: inline-block;"
                class="dk-footer-heart"
            >
                &#10084;&#65039;
            </MotionSpan>
            <span>by</span>
            <a
                href="https://humanspeak.com"
                target="_blank"
                rel="noopener noreferrer"
                class="dk-footer-brand"
            >
                humanspeak
            </a>
            {#if extra}
                <span class="dk-footer-sep" aria-hidden="true">·</span>
                {@render extra()}
            {/if}
        </div>
        <div class="dk-footer-cell dk-footer-end">
            <a href="#top" class="dk-footer-top">↩ to top</a>
        </div>
    </div>
</footer>

<style>
    .dk-footer-v2 {
        font-family:
            'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        letter-spacing: 0.06em;
    }
    .dk-footer-grid {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 16px;
        padding: 14px 24px;
        text-transform: lowercase;
    }
    .dk-footer-cell {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--color-text-muted, rgba(127, 127, 127, 0.9));
    }
    .dk-footer-meta {
        justify-content: flex-start;
    }
    .dk-footer-mid {
        justify-content: center;
        text-align: center;
        flex-wrap: wrap;
    }
    .dk-footer-end {
        justify-content: flex-end;
    }
    .dk-footer-sep {
        color: var(--color-text-muted, rgba(127, 127, 127, 0.6));
    }
    :global(.dk-footer-heart) {
        line-height: 1;
    }
    .dk-footer-brand {
        color: var(--color-brand-500, #54dbbc);
        text-decoration: none;
        font-weight: 500;
        transition: color 0.15s;
    }
    .dk-footer-brand:hover {
        color: var(--color-brand-600, #3aa088);
        text-decoration: underline;
    }
    .dk-footer-top {
        color: var(--color-text-muted, rgba(127, 127, 127, 0.9));
        text-decoration: none;
        transition: color 0.15s;
    }
    .dk-footer-top:hover {
        color: var(--color-text, currentColor);
    }
    @media (max-width: 640px) {
        .dk-footer-grid {
            grid-template-columns: 1fr;
            text-align: center;
            gap: 6px;
        }
        .dk-footer-meta,
        .dk-footer-mid,
        .dk-footer-end {
            justify-content: center;
        }
    }
</style>
