<script lang="ts">
    import { resolve } from '$app/paths'
    import { MotionDiv, MotionImg } from '@humanspeak/svelte-motion'
    import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
    import type { DocsKitConfig } from '../config.js'
    import { getBreadcrumbContext } from '../contexts/breadcrumb.js'
    import GitHubIcon from './icons/GitHubIcon.svelte'
    import NpmIcon from './icons/NpmIcon.svelte'
    import ThemeToggleV2 from './ThemeToggleV2.svelte'

    /**
     * Brutalist-mono header (v2).
     *
     * Drop-in shape-compatible with the v1 `Header` (`config` + `favicon` props),
     * but adds an optional `nav` for inline section links and an optional
     * `version` for a small monospace pill next to the brand mark.
     *
     * Visual contract:
     *  - Single hairline bottom border, no shadows.
     *  - Brand mark renders `config.name` lowercased with the first interior
     *    whitespace replaced by an accent-coloured `/`, so "Svelte Markdown"
     *    reads as `svelte/markdown`. Single-word names render plainly.
     *  - Chrome icons live inside hairline squares (1px border, no radius)
     *    rather than rounded-full pills.
     *  - Breadcrumbs use " / " separators and small caps to fit the sheet
     *    aesthetic instead of chevrons.
     */
    interface NavLink {
        label: string
        href: string
        external?: boolean
    }

    const {
        config,
        favicon,
        nav,
        version
    } = $props<{
        config: DocsKitConfig
        favicon: string
        nav?: NavLink[]
        version?: string
    }>()

    const breadcrumbContext = getBreadcrumbContext()
    const EMPTY_BREADCRUMBS: readonly import('../contexts/breadcrumb.js').Breadcrumb[] = []
    const breadcrumbs = $derived(breadcrumbContext?.breadcrumbs ?? EMPTY_BREADCRUMBS)

    // Render `config.name` as a lowercase brutalist mark with the first
    // interior space promoted to an accent slash. We only split once so
    // multi-word names like "Foo Bar Baz" become "foo/bar baz" (the trailing
    // segment stays whole). Falls back to plain lowercased text for
    // single-word names.
    const mark = $derived(() => {
        const lower = config.name.toLowerCase()
        const idx = lower.indexOf(' ')
        if (idx === -1) return { head: lower, tail: '' }
        return { head: lower.slice(0, idx), tail: lower.slice(idx + 1) }
    })

    const tapScale = { scale: 0.92 }
    const hoverScaleLogo = { scale: 1.06 }
    const hoverScaleIcon = { scale: 1.04 }
</script>

<header
    class="dk-header-v2 flex items-center justify-between border-b border-border bg-background px-6 py-3 text-foreground"
>
    <div class="flex min-w-0 items-center gap-3">
        <a
            href={resolve('/')}
            aria-label="Home"
            class="inline-flex items-center justify-center"
        >
            <MotionImg
                src={favicon}
                alt="logo"
                class="h-6 w-6"
                whileTap={tapScale}
                whileHover={hoverScaleLogo}
            />
        </a>
        <a href={resolve('/')} class="dk-mark" aria-label={config.name}>
            <span class="dk-mark-head">{mark().head}</span>
            {#if mark().tail}
                <span class="dk-mark-slash">/</span><span class="dk-mark-tail">{mark().tail}</span>
            {/if}
        </a>
        {#if version}
            <span class="dk-version">v{version}</span>
        {/if}
        {#if breadcrumbContext && breadcrumbs.length > 0}
            <nav aria-label="Breadcrumb" class="dk-crumbs hidden sm:flex">
                {#each breadcrumbs as crumb, index (index)}
                    <span class="dk-crumb-sep" aria-hidden="true">
                        <ChevronRightIcon size={11} />
                    </span>
                    {#if index === breadcrumbs.length - 1}
                        <span class="dk-crumb-current" aria-current="page">{crumb.title}</span>
                    {:else if !crumb.href}
                        <span class="dk-crumb-muted">{crumb.title}</span>
                    {:else}
                        <a href={crumb.href} class="dk-crumb-link">{crumb.title}</a>
                    {/if}
                {/each}
            </nav>
        {/if}
    </div>

    {#if nav && nav.length > 0}
        <nav class="dk-nav hidden md:flex" aria-label="Primary">
            {#each nav as item (item.href)}
                <a
                    class="dk-nav-link"
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                >
                    {item.label}{#if item.external}<span aria-hidden="true">↗</span>{/if}
                </a>
            {/each}
        </nav>
    {/if}

    <div class="flex items-center gap-3">
        <ThemeToggleV2 />
        <a
            href="https://github.com/{config.repo}"
            target="_blank"
            rel="noopener noreferrer"
            class="dk-icon-link text-text-muted hover:text-text-secondary"
            aria-label="GitHub"
        >
            <MotionDiv
                class="dk-icon-square"
                whileTap={tapScale}
                whileHover={hoverScaleIcon}
            >
                <GitHubIcon class="size-3.5" />
            </MotionDiv>
        </a>
        <a
            href="https://www.npmjs.com/package/{config.npmPackage}"
            target="_blank"
            rel="noopener noreferrer"
            class="dk-icon-link text-text-muted hover:text-text-secondary"
            aria-label="NPM"
        >
            <MotionDiv
                class="dk-icon-square"
                whileTap={tapScale}
                whileHover={hoverScaleIcon}
            >
                <NpmIcon class="size-3.5" />
            </MotionDiv>
        </a>
    </div>
</header>

<style>
    .dk-header-v2 {
        font-family:
            'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12px;
        letter-spacing: 0;
    }
    .dk-mark {
        font-weight: 600;
        font-size: 13px;
        color: var(--color-text, currentColor);
        text-decoration: none;
        letter-spacing: -0.01em;
        white-space: nowrap;
    }
    .dk-mark-slash {
        color: var(--color-brand-500, #54dbbc);
        margin: 0 1px;
    }
    .dk-mark-tail {
        color: var(--color-text, currentColor);
    }
    .dk-version {
        font-size: 10.5px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 2px 6px;
        border: 1px solid var(--color-border-muted, rgba(127, 127, 127, 0.25));
        color: var(--color-text-muted, rgba(127, 127, 127, 0.9));
    }
    .dk-crumbs {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-left: 4px;
        font-size: 11px;
        color: var(--color-text-muted, rgba(127, 127, 127, 0.9));
    }
    .dk-crumb-sep {
        display: inline-flex;
        align-items: center;
        color: var(--color-text-muted, rgba(127, 127, 127, 0.7));
    }
    .dk-crumb-current {
        color: var(--color-text, currentColor);
        font-weight: 500;
    }
    .dk-crumb-link {
        color: var(--color-text-muted, rgba(127, 127, 127, 0.9));
        text-decoration: none;
        transition: color 0.15s;
    }
    .dk-crumb-link:hover {
        color: var(--color-text, currentColor);
    }
    .dk-nav {
        display: inline-flex;
        align-items: center;
        gap: 0;
        border-left: 1px solid var(--color-border-muted, rgba(127, 127, 127, 0.18));
        border-right: 1px solid var(--color-border-muted, rgba(127, 127, 127, 0.18));
    }
    .dk-nav-link {
        padding: 6px 14px;
        font-size: 11px;
        letter-spacing: 0.06em;
        text-transform: lowercase;
        color: var(--color-text-muted, rgba(127, 127, 127, 0.9));
        text-decoration: none;
        border-right: 1px solid var(--color-border-muted, rgba(127, 127, 127, 0.18));
        transition: background 0.15s, color 0.15s;
    }
    .dk-nav-link:last-child {
        border-right: 0;
    }
    .dk-nav-link:hover {
        background: var(--color-surface-muted, rgba(127, 127, 127, 0.06));
        color: var(--color-text, currentColor);
    }
    .dk-icon-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
    .dk-icon-link :global(.dk-icon-square) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
        border: 1px solid var(--color-border-muted, rgba(127, 127, 127, 0.25));
        transition: border-color 0.15s, background 0.15s;
    }
    .dk-icon-link:hover :global(.dk-icon-square) {
        border-color: var(--color-text, currentColor);
    }
</style>
