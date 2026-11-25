import { describe, expect, it } from 'vitest'
import {
  buildEditorAutosaveSnapshot,
  editorHtmlHasMedia,
  resolveDirtySaveState,
  resolveEditorAutosaveDraftState,
  resolveEditorSaveMetadata,
} from '@/components/editor/shared/utils/autosave'

describe('editor shared autosave utils', () => {
  it('builds a stable snapshot payload', () => {
    const snapshot = buildEditorAutosaveSnapshot({
      currentSlug: 'old-slug',
      nextSlug: 'new-slug',
      title: 'Title',
      html: '<p>Hello</p>',
      description: 'Desc',
      category: 'Tech',
      tags: ['a', 'b'],
      coverImage: 'https://example.com/cover.png',
    })

    expect(JSON.parse(snapshot)).toEqual({
      currentSlug: 'old-slug',
      nextSlug: 'new-slug',
      title: 'Title',
      html: '<p>Hello</p>',
      description: 'Desc',
      category: 'Tech',
      tags: ['a', 'b'],
      coverImage: 'https://example.com/cover.png',
    })
  })

  it('preserves null currentSlug for new drafts', () => {
    const snapshot = buildEditorAutosaveSnapshot({
      currentSlug: null,
      nextSlug: '',
      title: '',
      html: '',
      description: '',
      category: '未分类',
      tags: [],
      coverImage: '',
    })

    expect(JSON.parse(snapshot).currentSlug).toBeNull()
  })
})

describe('editor autosave draft state', () => {
  it('detects media html as body content', () => {
    expect(editorHtmlHasMedia('<p><img src="x.png"></p>')).toBe(true)
    expect(editorHtmlHasMedia('<p>hello</p>')).toBe(false)

    const state = resolveEditorAutosaveDraftState({
      title: 'Title',
      plainText: '',
      html: '<p><img src="x.png"></p>',
      description: '',
      coverImage: '',
      tags: [],
      category: '未分类',
      nextSlug: '',
    })

    expect(state.hasBody).toBe(true)
    expect(state.canAutosave).toBe(true)
  })

  it('treats empty draft as saved when there is no meaningful input', () => {
    const state = resolveEditorAutosaveDraftState({
      title: '   ',
      plainText: '',
      html: '<p></p>',
      description: '',
      coverImage: '',
      tags: [],
      category: '未分类',
      nextSlug: '',
    })

    expect(state.canAutosave).toBe(false)
    expect(state.hasAnyDraftInput).toBe(false)
    expect(state.blockedSaveState).toBe('saved')
  })

  it('marks incomplete draft as dirty when user has entered metadata', () => {
    const state = resolveEditorAutosaveDraftState({
      title: '',
      plainText: '',
      html: '',
      description: '',
      coverImage: '',
      tags: ['draft'],
      category: '未分类',
      nextSlug: '',
    })

    expect(state.canAutosave).toBe(false)
    expect(state.hasAnyDraftInput).toBe(true)
    expect(state.blockedSaveState).toBe('dirty')
  })

  it('normalizes description from explicit value or plain text fallback', () => {
    const explicit = resolveEditorAutosaveDraftState({
      title: 'T',
      plainText: 'Body text',
      html: '<p>Body text</p>',
      description: '  Custom desc  ',
      coverImage: '',
      tags: [],
      category: '未分类',
      nextSlug: '',
    })
    expect(explicit.normalizedDescription).toBe('Custom desc')

    const fallback = resolveEditorAutosaveDraftState({
      title: 'T',
      plainText: 'Body text',
      html: '<p>Body text</p>',
      description: '',
      coverImage: '',
      tags: [],
      category: '未分类',
      nextSlug: '',
    })
    expect(fallback.normalizedDescription).toBe('Body text')
  })
})

describe('editor save metadata normalization', () => {
  it('normalizes title, slug, and description for manual save', () => {
    expect(resolveEditorSaveMetadata({
      title: '  My Title  ',
      slug: '  My Slug! ',
      description: '  explicit  ',
      fallbackContent: 'ignored',
    })).toEqual({
      normalizedTitle: 'My Title',
      normalizedSlug: 'myslug',
      normalizedDescription: 'explicit',
    })
  })

  it('falls back to content-derived description only when description is empty', () => {
    expect(resolveEditorSaveMetadata({
      title: 'T',
      slug: '',
      description: '',
      fallbackContent: '  Some   content  ',
    }).normalizedDescription).toBe('Some content')

    // Whitespace-only description is treated as explicit input and does not fall back.
    expect(resolveEditorSaveMetadata({
      title: 'T',
      slug: '',
      description: '   ',
      fallbackContent: '  Some   content  ',
    }).normalizedDescription).toBe('')
  })
})

describe('editor dirty save state guard', () => {
  it('preserves saving state while save is in flight', () => {
    expect(resolveDirtySaveState('saving')).toBe('saving')
  })

  it('marks non-saving states dirty', () => {
    expect(resolveDirtySaveState('saved')).toBe('dirty')
    expect(resolveDirtySaveState('dirty')).toBe('dirty')
    expect(resolveDirtySaveState('error')).toBe('dirty')
  })
})
