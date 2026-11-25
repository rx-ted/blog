import { normalizePostSlug } from '@/lib/post-utils'
import type { ParsedImportedMarkdownPost } from '@/lib/import-markdown-post'
import type { DraftMetaState } from '@/components/editor/shared'

export interface ImportedMarkdownDraftMeta {
  title: string
  slug: string
  description: string
  tags: string[]
  coverImage: string
  category: string
}

export function resolveImportedMarkdownDraftMeta(input: {
  parsed: ParsedImportedMarkdownPost
  currentTitle: string
  currentMeta: Pick<DraftMetaState, 'slug' | 'description' | 'tags' | 'coverImage' | 'category'>
}): ImportedMarkdownDraftMeta {
  const { parsed, currentTitle, currentMeta } = input

  return {
    title: typeof parsed.title === 'string' ? parsed.title : (currentTitle || ''),
    slug: typeof parsed.slug === 'string' ? normalizePostSlug(parsed.slug) : currentMeta.slug,
    description: typeof parsed.description === 'string' ? parsed.description : currentMeta.description,
    tags: Array.isArray(parsed.tags) ? parsed.tags : currentMeta.tags,
    coverImage: typeof parsed.coverImage === 'string' ? parsed.coverImage : currentMeta.coverImage,
    category: typeof parsed.category === 'string' && parsed.category.trim()
      ? parsed.category.trim()
      : currentMeta.category,
  }
}
