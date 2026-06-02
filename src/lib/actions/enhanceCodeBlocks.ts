import { animate, hover, press } from '@humanspeak/svelte-motion'

/** @desc Maps short language identifiers to human-readable display names. */
const LANG_NAMES: Record<string, string> = {
    svelte: 'Svelte',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    js: 'JavaScript',
    javascript: 'JavaScript',
    bash: 'Terminal',
    shell: 'Terminal',
    html: 'HTML',
    css: 'CSS',
    json: 'JSON',
    text: 'Text'
}

/**
 * Lucide copy + check SVG markup. Built as separate strings (rather than a
 * single concatenated `innerHTML`) so each icon parses into its own element
 * that we can animate independently — `animate()` needs stable DOM targets
 * for the cross-fade on copy success.
 */
const COPY_SVG = `<svg class="icon-copy" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`

const CHECK_SVG = `<svg class="icon-check" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`

const buildSvgEl = (markup: string): SVGElement => {
    const tpl = document.createElement('template')
    tpl.innerHTML = markup
    return tpl.content.firstElementChild as SVGElement
}

/**
 * Extracts the copyable source code from a Shiki code block. Prefers the
 * base64-encoded `data-code` attribute (set at build time by mdsvex), falling
 * back to the `<pre>` element's text content for runtime-highlighted blocks.
 */
const getCode = (block: HTMLElement): string => {
    const encoded = block.dataset.code
    if (encoded) return atob(encoded)
    return block.querySelector('pre')?.textContent ?? ''
}

/**
 * Detects the language of a Shiki code block. Checks `data-lang` first, then
 * falls back to the Shiki-generated `<code>` element's `language-*` class.
 */
const getLang = (block: HTMLElement): string => {
    if (block.dataset.lang) return block.dataset.lang
    const codeEl = block.querySelector('code[class*="language-"]')
    const match = codeEl?.className.match(/language-(\w+)/)
    return match?.[1] ?? 'text'
}

/**
 * Wires svelte-motion's imperative API to a copy button:
 *  - spring hover lift,
 *  - tap-down compress on press, snap back on release,
 *  - cross-fade between the copy and check icons on success, with a bouncy
 *    overshoot on the check to celebrate the click,
 *  - guarded reset so rapid double-clicks don't leave the icon stuck.
 *
 * Uses `animate()` rather than `MotionButton` because Svelte components
 * can't be mounted into raw DOM created inside a `use:` action — `animate()`
 * runs on the same motion engine, just imperatively.
 */
const wireMotion = (
    btn: HTMLButtonElement,
    iconCopy: SVGElement,
    iconCheck: SVGElement
): { scheduleReset: (delay: number) => void } => {
    // Initial state: copy icon visible, check hidden + scaled down.
    iconCopy.style.transformOrigin = 'center'
    iconCheck.style.transformOrigin = 'center'
    iconCheck.style.opacity = '0'
    iconCheck.style.transform = 'scale(0.6)'
    btn.style.transformOrigin = 'center'

    // Spring lift on hover, snap back on leave.
    const hoverSpring = { type: 'spring' as const, stiffness: 500, damping: 22 }
    hover(btn, () => {
        animate(btn, { scale: 1.12 }, hoverSpring)
        return () => {
            animate(btn, { scale: 1 }, hoverSpring)
        }
    })

    // Tap-down compress, springy release. Returning a cleanup from `press`
    // gives us a true "down -> up" pair instead of two unrelated events.
    press(btn, () => {
        animate(btn, { scale: 0.92 }, { duration: 0.08 })
        return () => {
            animate(btn, { scale: 1.12 }, { type: 'spring' as const, stiffness: 600, damping: 18 })
        }
    })

    let resetTimer: ReturnType<typeof setTimeout> | null = null

    const reset = () => {
        if (resetTimer) {
            clearTimeout(resetTimer)
            resetTimer = null
        }
        animate(iconCopy, { opacity: 1, scale: 1 }, { duration: 0.18 })
        animate(iconCheck, { opacity: 0, scale: 0.6 }, { duration: 0.15 })
        btn.classList.remove('copied')
    }

    return {
        /** Schedule a reset for `delay` ms from now, replacing any previous
         *  scheduled reset so rapid double-clicks restart the success window
         *  from the most recent click instead of expiring on the first one. */
        scheduleReset: (delay: number) => {
            if (resetTimer) clearTimeout(resetTimer)
            resetTimer = setTimeout(reset, delay)
        }
    }
}

const playCopySuccess = (btn: HTMLButtonElement, iconCopy: SVGElement, iconCheck: SVGElement) => {
    btn.classList.add('copied')
    animate(iconCopy, { opacity: 0, scale: 0.6 }, { duration: 0.15 })
    // Bouncy overshoot on the check — short pop, then settle.
    animate(
        iconCheck,
        { opacity: 1, scale: [0.6, 1.25, 1] },
        { duration: 0.32, ease: [0.34, 1.56, 0.64, 1] }
    )
}

/**
 * Scans a container for un-enhanced Shiki code blocks and injects a header bar
 * with a language label and copy-to-clipboard button into each one.
 */
const enhance = (container: HTMLElement) => {
    const blocks = container.querySelectorAll<HTMLElement>('.shiki-container:not(.code-enhanced)')

    for (const block of blocks) {
        block.classList.add('code-enhanced')

        const lang = getLang(block)
        const title = block.dataset.title
        const label = title ?? LANG_NAMES[lang] ?? lang

        const header = document.createElement('div')
        header.className = 'code-block-header'

        const langSpan = document.createElement('span')
        langSpan.className = 'code-block-lang'
        langSpan.textContent = label

        const copyBtn = document.createElement('button')
        copyBtn.className = 'code-block-copy'
        copyBtn.setAttribute('aria-label', 'Copy code')

        const iconCopy = buildSvgEl(COPY_SVG)
        const iconCheck = buildSvgEl(CHECK_SVG)
        copyBtn.appendChild(iconCopy)
        copyBtn.appendChild(iconCheck)

        const motionHandle = wireMotion(copyBtn, iconCopy, iconCheck)

        copyBtn.addEventListener('click', () => {
            const code = getCode(block)
            if (!code) return
            playCopySuccess(copyBtn, iconCopy, iconCheck)
            // Hold the success state ~2s. `scheduleReset` clears any
            // prior pending timer so a second click inside the window
            // restarts the countdown from now, rather than letting the
            // first click's reset snap the icon back early.
            motionHandle.scheduleReset(2000)
            navigator.clipboard?.writeText(code).catch(() => {
                /* clipboard blocked — fail quiet, the user can select + copy */
            })
        })

        header.appendChild(langSpan)
        header.appendChild(copyBtn)
        block.prepend(header)
    }
}

/**
 * Svelte action that enhances every Shiki code block inside a node with a
 * header bar (language label + copy button). A {@link MutationObserver} watches
 * for new code blocks added by SvelteKit client-side navigations.
 */
export const enhanceCodeBlocks = (node: HTMLElement) => {
    enhance(node)

    let pending = false
    const observer = new MutationObserver(() => {
        if (pending) return
        pending = true
        requestAnimationFrame(() => {
            pending = false
            enhance(node)
        })
    })

    observer.observe(node, { childList: true, subtree: true })

    return {
        destroy: () => {
            observer.disconnect()
        }
    }
}
