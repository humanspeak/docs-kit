// Config
export type { DocsKitConfig } from './config.js'

// Components
export { default as Admonition } from './components/Admonition.svelte'
export { default as AdmonitionV2 } from './components/AdmonitionV2.svelte'
export { default as BreadcrumbContextProvider } from './components/BreadcrumbContextProvider.svelte'
export { default as BreadcrumbJsonLd } from './components/BreadcrumbJsonLd.svelte'
export { default as BrutIndexV2 } from './components/BrutIndexV2.svelte'
export { default as BrutLayoutV2 } from './components/BrutLayoutV2.svelte'
export { default as CompareIndexV2 } from './components/CompareIndexV2.svelte'
export { default as CompareLayoutV2 } from './components/CompareLayoutV2.svelte'
export { default as ComparisonPageV2 } from './components/ComparisonPageV2.svelte'
export { default as DocHeroCard } from './components/DocHeroCard.svelte'
export { default as DocsLayout } from './components/DocsLayout.svelte'
export { default as DocsLayoutV2 } from './components/DocsLayoutV2.svelte'
export { default as DocSlugStrip } from './components/DocSlugStrip.svelte'
export { default as Example } from './components/Example.svelte'
export { default as ExampleLayoutV2 } from './components/ExampleLayoutV2.svelte'
export { default as ExampleV2 } from './components/ExampleV2.svelte'
export { default as Footer } from './components/Footer.svelte'
export { default as FooterV2 } from './components/FooterV2.svelte'
export { default as Header } from './components/Header.svelte'
export { default as HeaderV2 } from './components/HeaderV2.svelte'
export { default as OG } from './components/OG.svelte'
export { default as RootLayout } from './components/RootLayout.svelte'
export { default as SeoContextProvider } from './components/SeoContextProvider.svelte'
export { default as SeoHead } from './components/SeoHead.svelte'
export { default as Sidebar } from './components/Sidebar.svelte'
export { default as SidebarV2 } from './components/SidebarV2.svelte'
export { default as TableOfContents } from './components/TableOfContents.svelte'
export { default as TableOfContentsV2 } from './components/TableOfContentsV2.svelte'
export { default as ThemeToggle } from './components/ThemeToggle.svelte'
export { default as ThemeToggleV2 } from './components/ThemeToggleV2.svelte'

// Icons (brand icons only — use @lucide/svelte for UI icons)
export { default as GitHubIcon } from './components/icons/GitHubIcon.svelte'
export { default as NpmIcon } from './components/icons/NpmIcon.svelte'

// Nav types
export type { NavItem, NavSection } from './types/nav.js'

// Utilities
export {
    buildCompareBreadcrumbs,
    type BuildCompareBreadcrumbsOptions,
    type CompareSlugLookup
} from './utils/compare-breadcrumbs.js'
export {
    createCompareSlugLoad,
    type CompareSlugLoad,
    type CompareSlugLoadData
} from './utils/compare-load.js'
export { fetchOtherProjects } from './utils/fetchOtherProjects.js'
export { extractHeadings, type TocHeading } from './utils/headings.js'
export { getDocsTitleByPath, isActivePath } from './utils/nav.js'
export { cn } from './utils/shadcn.js'

// Contexts
export {
    getBreadcrumbContext,
    setBreadcrumbContext,
    type Breadcrumb,
    type BreadcrumbContext
} from './contexts/breadcrumb.js'
export { getSeoContext, setSeoContext, type SeoContext } from './contexts/seo.js'

// Actions
export { enhanceCodeBlocks } from './actions/enhanceCodeBlocks.js'

// Blog types (components and utilities available via '@humanspeak/docs-kit/blog')
export type { BlogPostData, BlogPostMeta } from './types/blog.js'

// Compare types — drive ComparisonPageV2 + CompareIndexV2 from one
// `compare-data.ts` array per consumer. See src/lib/types/compare.ts.
export type {
    CompareFooterCta,
    ComparisonFeature,
    ComparisonOurs,
    Competitor
} from './types/compare.js'

// Brutalist index types — props for BrutIndexV2 and any future
// brut-themed index page.
export type {
    BrutIndexCta,
    BrutIndexFooter,
    BrutIndexFooterRightEntry,
    BrutIndexHero,
    BrutIndexItem,
    BrutIndexLede,
    BrutIndexMetaRow
} from './types/brut.js'
