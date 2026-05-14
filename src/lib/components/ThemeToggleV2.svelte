<script lang="ts">
    import { resetMode, setMode, userPrefersMode } from 'mode-watcher'
    import MonitorIcon from '@lucide/svelte/icons/monitor'
    import MoonIcon from '@lucide/svelte/icons/moon'
    import SunIcon from '@lucide/svelte/icons/sun'

    /**
     * Brutalist-mono theme toggle (v2).
     *
     * Three hairline squares in a row (light · dark · system) instead of the
     * v1 dropdown. The active mode is filled with the accent colour so it
     * reads as a one-of-three switch at a glance. Same mode-watcher hooks
     * under the hood — no consumer-facing change beyond visuals.
     */
    type Mode = 'light' | 'dark' | 'system'

    const select = (mode: Mode) => {
        if (mode === 'system') {
            resetMode()
            return
        }
        setMode(mode)
    }

    const isActive = (mode: Mode) => {
        if (mode === 'system') return userPrefersMode.current === 'system'
        return userPrefersMode.current === mode
    }
</script>

<div class="dk-theme-v2" role="group" aria-label="Theme">
    <button
        type="button"
        class="dk-theme-cell"
        aria-label="Light"
        aria-pressed={isActive('light')}
        class:on={isActive('light')}
        onclick={() => select('light')}
    >
        <SunIcon class="size-3.5" />
    </button>
    <button
        type="button"
        class="dk-theme-cell"
        aria-label="Dark"
        aria-pressed={isActive('dark')}
        class:on={isActive('dark')}
        onclick={() => select('dark')}
    >
        <MoonIcon class="size-3.5" />
    </button>
    <button
        type="button"
        class="dk-theme-cell"
        aria-label="System"
        aria-pressed={isActive('system')}
        class:on={isActive('system')}
        onclick={() => select('system')}
    >
        <MonitorIcon class="size-3.5" />
    </button>
</div>

<style>
    .dk-theme-v2 {
        display: inline-flex;
        align-items: center;
        border: 1px solid var(--color-border-muted, rgba(127, 127, 127, 0.25));
    }
    .dk-theme-cell {
        appearance: none;
        background: transparent;
        border: 0;
        border-right: 1px solid var(--color-border-muted, rgba(127, 127, 127, 0.25));
        padding: 4px 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--color-text-muted, rgba(127, 127, 127, 0.9));
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
        font-family: inherit;
        line-height: 1;
    }
    .dk-theme-cell:last-child {
        border-right: 0;
    }
    .dk-theme-cell:hover {
        color: var(--color-text, currentColor);
        background: var(--color-surface-muted, rgba(127, 127, 127, 0.06));
    }
    .dk-theme-cell.on {
        background: var(--color-brand-500, #54dbbc);
        color: var(--color-brand-ink, #06090a);
    }
    .dk-theme-cell.on:hover {
        filter: brightness(0.95);
    }
</style>
