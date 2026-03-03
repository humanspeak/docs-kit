import { getContext, setContext } from 'svelte'

export type Breadcrumb = { title: string; href?: string }
export type BreadcrumbContext = { breadcrumbs: Breadcrumb[] }

const BreadcrumbContextSymbol = Symbol('breadcrumbs')

export const getBreadcrumbContext = (): BreadcrumbContext | undefined => {
    return getContext(BreadcrumbContextSymbol)
}

export const setBreadcrumbContext = (context: BreadcrumbContext): void => {
    setContext(BreadcrumbContextSymbol, context)
}
