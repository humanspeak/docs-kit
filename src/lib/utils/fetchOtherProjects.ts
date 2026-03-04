import type { NavItem } from '../types/nav.js'

type OtherProject = {
    url: string
    slug: string
    shortDescription: string
}

/**
 * Server-side helper to fetch "Other Projects" from the Humanspeak registry.
 * Filters out the current project by slug and returns NavItem[] for direct use in Sidebar.
 *
 * @param slug - The current project's slug to filter out (e.g., 'markdown', 'motion')
 * @returns NavItem[] of other Humanspeak projects
 */
export async function fetchOtherProjects(slug: string): Promise<NavItem[]> {
    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const response = await fetch('https://svelte.page/api/v1/others', {
            signal: controller.signal
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }

        const projects = (await response.json()) as OtherProject[]

        if (!Array.isArray(projects)) {
            throw new Error('Invalid response: expected array')
        }

        return projects
            .filter(
                (p): p is OtherProject =>
                    p != null &&
                    typeof p.slug === 'string' &&
                    typeof p.url === 'string' &&
                    typeof p.shortDescription === 'string'
            )
            .filter((project) => project.slug !== slug)
            .map((project) => ({
                title: project.slug.toLowerCase(),
                href: project.url,
                external: true
            }))
    } catch (error) {
        console.error('Failed to fetch other projects:', error)
        return []
    }
}
