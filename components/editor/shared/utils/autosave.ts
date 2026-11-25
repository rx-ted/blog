import { buildAutoDescription, normalizePostSlug } from '@/lib/post-utils'
import type { SaveState } from '@/components/editor/shared'

export interface EditorAutosaveSnapshotPayload {
  currentSlug: string | null
  nextSlug: string
  title: string
  html: string
  description: string
  category: string
  tags: string[]
  coverImage: string
}

export function buildEditorAutosaveSnapshot(payload: EditorAutosaveSnapshotPayload): string {
  return JSON.stringify({
    currentSlug: payload.currentSlug,
    nextSlug: payload.nextSlug,
    title: payload.title,
    html: payload.html,
    description: payload.description,
    category: payload.category,
    tags: payload.tags,
    coverImage: payload.coverImage,
  })
}

export function editorHtmlHasMedia(html: string): boolean {
  return /<(img|video|audio|iframe)\b/i.test(html)
}

export interface EditorAutosaveDraftInput {
  title: string
  plainText: string
  html: string
  description: string
  coverImage: string
  tags: string[]
  category: string
  nextSlug: string
}

export interface EditorAutosaveDraftState {
  trimmedTitle: string
  hasMedia: boolean
  hasBody: boolean
  normalizedDescription: string
  canAutosave: boolean
  hasAnyDraftInput: boolean
  blockedSaveState: 'saved' | 'dirty'
}

export function resolveEditorAutosaveDraftState(input: EditorAutosaveDraftInput): EditorAutosaveDraftState {
  const trimmedTitle = input.title.trim()
  const hasMedia = editorHtmlHasMedia(input.html)
  const hasBody = Boolean(input.plainText || hasMedia)
  const normalizedDescription = (input.description || buildAutoDescription(input.plainText) || '').trim()
  const canAutosave = Boolean(trimmedTitle) && hasBody
  const hasAnyDraftInput = Boolean(
    trimmedTitle ||
    hasBody ||
    normalizedDescription ||
    input.coverImage ||
    (input.tags && input.tags.length > 0) ||
    (input.category && input.category !== '未分类') ||
    input.nextSlug,
  )

  return {
    trimmedTitle,
    hasMedia,
    hasBody,
    normalizedDescription,
    canAutosave,
    hasAnyDraftInput,
    blockedSaveState: hasAnyDraftInput ? 'dirty' : 'saved',
  }
}

export interface EditorSaveMetadataInput {
  title: string
  slug: string
  description: string
  fallbackContent: string
}

export interface EditorSaveMetadata {
  normalizedTitle: string
  normalizedSlug: string
  normalizedDescription: string
}

export function resolveEditorSaveMetadata(input: EditorSaveMetadataInput): EditorSaveMetadata {
  return {
    normalizedTitle: input.title.trim(),
    normalizedSlug: normalizePostSlug(input.slug),
    normalizedDescription: (input.description || buildAutoDescription(input.fallbackContent) || '').trim(),
  }
}

export function resolveDirtySaveState(current: SaveState): SaveState {
  return current === 'saving' ? current : 'dirty'
}
