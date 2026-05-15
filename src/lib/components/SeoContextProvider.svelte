<script lang="ts">
    import { type Snippet, untrack } from 'svelte'
    import { type SeoContext, setSeoContext } from '../contexts/seo.js'

    const { seo, children } = $props<{
        seo: SeoContext
        children?: Snippet
    }>()

    setSeoContext(untrack(() => seo))
</script>

{@render children?.()}
