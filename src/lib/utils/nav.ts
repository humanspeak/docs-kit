import type { NavSection } from '../types/nav.js'

/**
 * Look up a docs page title by its pathname
 * @param sections - The navigation sections to search
 * @param pathname - The URL pathname (e.g., '/docs/infinite-scroll')
 * @returns The page title or null if not found
 */
export function getDocsTitleByPath(sections: NavSection[], pathname: string): string | null {
    for (const section of sections) {
        const item = section.items.find((item) => item.href === pathname)
        if (item) return item.title
    }
    return null
}

/**
 * Check if a navigation item is active based on the current path.
 * By default uses prefix matching (e.g. `/docs/foo` matches `/docs/foo/bar`).
 * Set `exact: true` to disable prefix matching for index-style routes.
 */
export function isActivePath(href: string, currentPath: string, exact = false): boolean {
    const basePath = currentPath.split(/[?#]/)[0]
    if (exact) {
        return (
            basePath === href ||
            currentPath.startsWith(`${href}?`) ||
            currentPath.startsWith(`${href}#`)
        )
    }
    return (
        basePath === href ||
        currentPath.startsWith(`${href}?`) ||
        currentPath.startsWith(`${href}#`) ||
        basePath.startsWith(`${href}/`)
    )
}
