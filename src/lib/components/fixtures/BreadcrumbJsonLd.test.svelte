<script lang="ts">
    import { untrack } from 'svelte'
    import type { DocsKitConfig } from '../../config.js'
    import { type BreadcrumbContext, setBreadcrumbContext } from '../../contexts/breadcrumb.js'
    import BreadcrumbJsonLd from '../BreadcrumbJsonLd.svelte'

    const { context, config } = $props<{
        context?: BreadcrumbContext
        config: DocsKitConfig
    }>()

    untrack(() => {
        if (context) setBreadcrumbContext(context)
    })
</script>

<BreadcrumbJsonLd {config} />
