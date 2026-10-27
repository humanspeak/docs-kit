<script lang="ts">
    import { type Snippet } from 'svelte'
    import { type BreadcrumbContext, setBreadcrumbContext } from '../contexts/breadcrumb.js'

    const { children }: {
        children?: Snippet
    } = $props()

    const breadcrumbs = $state<BreadcrumbContext>({ breadcrumbs: [] })

    setBreadcrumbContext(breadcrumbs)
</script>

{@render children?.()}
