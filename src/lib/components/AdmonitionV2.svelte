<!--
  @component
  Brutalist-mono admonition / callout (v2).

  Drop-in shape-compatible with v1 `Admonition` (`type` + `title` props).
  Visual contract:
   - Hairline border on all four sides, no rounded corners.
   - Accent-coloured strip down the left edge (4px), themed by variant.
   - Mono "FIG / <TYPE>" label in the top corner, accent-coloured.
   - Title in mono uppercase; body inherits prose styles from context.
-->
<script lang="ts">
    import type { Snippet } from 'svelte'
    import { CircleX, TriangleAlert, CircleCheck, StickyNote, Info } from '@lucide/svelte'

    type Variant = 'info' | 'note' | 'warning' | 'error' | 'success'

    type Props = {
        type?: Variant
        title?: string
        children?: Snippet
    }

    const { type = 'info', title = '', children }: Props = $props()

    const ariaRole: string =
        type === 'error' ? 'alert' : type === 'info' || type === 'note' ? 'note' : 'status'

    const tag: Record<Variant, string> = {
        info: 'INFO',
        note: 'NOTE',
        warning: 'WARNING',
        error: 'ERROR',
        success: 'SUCCESS'
    }
</script>

<aside class="dk-admon-v2" data-type={type} role={ariaRole}>
    <div class="dk-admon-rail" aria-hidden="true"></div>
    <div class="dk-admon-head">
        <span class="dk-admon-fig">FIG · {tag[type]}</span>
    </div>
    <div class="dk-admon-row">
        <div class="dk-admon-icon" aria-hidden="true">
            {#if type === 'error'}
                <CircleX class="size-4" />
            {:else if type === 'warning'}
                <TriangleAlert class="size-4" />
            {:else if type === 'success'}
                <CircleCheck class="size-4" />
            {:else if type === 'note'}
                <StickyNote class="size-4" />
            {:else}
                <Info class="size-4" />
            {/if}
        </div>
        <div class="dk-admon-body">
            {#if title}
                <div class="dk-admon-title">{title}</div>
            {/if}
            <div class="dk-admon-content">
                {@render children?.()}
            </div>
        </div>
    </div>
</aside>

<style>
    .dk-admon-v2 {
        position: relative;
        margin: 1rem 0;
        padding: 0.5rem 1rem 0.75rem 1.25rem;
        border: 1px solid var(--border);
        background: var(--card, var(--background));
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
    }
    .dk-admon-rail {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
    }
    .dk-admon-head {
        margin-bottom: 0.35rem;
    }
    .dk-admon-fig {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10.5px;
        letter-spacing: 0.14em;
        color: var(--muted-foreground);
    }
    .dk-admon-row {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
    }
    .dk-admon-icon {
        flex: none;
        margin-top: 0.1rem;
        line-height: 1;
    }
    .dk-admon-title {
        font-weight: 600;
        margin-bottom: 0.2rem;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 13px;
        letter-spacing: -0.005em;
        color: var(--foreground);
    }
    .dk-admon-content {
        font-size: 14px;
        line-height: 1.55;
        color: var(--foreground);
    }
    .dk-admon-content :global(p:first-child) {
        margin-top: 0;
    }
    .dk-admon-content :global(p:last-child) {
        margin-bottom: 0;
    }

    /* Variant rails + accents */
    .dk-admon-v2[data-type='info'] .dk-admon-rail {
        background: var(--brand-500, #2563eb);
    }
    .dk-admon-v2[data-type='info'] .dk-admon-icon,
    .dk-admon-v2[data-type='info'] .dk-admon-fig {
        color: var(--brand-500, #2563eb);
    }
    .dk-admon-v2[data-type='note'] .dk-admon-rail {
        background: var(--muted-foreground);
    }
    .dk-admon-v2[data-type='note'] .dk-admon-icon {
        color: var(--muted-foreground);
    }
    .dk-admon-v2[data-type='warning'] .dk-admon-rail {
        background: var(--admonition-warning, #f59e0b);
    }
    .dk-admon-v2[data-type='warning'] .dk-admon-icon,
    .dk-admon-v2[data-type='warning'] .dk-admon-fig {
        color: var(--admonition-warning, #f59e0b);
    }
    .dk-admon-v2[data-type='error'] .dk-admon-rail {
        background: var(--admonition-error, #ef4444);
    }
    .dk-admon-v2[data-type='error'] .dk-admon-icon,
    .dk-admon-v2[data-type='error'] .dk-admon-fig {
        color: var(--admonition-error, #ef4444);
    }
    .dk-admon-v2[data-type='success'] .dk-admon-rail {
        background: var(--admonition-success, #22c55e);
    }
    .dk-admon-v2[data-type='success'] .dk-admon-icon,
    .dk-admon-v2[data-type='success'] .dk-admon-fig {
        color: var(--admonition-success, #22c55e);
    }
</style>
