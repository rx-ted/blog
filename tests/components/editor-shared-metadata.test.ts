import { describe, expect, it } from 'vitest'
import { createEmptyDraftMetaState } from '@/components/editor/shared/hooks/useEditorMetadata'

describe('createEmptyDraftMetaState', () => {
  it('returns empty defaults when no initial data is provided', () => {
    expect(createEmptyDraftMetaState()).toEqual({
      postId: null,
      editSlug: null,
      slug: '',
      category: '未分类',
      tags: [],
      description: '',
      coverImage: '',
    })
  })

  it('maps initial data to draft meta state', () => {
    expect(createEmptyDraftMetaState({
      id: 42,
      slug: 'hello-world',
      category: 'Tech',
      tags: ['a'],
      description: 'desc',
      cover_image: 'https://example.com/c.png',
    })).toEqual({
      postId: 42,
      editSlug: 'hello-world',
      slug: 'hello-world',
      category: 'Tech',
      tags: ['a'],
      description: 'desc',
      coverImage: 'https://example.com/c.png',
    })
  })
})
