<!--
  Shared sidebar navigation component for Humanspeak docs sites.
  Collapsible sections with spring animations, active-state highlighting, and external link support.
-->
<script lang="ts">
    import { motion } from '@humanspeak/svelte-motion'
    import ArrowRight from '@lucide/svelte/icons/arrow-right'
    import ChevronDown from '@lucide/svelte/icons/chevron-down'
    import ExternalLink from '@lucide/svelte/icons/external-link'
    import Heart from '@lucide/svelte/icons/heart'
    import { PersistedState } from 'runed'
    import { slide } from 'svelte/transition'
    import type { DocsKitConfig } from '../config.js'
    import type { NavItem, NavSection } from '../types/nav.js'
    import { isActivePath } from '../utils/nav.js'

    const defaultLoveAndRespect: NavItem[] = [
        { title: 'Beye.ai', href: 'https://beye.ai', icon: Heart, external: true }
    ]

    const hoverScale = { scale: 1.25 }
    const hoverShift = { x: 2 }
    const springFast = { type: 'spring' as const, stiffness: 500, damping: 15 }
    const springSoft = { type: 'spring' as const, stiffness: 400, damping: 25 }

    const {
        config,
        sections,
        currentPath,
        otherProjects = [],
        loveAndRespect = defaultLoveAndRespect
    }: {
        config: DocsKitConfig
        sections: NavSection[]
        currentPath: string
        otherProjects?: NavItem[]
        loveAndRespect?: NavItem[]
    } = $props()

    const openSections = new PersistedState<Record<string, boolean>>(
        `${config.slug}-sidebar-sections`,
        {}
    )

    // Ensure items in built-in sections have Heart icons as defaults
    // (otherProjects come from server data and can't carry component references)
    const withDefaultIcon = (items: NavItem[], defaultIcon: typeof Heart): NavItem[] =>
        items.map((item) => (item.icon ? item : { ...item, icon: defaultIcon }))

    const navigation: NavSection[] = $derived([
        ...sections,
        ...(loveAndRespect.length > 0
            ? [
                  {
                      title: 'Love and Respect',
                      icon: Heart,
                      items: withDefaultIcon(loveAndRespect, Heart)
                  }
              ]
            : []),
        ...(otherProjects.length > 0
            ? [
                  {
                      title: 'Other Projects',
                      icon: Heart,
                      items: withDefaultIcon(otherProjects, Heart)
                  }
              ]
            : [])
    ])

    const isSectionOpen = (section: NavSection): boolean => {
        if (section.title in openSections.current) return openSections.current[section.title]
        return true
    }

    const toggleSection = (section: NavSection) => {
        openSections.current = {
            ...openSections.current,
            [section.title]: !isSectionOpen(section)
        }
    }
</script>

<nav class="p-2">
    <div class="space-y-2">
        {#each navigation as section (section.title)}
            <div>
                <button
                    onclick={() => toggleSection(section)}
                    class="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm font-semibold tracking-wide text-text-primary uppercase transition-colors duration-150 hover:bg-muted"
                >
                    <span class="flex items-center gap-2 text-left">
                        <motion.span
                            class="inline-flex shrink-0"
                            whileHover={hoverScale}
                            transition={springFast}
                        >
                            {#if section.icon}
                                <svelte:component
                                    this={section.icon}
                                    size={14}
                                    class="text-muted-foreground"
                                />
                            {/if}
                        </motion.span>
                        {section.title}
                    </span>
                    <ChevronDown
                        size={12}
                        class="shrink-0 text-muted-foreground transition-transform duration-200 {isSectionOpen(
                            section
                        )
                            ? 'rotate-180'
                            : ''}"
                    />
                </button>
                {#if isSectionOpen(section)}
                    <ul
                        class="mt-1 ml-3 space-y-1 border-l border-border pl-1"
                        transition:slide={{ duration: 200 }}
                    >
                        {#each section.items as item (item.href)}
                            <motion.li
                                whileHover={hoverShift}
                                transition={springSoft}
                            >
                                <a
                                    href={item.href}
                                    target={item?.external ? '_blank' : undefined}
                                    rel={item?.external ? 'noopener' : undefined}
                                    class="group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150
                                     {isActivePath(item.href, currentPath, item.exact)
                                        ? 'bg-accent text-accent-foreground'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
                                >
                                    {#if item.icon}
                                        <motion.span
                                            class="mr-3 inline-flex"
                                            whileHover={hoverScale}
                                            transition={springFast}
                                        >
                                            <svelte:component
                                                this={item.icon}
                                                size={14}
                                                class={isActivePath(item.href, currentPath, item.exact)
                                                    ? 'text-accent-foreground'
                                                    : 'text-muted-foreground group-hover:text-foreground'}
                                            />
                                        </motion.span>
                                    {:else}
                                        <ArrowRight size={12} class="mr-3 text-muted-foreground" />
                                    {/if}
                                    {item.title}
                                    {#if item?.external}
                                        <ExternalLink size={12} class="ml-2 opacity-50" />
                                    {/if}
                                </a>
                            </motion.li>
                        {/each}
                    </ul>
                {/if}
            </div>
        {/each}
    </div>
</nav>
