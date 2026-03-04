<script lang="ts">
    import { resetMode, setMode, userPrefersMode } from 'mode-watcher'
    import Root from './ui/dropdown-menu/dropdown-menu.svelte'
    import Trigger from './ui/dropdown-menu/dropdown-menu-trigger.svelte'
    import Content from './ui/dropdown-menu/dropdown-menu-content.svelte'
    import Item from './ui/dropdown-menu/dropdown-menu-item.svelte'
    import SunIcon from '@lucide/svelte/icons/sun'
    import MoonIcon from '@lucide/svelte/icons/moon'
    import MonitorIcon from '@lucide/svelte/icons/monitor'
</script>

<Root>
    <Trigger
        class="inline-flex size-6 items-center justify-center rounded-full border border-border-muted text-text-muted transition-colors hover:border-border-mid hover:text-text-secondary"
        aria-label="Toggle theme"
    >
        {#if userPrefersMode.current === 'light'}
            <SunIcon class="size-3.5" />
        {:else if userPrefersMode.current === 'dark'}
            <MoonIcon class="size-3.5" />
        {:else}
            <MonitorIcon class="size-3.5" />
        {/if}
        <span class="sr-only">Toggle theme</span>
    </Trigger>
    <Content align="end">
        <Item onSelect={() => setMode('light')}>
            <SunIcon />
            Light
        </Item>
        <Item onSelect={() => setMode('dark')}>
            <MoonIcon />
            Dark
        </Item>
        <Item onSelect={() => resetMode()}>
            <MonitorIcon />
            System
        </Item>
    </Content>
</Root>
