<script lang="ts">
    import { type Snippet } from 'svelte'
    import { type BreadcrumbContext, setBreadcrumbContext } from '../contexts/breadcrumb.js'

    const { children } = $props<{
        children?: Snippet
    }>()

    const breadcrumbs = $state<BreadcrumbContext>({ breadcrumbs: [] })

    setBreadcrumbContext(breadcrumbs)
</script>

{@render children?.()}
