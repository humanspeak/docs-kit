<script lang="ts">
    import { type Snippet } from 'svelte'
    import { type SeoContext, setSeoContext } from '../contexts/seo.js'

    const { seo, children } = $props<{
        seo: SeoContext
        children?: Snippet
    }>()

    setSeoContext(seo)
</script>

{@render children?.()}
