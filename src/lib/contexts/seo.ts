import { getContext, setContext } from 'svelte'

export type SeoContext = {
    title: string
    description: string
    ogTitle?: string
    ogTagline?: string
    ogFeatures?: string[]
    ogSlug?: string
}

const SeoContextSymbol = Symbol('seo')

export const getSeoContext = (): SeoContext | undefined => {
    return getContext(SeoContextSymbol)
}

export const setSeoContext = (context: SeoContext): void => {
    setContext(SeoContextSymbol, context)
}
