import { describe, expect, it } from 'vitest'
import { resolveImportedMarkdownDraftMeta } from '@/components/editor/shared/utils/import-markdown'

const currentMeta = {
  slug: 'current-slug',
  description: 'current description',
  tags: ['current'],
  coverImage: 'https://example.com/current.png',
  category: 'Current',
}

describe('resolveImportedMarkdownDraftMeta', () => {
  it('uses parsed frontmatter values when present', () => {
    const result = resolveImportedMarkdownDraftMeta({
      parsed: {
        body: '# Hello',
        title: 'Imported Title',
        slug: 'Imported Slug!',
        description: 'Imported description',
        tags: ['a', 'b'],
        coverImage: 'https://example.com/new.png',
        category: '  News  ',
      },
      currentTitle: 'Old Title',
      currentMeta,
    })

    expect(result).toEqual({
      title: 'Imported Title',
      slug: 'importedslug',
      description: 'Imported description',
      tags: ['a', 'b'],
      coverImage: 'https://example.com/new.png',
      category: 'News',
    })
  })

  it('falls back to current meta/title when parsed fields are missing', () => {
    const result = resolveImportedMarkdownDraftMeta({
      parsed: { body: 'Body only' },
      currentTitle: 'Existing Title',
      currentMeta,
    })

    expect(result).toEqual({
      title: 'Existing Title',
      slug: 'current-slug',
      description: 'current description',
      tags: ['current'],
      coverImage: 'https://example.com/current.png',
      category: 'Current',
    })
  })

  it('keeps current category when parsed category is blank string', () => {
    const result = resolveImportedMarkdownDraftMeta({
      parsed: { body: 'Body', category: '   ' },
      currentTitle: '',
      currentMeta,
    })

    expect(result.category).toBe('Current')
  })

  it('allows explicit empty string fields when parser provides them as strings', () => {
    const result = resolveImportedMarkdownDraftMeta({
      parsed: {
        body: 'Body',
        title: '',
        slug: '',
        description: '',
        coverImage: '',
        tags: [],
      },
      currentTitle: 'Fallback Title',
      currentMeta,
    })

    expect(result.title).toBe('')
    expect(result.slug).toBe('')
    expect(result.description).toBe('')
    expect(result.coverImage).toBe('')
    expect(result.tags).toEqual([])
  })
})
