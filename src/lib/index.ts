// Config
export type { DocsKitConfig } from './config.js'

// Components
export { default as BreadcrumbContextProvider } from './components/BreadcrumbContextProvider.svelte'
export { default as BreadcrumbJsonLd } from './components/BreadcrumbJsonLd.svelte'
export { default as Footer } from './components/Footer.svelte'
export { default as Header } from './components/Header.svelte'
export { default as OG } from './components/OG.svelte'
export { default as SeoContextProvider } from './components/SeoContextProvider.svelte'
export { default as SeoHead } from './components/SeoHead.svelte'
export { default as Sidebar } from './components/Sidebar.svelte'
export { default as ThemeToggle } from './components/ThemeToggle.svelte'

// Icons (brand icons only — use @lucide/svelte for UI icons)
export { default as GitHubIcon } from './components/icons/GitHubIcon.svelte'
export { default as NpmIcon } from './components/icons/NpmIcon.svelte'

// Nav types
export type { NavItem, NavSection } from './types/nav.js'

// Utilities
export { fetchOtherProjects } from './utils/fetchOtherProjects.js'
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
