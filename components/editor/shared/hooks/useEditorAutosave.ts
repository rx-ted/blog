import { useCallback, useEffect, useRef } from 'react'
import { normalizePostSlug } from '@/lib/post-utils'
import type { DraftMetaState, SaveState } from '@/components/editor/shared'
import {
  AUTOSAVE_DEBOUNCE_MS,
  AUTOSAVE_MAX_RETRY_DELAY_MS,
} from '@/components/editor/shared'
import {
  buildEditorAutosaveSnapshot,
  resolveEditorAutosaveDraftState,
} from '@/components/editor/shared/utils/autosave'

export interface EditorAutosaveContent {
  contentJson: unknown
  html: string
  plainText: string
}

export interface UseEditorAutosaveOptions<TEditor> {
  draftReady: boolean
  editorRef: React.RefObject<TEditor | null>
  latestTitleRef: React.RefObject<string>
  latestMetaRef: React.RefObject<DraftMetaState>
  getEditorContent: (editor: TEditor) => EditorAutosaveContent
  patchMetadata: (metaOverrides?: Partial<DraftMetaState>) => void
  syncPersistedSlug: (
    persistedSlug: string,
    previousSlug: string | null,
    forceVisibleSync?: boolean,
  ) => void
  setSaveState: React.Dispatch<React.SetStateAction<SaveState>>
  setLastSavedAt: React.Dispatch<React.SetStateAction<number>>
}

export function useEditorAutosave<TEditor>({
  draftReady,
  editorRef,
  latestTitleRef,
  latestMetaRef,
  getEditorContent,
  patchMetadata,
  syncPersistedSlug,
  setSaveState,
  setLastSavedAt,
}: UseEditorAutosaveOptions<TEditor>) {
  const draftSaveTimerRef = useRef<number | null>(null)
  const retrySaveTimerRef = useRef<number | null>(null)
  const autosaveAbortRef = useRef<AbortController | null>(null)
  const autosaveSeqRef = useRef(0)
  const lastAutosaveSnapshotRef = useRef<string | null>(null)

  const getEditorContentRef = useRef(getEditorContent)
  getEditorContentRef.current = getEditorContent

  const clearAutosaveTimers = useCallback(() => {
    if (draftSaveTimerRef.current !== null) {
      window.clearTimeout(draftSaveTimerRef.current)
      draftSaveTimerRef.current = null
    }
    if (retrySaveTimerRef.current !== null) {
      window.clearTimeout(retrySaveTimerRef.current)
      retrySaveTimerRef.current = null
    }
  }, [])

  const abortAutosaveRequest = useCallback(() => {
    autosaveAbortRef.current?.abort()
    autosaveAbortRef.current = null
  }, [])

  const persistDraft = useCallback(
    async (
      nextTitle = latestTitleRef.current ?? '',
      editor = editorRef.current,
      retryAttempt = 0,
    ) => {
      if (typeof window === 'undefined' || !draftReady || !editor) return

      const {
        postId: currentPostId,
        editSlug: currentSlug,
        slug: nextSlugRaw,
        category,
        tags,
        description,
        coverImage,
      } = latestMetaRef.current
      const nextSlug = normalizePostSlug(nextSlugRaw)
      const { contentJson, html, plainText } =
        getEditorContentRef.current(editor)

      const draftState = resolveEditorAutosaveDraftState({
        title: nextTitle,
        plainText,
        html,
        description,
        coverImage,
        tags,
        category,
        nextSlug,
      })
      const normalizedDescription = draftState.normalizedDescription

      if (!draftState.canAutosave) {
        setSaveState(draftState.blockedSaveState)
        return
      }

      const normalizedTitle = draftState.trimmedTitle
      const snapshot = buildEditorAutosaveSnapshot({
        currentSlug,
        nextSlug,
        title: normalizedTitle,
        html,
        description: normalizedDescription,
        category,
        tags,
        coverImage,
      })

      if (snapshot === lastAutosaveSnapshotRef.current) {
        setSaveState('saved')
        return
      }

      const requestId = autosaveSeqRef.current + 1
      autosaveSeqRef.current = requestId

      abortAutosaveRequest()
      const controller = new AbortController()
      autosaveAbortRef.current = controller

      setSaveState('saving')

      try {
        if (currentPostId || currentSlug) {
          const res = await fetch('/api/posts', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              current_id: currentPostId ?? undefined,
              current_slug: currentSlug || undefined,
              new_slug:
                nextSlug && nextSlug !== currentSlug ? nextSlug : undefined,
              title: normalizedTitle,
              html,
              content: plainText || JSON.stringify(contentJson),
              description: normalizedDescription,
              category,
              tags,
              cover_image: coverImage,
            }),
            signal: controller.signal,
          })

          const data = (await res.json().catch(() => ({}))) as {
            error?: string
            id?: number
            slug?: string
          }
          if (!res.ok) {
            throw new Error(data.error || '自动保存失败')
          }

          if (requestId !== autosaveSeqRef.current) return

          if (typeof data.id === 'number') {
            patchMetadata({ postId: data.id })
          }
          const persistedSlug =
            typeof data.slug === 'string' ? data.slug : currentSlug || nextSlug
          if (
            persistedSlug !== currentSlug ||
            latestMetaRef.current.slug !== persistedSlug
          ) {
            syncPersistedSlug(persistedSlug, currentSlug)
          }
        } else {
          const res = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: normalizedTitle,
              html,
              content: plainText || JSON.stringify(contentJson),
              category,
              status: 'draft',
              tags,
              description: normalizedDescription,
              cover_image: coverImage,
            }),
            signal: controller.signal,
          })

          const data = (await res.json().catch(() => ({}))) as {
            error?: string
            id?: number
            slug?: string
          }
          if (!res.ok) {
            throw new Error(data.error || '自动保存失败')
          }

          if (requestId !== autosaveSeqRef.current) return

          if (typeof data.id === 'number') {
            patchMetadata({ postId: data.id })
          }
          if (typeof data.slug === 'string' && data.slug) {
            syncPersistedSlug(data.slug, null, true)
          }
        }

        if (requestId !== autosaveSeqRef.current) return

        lastAutosaveSnapshotRef.current = snapshot
        setSaveState('saved')
        setLastSavedAt(Date.now())
      } catch (error) {
        if (controller.signal.aborted) return
        if (requestId !== autosaveSeqRef.current) return

        console.error('Auto-save failed:', error)
        setSaveState('error')

        const nextAttempt = retryAttempt + 1
        const delay = Math.min(
          AUTOSAVE_MAX_RETRY_DELAY_MS,
          2000 * 2 ** retryAttempt,
        )
        retrySaveTimerRef.current = window.setTimeout(() => {
          if (editorRef.current) {
            void persistDraft(
              latestTitleRef.current ?? '',
              editorRef.current,
              nextAttempt,
            )
          }
        }, delay)
      } finally {
        if (autosaveAbortRef.current === controller) {
          autosaveAbortRef.current = null
        }
      }
    },
    [
      abortAutosaveRequest,
      draftReady,
      editorRef,
      latestMetaRef,
      latestTitleRef,
      patchMetadata,
      setLastSavedAt,
      setSaveState,
      syncPersistedSlug,
    ],
  )

  const scheduleDraftSave = useCallback(
    (nextTitle = latestTitleRef.current ?? '', editor = editorRef.current) => {
      if (typeof window === 'undefined' || !draftReady || !editor) return

      if (latestTitleRef.current !== undefined) {
        latestTitleRef.current = nextTitle
      }
      clearAutosaveTimers()
      setSaveState((prev) => (prev === 'saving' ? prev : 'dirty'))

      draftSaveTimerRef.current = window.setTimeout(() => {
        void persistDraft(nextTitle, editor)
      }, AUTOSAVE_DEBOUNCE_MS)
    },
    [
      clearAutosaveTimers,
      draftReady,
      editorRef,
      latestTitleRef,
      persistDraft,
      setSaveState,
    ],
  )

  useEffect(() => {
    return () => {
      clearAutosaveTimers()
      abortAutosaveRequest()
    }
  }, [abortAutosaveRequest, clearAutosaveTimers])

  const resetAutosaveSnapshot = useCallback(() => {
    lastAutosaveSnapshotRef.current = null
  }, [])

  return {
    clearAutosaveTimers,
    abortAutosaveRequest,
    persistDraft,
    scheduleDraftSave,
    lastAutosaveSnapshotRef,
    resetAutosaveSnapshot,
  }
}
