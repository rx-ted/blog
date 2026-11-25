import { useCallback, useRef, useState } from 'react'
import type { EditorInstance } from 'novel'
import { renderMarkdownToEditorHtml } from '@/lib/editor-markdown'
import { parseImportedMarkdown } from '@/lib/import-markdown-post'
import { resolveImportedMarkdownDraftMeta } from '@/components/editor/shared/utils/import-markdown'
import { resizeTextareaHeight } from '@/lib/textarea-autosize'
import { IMPORT_MARKDOWN_STORAGE_KEY } from '@/components/editor/shared'
import { buildEditorAutosaveSnapshot } from '@/components/editor/shared/utils/autosave'
import { normalizeWechatPublishingHtml } from '@/lib/wechat-publishing-enhancements'
import { createNovelEditorAdapter } from '@/components/editor/novel/adapters/novel.adapter'
import type { EditorAdapter } from '@/components/editor/shared/types/editor'
import type {
  DraftMetaState,
  SaveFeedback,
  SaveState,
} from '@/components/editor/shared'

interface UseNovelContentOptions {
  editorRef: React.RefObject<EditorInstance | null>
  latestTitleRef: React.RefObject<string>
  titleRef: React.RefObject<HTMLTextAreaElement | null>
  latestMetaRef: React.RefObject<DraftMetaState>
  initialData?: {
    title?: string
    html?: string
    slug?: string
    description?: string | null
    category?: string
    tags?: string[]
    cover_image?: string | null
  }
  skipNextEditorUpdateRef: React.MutableRefObject<boolean>
  markdownImportInputRef: React.RefObject<HTMLInputElement | null>
  patchMetadata: (metaOverrides?: Partial<DraftMetaState>) => void
  setTitle: (title: string) => void
  setFeedback: React.Dispatch<React.SetStateAction<SaveFeedback>>
  setSaveState: React.Dispatch<React.SetStateAction<SaveState>>
  setCharCount: React.Dispatch<React.SetStateAction<number>>
  refreshToc: (editor: EditorInstance | null) => void
  scheduleDraftSave: (
    nextTitle?: string,
    editor?: EditorInstance | null,
  ) => void
  clearAutosaveTimers: () => void
  abortAutosaveRequest: () => void
  lastAutosaveSnapshotRef: React.RefObject<string | null>
  novelAdapterRef?: React.MutableRefObject<EditorAdapter<EditorInstance> | null>
}

export function useNovelContent({
  editorRef,
  latestTitleRef,
  titleRef,
  latestMetaRef,
  initialData,
  skipNextEditorUpdateRef,
  markdownImportInputRef,
  patchMetadata,
  setTitle,
  setFeedback,
  setSaveState,
  setCharCount,
  refreshToc,
  scheduleDraftSave,
  clearAutosaveTimers,
  abortAutosaveRequest,
  lastAutosaveSnapshotRef,
  novelAdapterRef,
}: UseNovelContentOptions) {
  const pendingImportedMarkdownRef = useRef<string | null>(null)
  const pendingImportConsumedRef = useRef(false)
  const [previewHtml, setPreviewHtml] = useState(
    initialData?.html ? normalizeWechatPublishingHtml(initialData.html) : '',
  )

  const syncEditorContentState = useCallback(
    (editor: EditorInstance) => {
      scheduleDraftSave(latestTitleRef.current ?? '', editor)
      setPreviewHtml(editor.getHTML())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const st = editor.storage as any
      setCharCount(st.characterCount?.characters?.() ?? 0)
      refreshToc(editor)
    },
    [latestTitleRef, refreshToc, scheduleDraftSave, setCharCount],
  )

  const applyImportedMarkdown = useCallback(
    (markdownText: string) => {
      const editor = editorRef.current
      if (!editor) {
        throw new Error('编辑器还没有准备好')
      }

      const parsed = parseImportedMarkdown(markdownText)
      const currentMeta = latestMetaRef.current
      const {
        title: nextTitle,
        slug: nextSlug,
        description: nextDescription,
        tags: nextTags,
        coverImage: nextCoverImage,
        category: nextCategory,
      } = resolveImportedMarkdownDraftMeta({
        parsed,
        currentTitle: latestTitleRef.current || '',
        currentMeta,
      })

      latestTitleRef.current = nextTitle
      setTitle(nextTitle)
      patchMetadata({
        slug: nextSlug,
        category: nextCategory,
        tags: nextTags,
        description: nextDescription,
        coverImage: nextCoverImage,
      })

      const bodyMarkdown = parsed.body || ''
      const bodyHtml = bodyMarkdown.trim()
        ? renderMarkdownToEditorHtml(bodyMarkdown)
        : ''
      skipNextEditorUpdateRef.current = true
      if (bodyHtml) {
        editor.commands.setContent(bodyHtml)
      } else {
        editor.commands.clearContent()
      }

      lastAutosaveSnapshotRef.current = null
      setPreviewHtml(editor.getHTML())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const st = editor.storage as any
      setCharCount(st.characterCount?.characters?.() ?? 0)
      refreshToc(editor)
      setFeedback(null)
      clearAutosaveTimers()
      abortAutosaveRequest()
      setSaveState('dirty')
      scheduleDraftSave(nextTitle, editor)

      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          resizeTextareaHeight(titleRef.current)
        })
      }
    },
    [
      abortAutosaveRequest,
      clearAutosaveTimers,
      editorRef,
      lastAutosaveSnapshotRef,
      latestMetaRef,
      latestTitleRef,
      patchMetadata,
      refreshToc,
      scheduleDraftSave,
      setCharCount,
      setFeedback,
      setSaveState,
      setTitle,
      skipNextEditorUpdateRef,
      titleRef,
    ],
  )

  const handleImportedMarkdownFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text()
        if (!text && file.size === 0) {
          setFeedback({ type: 'error', message: '导入的文件是空的' })
          return
        }
        applyImportedMarkdown(text)
        setFeedback({ type: 'success', message: '已导入 Markdown 内容' })
      } catch (error) {
        setFeedback({
          type: 'error',
          message: error instanceof Error ? error.message : '导入失败',
        })
      } finally {
        if (markdownImportInputRef.current) {
          markdownImportInputRef.current.value = ''
        }
      }
    },
    [applyImportedMarkdown, markdownImportInputRef, setFeedback],
  )

  const handleEditorCreate = useCallback(
    ({ editor }: { editor: EditorInstance }) => {
      editorRef.current = editor
      if (novelAdapterRef) {
        novelAdapterRef.current = createNovelEditorAdapter(editor)
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const st = editor.storage as any
      setCharCount(st.characterCount?.characters?.() ?? 0)

      let pendingMarkdown: string | null = pendingImportedMarkdownRef.current
      if (!pendingMarkdown && typeof window !== 'undefined') {
        try {
          const params = new URLSearchParams(window.location.search)
          if (params.get('import') === 'pending') {
            const raw = window.sessionStorage.getItem(
              IMPORT_MARKDOWN_STORAGE_KEY,
            )
            if (raw) {
              try {
                const parsed = JSON.parse(raw) as { markdown?: string }
                pendingMarkdown =
                  typeof parsed?.markdown === 'string' ? parsed.markdown : raw
              } catch {
                pendingMarkdown = raw
              }
            }
          }
        } catch {}
      }

      const shouldApplyPendingImport =
        Boolean(pendingMarkdown) && !pendingImportConsumedRef.current

      if (initialData?.html && !shouldApplyPendingImport) {
        const initialHtmlNormalized = normalizeWechatPublishingHtml(
          initialData.html,
        )
        skipNextEditorUpdateRef.current = true
        editor.commands.setContent(initialHtmlNormalized)
        setPreviewHtml(initialHtmlNormalized)
      } else if (!shouldApplyPendingImport) {
        skipNextEditorUpdateRef.current = false
        setPreviewHtml(editor.getHTML())
      }

      if (initialData?.slug && !shouldApplyPendingImport) {
        lastAutosaveSnapshotRef.current = buildEditorAutosaveSnapshot({
          currentSlug: initialData.slug,
          nextSlug: initialData.slug,
          title: initialData.title || '无标题',
          html: normalizeWechatPublishingHtml(initialData.html || ''),
          description: (initialData.description || '').trim(),
          category: initialData.category || '未分类',
          tags: initialData.tags || [],
          coverImage: initialData.cover_image || '',
        })
      } else {
        lastAutosaveSnapshotRef.current = null
      }

      refreshToc(editor)

      if (shouldApplyPendingImport && pendingMarkdown) {
        pendingImportConsumedRef.current = true
        pendingImportedMarkdownRef.current = null
        try {
          applyImportedMarkdown(pendingMarkdown)
          setFeedback({ type: 'success', message: '已导入 Markdown 内容' })
        } catch (error) {
          setFeedback({
            type: 'error',
            message: error instanceof Error ? error.message : '导入失败',
          })
        } finally {
          try {
            window.sessionStorage.removeItem(IMPORT_MARKDOWN_STORAGE_KEY)
            const params = new URLSearchParams(window.location.search)
            if (params.get('import') === 'pending') {
              params.delete('import')
              const qs = params.toString()
              window.history.replaceState(
                {},
                '',
                qs ? `/editor?${qs}` : '/editor',
              )
            }
          } catch {}
        }
      }
    },
    [
      applyImportedMarkdown,
      editorRef,
      initialData,
      lastAutosaveSnapshotRef,
      novelAdapterRef,
      refreshToc,
      setCharCount,
      setFeedback,
      skipNextEditorUpdateRef,
    ],
  )

  return {
    previewHtml,
    syncEditorContentState,
    applyImportedMarkdown,
    handleImportedMarkdownFile,
    handleEditorCreate,
  }
}
