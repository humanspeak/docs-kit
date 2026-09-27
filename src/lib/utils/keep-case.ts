/**
 * Whether a display string is a code identifier whose casing carries meaning.
 *
 * The brutalist theme lowercases navigation and heading text. That is fine for
 * prose titles ("Quick Start") but destroys API names ("createColumns",
 * "TableViewModel", "addSortBy") and signatures ("attrs: () => Readable<…>").
 * Components use this to opt such strings out of the transform.
 *
 * A string keeps its case when it contains a camelCase boundary (a lowercase
 * letter directly followed by an uppercase one) or code punctuation
 * (`#`, `(`, `)`, `<`, `>`, `[`, `]`, `{`, `}`, `` ` `` or `$`).
 *
 * @param text - The display string.
 * @returns `true` when the string should be rendered with its authored casing.
 */
export const keepsCase = (text: string | undefined | null): boolean => {
    if (!text) return false
    return /[a-z][A-Z]/.test(text) || /[#()<>[\]{}`$]/.test(text)
}
