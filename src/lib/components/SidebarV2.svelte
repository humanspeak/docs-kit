<!--
  @component
  Brutalist-mono sidebar (v2).

  Drop-in shape-compatible with the v1 `Sidebar` (`config` + `sections` +
  `currentPath` + `otherProjects` + `loveAndRespect` props), but rendered
  in the brutalist sheet aesthetic: monospace labels, hairline borders,
  no rounded corners, accent-green active-state left bar instead of a
  filled pill.

  Visual contract:
   - Section headers render as uppercase JetBrains Mono caps with a
     hairline rule above and a chevron toggle.
   - Active item gets a 2px accent left bar plus accent foreground;
     inactive items use muted foreground with a subtle hover background.
   - External links keep their ↗ marker; lucide icons stay but at 12px.
-->
<script lang="ts">
    import { MotionLi, MotionSpan } from '@humanspeak/svelte-motion'
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

    const hoverScale = { scale: 1.18 }
    const springFast = { type: 'spring' as const, stiffness: 500, damping: 15 }

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

    const { slug } = config

    const openSections = new PersistedState<Record<string, boolean>>(
        `${slug}-sidebar-v2-sections`,
        {}
    )

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

<nav class="dk-sidebar-v2">
    {#each navigation as section, i (section.title)}
        <div class="dk-sb-section" class:dk-sb-first={i === 0}>
            <button
                type="button"
                onclick={() => toggleSection(section)}
                class="dk-sb-section-toggle"
                aria-expanded={isSectionOpen(section)}
            >
                <span class="dk-sb-section-label">
                    <MotionSpan
                        class="dk-sb-section-icon"
                        whileHover={hoverScale}
                        transition={springFast}
                    >
                        {#if section.icon}
                            {@const SectionIcon = section.icon}
                            <SectionIcon size={12} />
                        {/if}
                    </MotionSpan>
                    {section.title}
                </span>
                <ChevronDown
                    size={11}
                    class="dk-sb-chev {isSectionOpen(section) ? 'open' : ''}"
                />
            </button>
            {#if isSectionOpen(section)}
                <ul class="dk-sb-list" transition:slide={{ duration: 180 }}>
                    {#each section.items as item (item.href)}
                        {@const active = isActivePath(item.href, currentPath, item.exact)}
                        <MotionLi
                            class="dk-sb-li {active ? 'active' : ''}"
                            whileHover={{ x: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                        >
                            <a
                                href={item.href}
                                target={item?.external ? '_blank' : undefined}
                                rel={item?.external ? 'noopener' : undefined}
                                class="dk-sb-link"
                            >
                                <span class="dk-sb-bar" aria-hidden="true"></span>
                                <span class="dk-sb-title">{item.title}</span>
                                {#if item?.external}
                                    <ExternalLink size={10} class="dk-sb-ext" />
                                {/if}
                            </a>
                        </MotionLi>
                    {/each}
                </ul>
            {/if}
        </div>
    {/each}
</nav>

<style>
    .dk-sidebar-v2 {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12px;
        padding: 8px 0;
        color: var(--foreground);
    }
    .dk-sb-section {
        border-top: 1px solid var(--border);
    }
    .dk-sb-first {
        border-top: 0;
    }
    .dk-sb-section-toggle {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: space-between;
        background: transparent;
        border: 0;
        padding: 10px 14px 8px;
        cursor: pointer;
        font-family: inherit;
        font-size: 10.5px;
        font-weight: 500;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--muted-foreground);
        transition: color 0.15s;
    }
    .dk-sb-section-toggle:hover {
        color: var(--foreground);
    }
    .dk-sb-section-label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
    }
    .dk-sb-section-toggle :global(.dk-sb-section-icon) {
        display: inline-flex;
        color: var(--muted-foreground);
    }
    .dk-sb-section-toggle :global(.dk-sb-chev) {
        flex-shrink: 0;
        color: var(--muted-foreground);
        transition: transform 0.18s;
    }
    .dk-sb-section-toggle :global(.dk-sb-chev.open) {
        transform: rotate(180deg);
    }
    .dk-sb-list {
        list-style: none;
        margin: 0;
        padding: 0 0 8px;
    }
    .dk-sb-list :global(.dk-sb-li) {
        margin: 0;
        padding: 0;
    }
    .dk-sb-link {
        position: relative;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px 6px 22px;
        font-size: 12.5px;
        line-height: 1.35;
        color: var(--muted-foreground);
        text-decoration: none;
        text-transform: lowercase;
        letter-spacing: -0.005em;
        transition:
            color 0.15s,
            background 0.15s;
    }
    .dk-sb-link:hover {
        color: var(--foreground);
        background: color-mix(in srgb, var(--muted) 50%, transparent);
    }
    .dk-sb-bar {
        position: absolute;
        left: 12px;
        top: 6px;
        bottom: 6px;
        width: 2px;
        background: transparent;
        transition: background 0.15s;
    }
    :global(.dk-sb-li.active) .dk-sb-link {
        color: var(--accent-foreground, var(--foreground));
        background: color-mix(in srgb, var(--accent) 14%, transparent);
        font-weight: 500;
    }
    :global(.dk-sb-li.active) .dk-sb-bar {
        background: var(--brand-500, var(--accent));
    }
    .dk-sb-link :global(.dk-sb-ext) {
        margin-left: auto;
        color: var(--muted-foreground);
        opacity: 0.7;
    }
</style>
