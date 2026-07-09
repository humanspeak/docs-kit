<script lang="ts">
    import { resolve } from '$app/paths'
    import { AnimatePresence, MotionDiv, MotionImg } from '@humanspeak/svelte-motion'
    import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
    import MenuIcon from '@lucide/svelte/icons/menu'
    import XIcon from '@lucide/svelte/icons/x'
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
     *  - Breadcrumbs use chevron separators and small caps to fit the sheet
     *    aesthetic.
     *  - Responsive: at compact widths the version pill hides and split brand
     *    marks drop the prefix (`svelte/motion` becomes `motion`). At < 768px
     *    the inline nav collapses into a hamburger button that opens an
     *    animated drawer beneath the header. At < 640px the breadcrumb hides
     *    from the header (it's still in the drawer), and at < 480px the NPM
     *    icon hides. Pure CSS media queries — no
     *    Tailwind class dependency, so the breakpoints work regardless of
     *    whether the consumer scans node_modules with their Tailwind setup.
     */
    interface NavLink {
        label: string
        href: string
        external?: boolean
    }

    const { config, favicon, nav, version } = $props<{
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

    // Drawer state for the mobile menu. Closed by default. Opened by the
    // hamburger; closed by the X, by clicking any nav link inside, or by
    // pressing Escape.
    let menuOpen = $state(false)
    const toggleMenu = () => {
        menuOpen = !menuOpen
    }
    const closeMenu = () => {
        menuOpen = false
    }

    const onKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && menuOpen) closeMenu()
    }

    const tapScale = { scale: 0.92 }
    const hoverScaleLogo = { scale: 1.06 }
    const hoverScaleIcon = { scale: 1.04 }
    const githubUrl = $derived(config.githubUrl ?? `https://github.com/${config.repo}`)
    const npmUrl = $derived(config.npmUrl ?? `https://www.npmjs.com/package/${config.npmPackage}`)
</script>

<svelte:window on:keydown={onKeydown} />

<header class="dk-header-v2">
    <div class="dk-header-row">
        <div class="dk-header-left">
            {#if !config.hideLogo}
                <a href={resolve('/')} aria-label="Home" class="dk-logo-link">
                    <MotionImg
                        src={favicon}
                        alt="logo"
                        class="dk-logo-img"
                        whileTap={tapScale}
                        whileHover={hoverScaleLogo}
                    />
                </a>
            {/if}
            <a
                href={resolve('/')}
                class="dk-mark"
                class:dk-mark-split={!!mark().tail}
                aria-label={config.name}
            >
                <span class="dk-mark-head">{mark().head}</span>
                {#if mark().tail}
                    <span class="dk-mark-slash">/</span><span class="dk-mark-tail"
                        >{mark().tail}</span
                    >
                {/if}
            </a>
            {#if version}
                <span class="dk-version">v{version}</span>
            {/if}
            {#if breadcrumbContext && breadcrumbs.length > 0}
                <nav aria-label="Breadcrumb" class="dk-crumbs">
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

        <!-- Always-rendered middle slot keeps the grid columns stable so the
             right cluster stays pinned to the right even when nav is absent. -->
        <div class="dk-header-middle">
            {#if nav && nav.length > 0}
                <nav class="dk-nav" aria-label="Primary">
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
        </div>

        <div class="dk-header-right">
            {#if nav && nav.length > 0}
                <!-- Hamburger trigger: visible only below the inline-nav
                     breakpoint so it never duplicates the row of links above. -->
                <button
                    type="button"
                    class="dk-icon-square dk-menu-btn"
                    aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={menuOpen}
                    aria-controls="dk-mobile-drawer"
                    onclick={toggleMenu}
                >
                    {#if menuOpen}
                        <XIcon class="size-3.5" />
                    {:else}
                        <MenuIcon class="size-3.5" />
                    {/if}
                </button>
            {/if}
            <ThemeToggleV2 />
            <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="dk-icon-link"
                aria-label="GitHub"
            >
                <MotionDiv class="dk-icon-square" whileTap={tapScale} whileHover={hoverScaleIcon}>
                    <GitHubIcon class="size-3.5" />
                </MotionDiv>
            </a>
            {#if !config.hideNpm}
                <a
                    href={npmUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="dk-icon-link dk-npm-link"
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
            {/if}
        </div>
    </div>

    <!-- Mobile drawer: stacked vertically, full-width, slides down from the
         header. Hidden above the inline-nav breakpoint via CSS so the drawer
         never appears on desktop even if `menuOpen` somehow stayed true
         (e.g. after a resize). -->
    {#if nav && nav.length > 0}
        <AnimatePresence initial={false}>
            {#if menuOpen}
                <MotionDiv
                    id="dk-mobile-drawer"
                    key="dk-mobile-drawer"
                    class="dk-mobile-drawer"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                    <nav aria-label="Mobile primary">
                        {#each nav as item (item.href)}
                            <a
                                class="dk-mobile-nav-link"
                                href={item.href}
                                target={item.external ? '_blank' : undefined}
                                rel={item.external ? 'noopener noreferrer' : undefined}
                                onclick={closeMenu}
                            >
                                {item.label}{#if item.external}
                                    <span aria-hidden="true">↗</span>
                                {/if}
                            </a>
                        {/each}
                    </nav>
                </MotionDiv>
            {/if}
        </AnimatePresence>
    {/if}
</header>

<style>
    .dk-header-v2 {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12px;
        letter-spacing: 0;
        border-bottom: 1px solid var(--color-border-muted, rgba(127, 127, 127, 0.22));
        background: var(--color-background, var(--brut-bg, var(--background, white)));
        color: var(--color-text, var(--brut-ink, var(--foreground, inherit)));
        position: relative;
    }
    .dk-header-row {
        padding: 12px 16px;
        /* Three-column grid keeps the centre nav truly centred regardless of
           how wide the left mark + breadcrumbs grow.
           NOTE: the side columns must be `minmax(0, 1fr)` (not bare `1fr`),
           because `1fr` is shorthand for `minmax(auto, 1fr)` — the implicit
           `auto` minimum lets the track grow past its theoretical equal
           share to fit the left content, which would push the nav off-centre.
           `minmax(0, 1fr)` forces equal-share distribution and lets the left
           content overflow its track instead of expanding it. */
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
        align-items: center;
        gap: 16px;
    }
    @media (min-width: 768px) {
        .dk-header-row {
            padding-left: 24px;
            padding-right: 24px;
        }
    }
    .dk-header-left {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
        justify-self: start;
        /* Hide overflow so very long breadcrumbs don't push the column
           visually wider than its track — the auto-sized middle column
           stays anchored to the true horizontal centre. */
        overflow: hidden;
    }
    .dk-header-middle {
        display: inline-flex;
        align-items: center;
        justify-self: center;
        min-width: 0;
    }
    .dk-header-right {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        justify-self: end;
        min-width: 0;
    }
    @media (min-width: 768px) {
        .dk-header-right {
            gap: 12px;
        }
    }

    /* ── Brand mark ────────────────────────────────────────────────── */
    .dk-logo-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
    .dk-header-v2 :global(.dk-logo-img) {
        flex: 0 0 1.5rem;
        height: 1.5rem;
        min-width: 1.5rem;
        width: 1.5rem;
        max-width: 1.5rem;
        object-fit: contain;
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
    /* Compact header: drop the low-priority version pill and shorten split
       brand marks (`svelte/motion` -> `motion`) before the row gets crowded. */
    @media (max-width: 1279px) {
        .dk-mark-split .dk-mark-head,
        .dk-mark-split .dk-mark-slash,
        .dk-version {
            display: none;
        }
    }

    /* ── Breadcrumbs ───────────────────────────────────────────────── */
    .dk-crumbs {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-left: 4px;
        font-size: 11px;
        color: var(--color-text-muted, rgba(127, 127, 127, 0.9));
        white-space: nowrap;
    }
    /* Hide the breadcrumbs in the header on small screens — they're still
       reachable inside the mobile drawer's nav links. */
    @media (max-width: 640px) {
        .dk-crumbs {
            display: none;
        }
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

    /* ── Inline nav (desktop) ──────────────────────────────────────── */
    .dk-nav {
        display: none;
        align-items: center;
        gap: 0;
        border-left: 1px solid var(--color-border-muted, rgba(127, 127, 127, 0.18));
        border-right: 1px solid var(--color-border-muted, rgba(127, 127, 127, 0.18));
    }
    @media (min-width: 768px) {
        .dk-nav {
            display: inline-flex;
        }
    }
    .dk-nav-link {
        padding: 6px 14px;
        font-size: 11px;
        letter-spacing: 0.06em;
        text-transform: lowercase;
        color: var(--color-text-muted, rgba(127, 127, 127, 0.9));
        text-decoration: none;
        border-right: 1px solid var(--color-border-muted, rgba(127, 127, 127, 0.18));
        transition:
            background 0.15s,
            color 0.15s;
    }
    .dk-nav-link:last-child {
        border-right: 0;
    }
    .dk-nav-link:hover {
        background: var(--color-surface-muted, rgba(127, 127, 127, 0.06));
        color: var(--color-text, currentColor);
    }

    /* ── Right cluster icons ───────────────────────────────────────── */
    .dk-icon-link,
    .dk-menu-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--color-text-muted, rgba(127, 127, 127, 0.9));
        text-decoration: none;
        transition: color 0.15s;
    }
    .dk-icon-link:hover,
    .dk-menu-btn:hover {
        color: var(--color-text, currentColor);
    }
    .dk-icon-link :global(.dk-icon-square),
    .dk-menu-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.6rem;
        height: 1.6rem;
        border: 1px solid var(--color-border-muted, rgba(127, 127, 127, 0.25));
        background: transparent;
        cursor: pointer;
        padding: 0;
        transition:
            border-color 0.15s,
            background 0.15s,
            color 0.15s;
    }
    .dk-icon-link:hover :global(.dk-icon-square),
    .dk-menu-btn:hover {
        border-color: var(--color-text, currentColor);
    }
    .dk-menu-btn[aria-expanded='true'] {
        border-color: var(--color-text, currentColor);
        color: var(--color-text, currentColor);
    }
    /* Hide the hamburger above the inline-nav breakpoint. */
    @media (min-width: 768px) {
        .dk-menu-btn {
            display: none;
        }
    }
    /* Drop the NPM icon at the smallest widths so the row still breathes —
       the hamburger drawer or footer carries that link. */
    @media (max-width: 480px) {
        .dk-npm-link {
            display: none;
        }
    }

    /* ── Mobile drawer ─────────────────────────────────────────────── */
    .dk-header-v2 :global(.dk-mobile-drawer) {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        z-index: 30;
        border-bottom: 1px solid var(--color-border-muted, rgba(127, 127, 127, 0.22));
        background: var(--color-background, var(--brut-bg, var(--background, white)));
        overflow: hidden;
    }
    /* Never let the drawer render at desktop widths — even if `menuOpen`
       got stuck open during a resize. */
    @media (min-width: 768px) {
        .dk-header-v2 :global(.dk-mobile-drawer) {
            display: none;
        }
    }
    .dk-header-v2 :global(.dk-mobile-drawer nav) {
        display: flex;
        flex-direction: column;
    }
    .dk-mobile-nav-link {
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 20px;
        font-size: 13px;
        font-weight: 500;
        letter-spacing: 0.04em;
        text-transform: lowercase;
        color: var(--color-text, currentColor);
        text-decoration: none;
        border-top: 1px solid var(--color-border-muted, rgba(127, 127, 127, 0.14));
        transition: background 0.15s;
    }
    .dk-mobile-nav-link:first-child {
        border-top: 0;
    }
    .dk-mobile-nav-link:hover,
    .dk-mobile-nav-link:focus-visible {
        background: var(--color-surface-muted, rgba(127, 127, 127, 0.06));
    }
</style>
