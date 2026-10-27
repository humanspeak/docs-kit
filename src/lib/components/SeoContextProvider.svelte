<script lang="ts">
    import { type Snippet, untrack } from 'svelte'
    import { type SeoContext, setSeoContext } from '../contexts/seo.js'

    const { seo, children }: {
        seo: SeoContext
        children?: Snippet
    } = $props()

    setSeoContext(untrack(() => seo))
</script>

{@render children?.()}
