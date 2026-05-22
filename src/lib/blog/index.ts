// Components (v1 — legacy Tailwind-prose chrome)
export { default as BlogArticleJsonLd } from '../components/BlogArticleJsonLd.svelte'
export { default as BlogCard } from '../components/BlogCard.svelte'
export { default as BlogIndex } from '../components/BlogIndex.svelte'
export { default as BlogLayout } from '../components/BlogLayout.svelte'
export { default as BlogPost } from '../components/BlogPost.svelte'

// Components (v2 — brutalist sheet, matches HeaderV2/FooterV2/ExampleV2)
export { default as BlogIndexV2 } from '../components/BlogIndexV2.svelte'
export { default as BlogLayoutV2 } from '../components/BlogLayoutV2.svelte'
export { default as BlogPostV2 } from '../components/BlogPostV2.svelte'

// Types
export type { BlogPostData, BlogPostMeta } from '../types/blog.js'

// Utilities
export { filterByTag, getAllTags, loadBlogPostsMdsvex } from '../utils/blog.js'
export { estimateReadingTime } from '../utils/reading-time.js'
export { generateRssFeed } from '../utils/rss.js'
