<script lang="ts">
    import type { SeoContext } from '../contexts/seo.js'

    const { seo } = $props<{
        seo: SeoContext
    }>()

    const h1 = $derived(seo.h1)
    const isVisible = $derived(h1?.mode === 'visible')
</script>

{#if h1?.title && h1.mode !== 'none'}
    <h1 id={h1.id} class={isVisible ? undefined : 'seo-h1-sr-only'}>{h1.title}</h1>
{/if}

<style>
    .seo-h1-sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }
</style>
