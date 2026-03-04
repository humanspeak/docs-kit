<script lang="ts">
    import { resolve } from '$app/paths'
    import { motion } from '@humanspeak/svelte-motion'
    import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
    import type { DocsKitConfig } from '../config.js'
    import { getBreadcrumbContext } from '../contexts/breadcrumb.js'
    import GitHubIcon from './icons/GitHubIcon.svelte'
    import NpmIcon from './icons/NpmIcon.svelte'
    import ThemeToggle from './ThemeToggle.svelte'

    const { config, favicon } = $props<{ config: DocsKitConfig; favicon: string }>()

    const breadcrumbContext = getBreadcrumbContext()

    const EMPTY_BREADCRUMBS: readonly import('../contexts/breadcrumb.js').Breadcrumb[] = []
    const breadcrumbs = $derived(breadcrumbContext?.breadcrumbs ?? EMPTY_BREADCRUMBS)

    const tapScale = { scale: 0.9 }
    const hoverScaleLogo = { scale: 1.1 }
    const hoverScaleIcon = { scale: 1.05 }
</script>

<div>
    <header
        class="flex items-center justify-between border-b border-border bg-background px-6 py-4 text-foreground"
    >
        <div class="flex items-center gap-2">
            <a
                href={resolve('/')}
                aria-label="Home"
                class="inline-flex items-center justify-center"
            >
                <motion.img
                    src={favicon}
                    alt="logo"
                    class="h-6 w-6 rounded-md"
                    whileTap={tapScale}
                    whileHover={hoverScaleLogo}
                />
            </a>
            {#if breadcrumbContext && breadcrumbs.length > 0}
                <nav aria-label="Breadcrumb">
                    <ol class="flex items-center space-x-2 text-sm">
                        {#each breadcrumbs as crumb, index (index)}
                            <li>
                                <ChevronRightIcon class="text-muted-foreground" size={12} />
                            </li>
                            <li class="flex items-center">
                                {#if index === breadcrumbs.length - 1}
                                    <span
                                        class="font-medium text-foreground"
                                        aria-current="page"
                                    >
                                        {crumb.title}
                                    </span>
                                {:else if !crumb.href}
                                    <span class="text-muted-foreground">
                                        {crumb.title}
                                    </span>
                                {:else}
                                    <a
                                        href={crumb.href}
                                        class="text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        {crumb.title}
                                    </a>
                                {/if}
                            </li>
                        {/each}
                    </ol>
                </nav>
            {/if}
        </div>
        <div class="flex items-center gap-4">
            <ThemeToggle />

            <a
                href="https://github.com/{config.repo}"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center text-text-muted hover:text-text-secondary"
                aria-label="GitHub"
            >
                <motion.div
                    class="inline-flex size-6 items-center justify-center rounded-full border border-border-muted transition-colors hover:border-border-mid"
                    whileTap={tapScale}
                    whileHover={hoverScaleIcon}
                >
                    <GitHubIcon class="size-3.5" />
                </motion.div>
            </a>
            <a
                href="https://www.npmjs.com/package/{config.npmPackage}"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center text-text-muted hover:text-text-secondary"
                aria-label="NPM"
            >
                <motion.div
                    class="inline-flex size-6 items-center justify-center rounded-full border border-border-muted transition-colors hover:border-border-mid"
                    whileTap={tapScale}
                    whileHover={hoverScaleIcon}
                >
                    <NpmIcon class="size-3.5" />
                </motion.div>
            </a>
        </div>
    </header>
</div>
