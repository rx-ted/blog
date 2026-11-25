import { useCallback } from 'react'
import type { EditorInstance } from 'novel'
import { generatePassword } from '@/lib/password'
import {
  createEditorDraftDocumentKey,
  type DraftMetaState,
  type PublishStatus,
  type SaveFeedback,
  type SaveState,
} from '@/components/editor/shared'
import {
  buildEditorAutosaveSnapshot,
  resolveEditorSaveMetadata,
} from '@/components/editor/shared/utils/autosave'

interface UseNovelSaveOptions {
  editorRef: React.RefObject<EditorInstance | null>
  title: string
  slug: string
  description: string
  category: string
  tags: string[]
  coverImage: string
  publishStatus: PublishStatus
  editSlug: string | null
  postId: number | null
  initialPassword?: string | null
  latestTitleRef: React.MutableRefObject<string>
  latestMetaRef: React.RefObject<DraftMetaState>
  titleRef: React.RefObject<HTMLTextAreaElement | null>
  draftAiDocumentKeyRef: React.MutableRefObject<string>
  lastAutosaveSnapshotRef: React.MutableRefObject<string | null>
  skipNextEditorUpdateRef: React.MutableRefObject<boolean>
  clearAutosaveTimers: () => void
  abortAutosaveRequest: () => void
  patchMetadata: (metaOverrides?: Partial<DraftMetaState>) => void
  syncPersistedSlug: (
    persistedSlug: string,
    previousSlug: string | null,
    forceVisibleSync?: boolean,
  ) => void
  resetMetadata: () => void
  setTitle: (title: string) => void
  setDescription: React.Dispatch<React.SetStateAction<string>>
  setCharCount: React.Dispatch<React.SetStateAction<number>>
  setPublishStatus: React.Dispatch<React.SetStateAction<PublishStatus>>
  setPublishPanelOpen: React.Dispatch<React.SetStateAction<boolean>>
  setWechatPublishOpen: React.Dispatch<React.SetStateAction<boolean>>
  setSaving: React.Dispatch<React.SetStateAction<boolean>>
  setPendingMetadataTargets: React.Dispatch<React.SetStateAction<any[]>>
  setFeedback: React.Dispatch<React.SetStateAction<SaveFeedback>>
  setSaveState: React.Dispatch<React.SetStateAction<SaveState>>
  setLastSavedAt: React.Dispatch<React.SetStateAction<number>>
  setReferenceImageTarget: React.Dispatch<React.SetStateAction<any>>
  setCropImageTarget: React.Dispatch<React.SetStateAction<any>>
}

export function useNovelSave({
  editorRef,
  title,
  slug,
  description,
  category,
  tags,
  coverImage,
  publishStatus,
  editSlug,
  postId,
  initialPassword,
  latestTitleRef,
  latestMetaRef,
  titleRef,
  draftAiDocumentKeyRef,
  lastAutosaveSnapshotRef,
  skipNextEditorUpdateRef,
  clearAutosaveTimers,
  abortAutosaveRequest,
  patchMetadata,
  syncPersistedSlug,
  resetMetadata,
  setTitle,
  setDescription,
  setCharCount,
  setPublishStatus,
  setPublishPanelOpen,
  setWechatPublishOpen,
  setSaving,
  setPendingMetadataTargets,
  setFeedback,
  setSaveState,
  setLastSavedAt,
  setReferenceImageTarget,
  setCropImageTarget,
}: UseNovelSaveOptions) {
  const handleSave = useCallback(async () => {
    const editor = editorRef.current
    const normalizedTitle = title.trim()
    if (!normalizedTitle) {
      setFeedback({ type: 'error', message: '先把文章标题写上。' })
      return
    }
    if (!editor) {
      setFeedback({ type: 'error', message: '编辑器还没准备好。' })
      return
    }

    const content = editor.getText({ blockSeparator: '\n\n' }).trim()
    const html = editor.getHTML()

    const hasContent = content || /<(img|video|audio|iframe)\b/i.test(html)
    if (!hasContent) {
      setFeedback({ type: 'error', message: '正文还是空的。' })
      return
    }
    const { normalizedSlug, normalizedDescription } = resolveEditorSaveMetadata(
      {
        title,
        slug,
        description,
        fallbackContent: content,
      },
    )

    clearAutosaveTimers()
    abortAutosaveRequest()

    setSaving(true)
    setSaveState('saving')
    setFeedback(null)

    try {
      const currentPostId = latestMetaRef.current.postId ?? postId
      const currentEditSlug = latestMetaRef.current.editSlug ?? editSlug
      const isEdit = currentEditSlug !== null
      const url = isEdit ? `/api/admin/posts/${currentEditSlug}` : '/api/posts'
      const method = isEdit ? 'PUT' : 'POST'

      let statusFields: {
        status: string
        is_hidden: number
        password?: string | null
      }
      if (publishStatus === 'encrypted') {
        statusFields = {
          status: 'published',
          is_hidden: 0,
          password: initialPassword || generatePassword(),
        }
      } else {
        const m = {
          public: { status: 'published', is_hidden: 0, password: null },
          draft: { status: 'draft', is_hidden: 0, password: null },
          unlisted: { status: 'published', is_hidden: 1, password: null },
        }
        statusFields = m[publishStatus as 'public' | 'draft' | 'unlisted']
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentPostId ?? undefined,
          slug: normalizedSlug || (isEdit ? currentEditSlug : undefined),
          title: normalizedTitle,
          content,
          html,
          category,
          ...statusFields,
          tags,
          description: normalizedDescription,
          cover_image: coverImage || null,
        }),
      })
      const result = (await response.json()) as {
        success?: boolean
        id?: number
        slug?: string
        error?: string
      }
      if (!response.ok || !result.success)
        throw new Error(result.error || '保存失败')

      if (typeof result.id === 'number') {
        patchMetadata({ postId: result.id })
      }
      const persistedSlug: string | null =
        typeof result.slug === 'string'
          ? result.slug
          : isEdit
            ? currentEditSlug
            : null
      const snapshot = buildEditorAutosaveSnapshot({
        currentSlug: persistedSlug,
        nextSlug: persistedSlug || '',
        title: normalizedTitle,
        html,
        description: normalizedDescription,
        category,
        tags,
        coverImage,
      })
      lastAutosaveSnapshotRef.current = snapshot

      setSaveState('saved')
      setLastSavedAt(Date.now())

      if (isEdit) {
        if (!description && normalizedDescription) {
          setDescription(normalizedDescription)
        }
        if (persistedSlug) {
          syncPersistedSlug(persistedSlug, currentEditSlug, true)
        }
        setFeedback({
          type: 'success',
          message: '文章已更新。',
          slug: persistedSlug || currentEditSlug || undefined,
          published: publishStatus !== 'draft',
          canStartNew: true,
        })
      } else {
        if (!description && normalizedDescription) {
          setDescription(normalizedDescription)
        }
        const msgs = {
          public: '已发布',
          draft: '草稿已保存',
          encrypted: '已发布（加密）',
          unlisted: '已发布（链接访问）',
        }
        setFeedback({
          type: 'success',
          message: `${msgs[publishStatus]}`,
          slug: result.slug,
          published: publishStatus !== 'draft',
          canStartNew: true,
        })
        setTitle('')
        latestTitleRef.current = ''
        lastAutosaveSnapshotRef.current = null
        editor.commands.clearContent()
      }
      setPublishPanelOpen(false)
    } catch (error) {
      setSaveState('error')
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : '保存失败',
      })
    } finally {
      setSaving(false)
    }
  }, [
    abortAutosaveRequest,
    category,
    clearAutosaveTimers,
    coverImage,
    description,
    editSlug,
    editorRef,
    initialPassword,
    lastAutosaveSnapshotRef,
    latestMetaRef,
    latestTitleRef,
    patchMetadata,
    postId,
    publishStatus,
    setDescription,
    setFeedback,
    setLastSavedAt,
    setPublishPanelOpen,
    setSaveState,
    setSaving,
    setTitle,
    slug,
    syncPersistedSlug,
    tags,
    title,
  ])

  const handleStartNewArticle = useCallback(() => {
    clearAutosaveTimers()
    abortAutosaveRequest()

    const editor = editorRef.current
    resetMetadata()
    setTitle('')
    latestTitleRef.current = ''
    setCharCount(0)
    setPublishStatus('public')
    setPublishPanelOpen(false)
    setWechatPublishOpen(false)
    setSaving(false)
    setPendingMetadataTargets([])
    setFeedback(null)
    setSaveState('saved')
    setLastSavedAt(Date.now())
    setReferenceImageTarget(null)
    setCropImageTarget(null)

    draftAiDocumentKeyRef.current = createEditorDraftDocumentKey()
    lastAutosaveSnapshotRef.current = null

    skipNextEditorUpdateRef.current = true
    editor?.commands.clearContent()
    window.history.replaceState({}, '', '/editor?new=1')
    window.requestAnimationFrame(() => titleRef.current?.focus())
  }, [
    abortAutosaveRequest,
    clearAutosaveTimers,
    draftAiDocumentKeyRef,
    editorRef,
    lastAutosaveSnapshotRef,
    latestTitleRef,
    resetMetadata,
    setCharCount,
    setCropImageTarget,
    setFeedback,
    setLastSavedAt,
    setPendingMetadataTargets,
    setPublishPanelOpen,
    setPublishStatus,
    setReferenceImageTarget,
    setSaveState,
    setSaving,
    setTitle,
    setWechatPublishOpen,
    skipNextEditorUpdateRef,
    titleRef,
  ])

  return { handleSave, handleStartNewArticle }
}
