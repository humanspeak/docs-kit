import type { Component } from 'svelte'

export type NavItem = {
    title: string
    href: string
    icon?: Component
    external?: boolean
    /** When true, only exact path matches activate this item (no prefix matching) */
    exact?: boolean
}

export type NavSection = {
    title: string
    icon?: Component
    items: NavItem[]
}
