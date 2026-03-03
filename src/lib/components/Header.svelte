<script lang="ts">
    import { resolve } from '$app/paths'
    import { SiGithub, SiNpm } from '@icons-pack/svelte-simple-icons'
    import { ChevronRight, Moon, Sun } from '@lucide/svelte'
    import { motion } from '@humanspeak/svelte-motion'
    import { mode, setMode } from 'mode-watcher'
    import type { DocsKitConfig } from '../config.js'
    import { getBreadcrumbContext } from '../contexts/breadcrumb.js'

    const { config, favicon } = $props<{ config: DocsKitConfig; favicon: string }>()

    const breadcrumbContext = getBreadcrumbContext()

    const changeMode = () => {
        if (mode.current === 'dark') {
            setMode('light')
        } else {
            setMode('dark')
        }
    }

    const breadcrumbs = $derived(breadcrumbContext?.breadcrumbs ?? [])
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
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.1 }}
                />
            </a>
            {#if breadcrumbContext && breadcrumbs.length > 0}
                <nav aria-label="Breadcrumb">
                    <ol class="flex items-center space-x-2 text-sm">
                        {#each breadcrumbs as crumb, index (index)}
                            <li>
                                <ChevronRight class="text-muted-foreground size-3" />
                            </li>
                            <li class="flex items-center">
                                {#if index === breadcrumbs.length - 1 || !crumb.href}
                                    <span
                                        class="text-foreground {crumb.href
                                            ? 'text-muted-foreground'
                                            : 'font-medium'}"
                                        aria-current="page"
                                    >
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
            <motion.button
                onclick={changeMode}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.1 }}
                class="inline-flex size-6 items-center justify-center rounded-full border border-border-muted text-text-muted transition-colors hover:border-border-mid hover:text-text-secondary"
            >
                {#if mode.current === 'dark'}
                    <Sun class="size-3.5 transition-all" />
                {:else}
                    <Moon class="size-3.5 transition-all" />
                {/if}
            </motion.button>

            <a
                href="https://github.com/{config.repo}"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center text-text-muted hover:text-text-secondary"
                aria-label="GitHub"
            >
                <motion.div
                    class="inline-flex size-6 items-center justify-center rounded-full border border-border-muted transition-colors hover:border-border-mid"
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                >
                    <SiGithub class="size-3.5" />
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
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                >
                    <SiNpm class="size-3.5" />
                </motion.div>
            </a>
        </div>
    </header>
</div>
