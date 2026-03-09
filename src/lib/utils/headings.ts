import GithubSlugger from 'github-slugger'

export type TocHeading = {
    id: string
    text: string
    level: number
    element: HTMLElement
}

/**
 * Extract headings from a container element for table of contents.
 * Generates descriptive, slugified IDs for better URL anchors using github-slugger.
 */
export function extractHeadings(container: HTMLElement): TocHeading[] {
    const headingElements = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
    const slugger = new GithubSlugger()

    return Array.from(headingElements).map((el, index) => {
        const text = el.textContent?.trim() || ''
        const level = parseInt(el.tagName.charAt(1))

        // Use existing ID if present, otherwise generate slug
        let id = el.id
        if (!id) {
            id = text ? slugger.slug(text) : `heading-${index}`
        }

        if (!el.id) {
            el.id = id
        }

        return {
            id,
            text,
            level,
            element: el as HTMLElement
        }
    })
}
