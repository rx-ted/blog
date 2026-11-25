import { useCallback, useEffect, useRef, useState } from 'react'
import type { EditorInstance } from 'novel'
import {
  htmlToMarkdownBody,
  renderMarkdownToEditorHtml,
} from '@/lib/editor-markdown'
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
  EditorViewMode,
  SaveFeedback,
  SaveState,
} from '@/components/editor/shared'

interface UseNovelContentOptions {
  editorRef: React.RefObject<EditorInstance | null>
  latestTitleRef: React.RefObject<string>
  titleRef: React.RefObject<HTMLTextAreaElement | null>
  latestMetaRef: React.RefObject<DraftMetaState>
  initialHtml?: string
  initialData?: {
    title?: string
    html?: string
    slug?: string
    description?: string | null
    category?: string
    tags?: string[]
    cover_image?: string | null
  }
  editorViewModeRef: React.MutableRefObject<EditorViewMode>
  sourceMarkdownRef: React.MutableRefObject<string>
  lastContentModeRef: React.MutableRefObject<'source' | 'wysiwyg'>
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
  initialHtml,
  initialData,
  editorViewModeRef,
  sourceMarkdownRef,
  lastContentModeRef,
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
  const [editorViewMode, setEditorViewMode] =
    useState<EditorViewMode>('wysiwyg')
  const [sourceMarkdown, setSourceMarkdown] = useState('')
  const [previewHtml, setPreviewHtml] = useState(initialHtml || '')

  useEffect(() => {
    editorViewModeRef.current = editorViewMode
  }, [editorViewMode])

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
      sourceMarkdownRef.current = ''
      setSourceMarkdown('')
      lastContentModeRef.current = 'wysiwyg'
      editorViewModeRef.current = 'wysiwyg'
      setEditorViewMode('wysiwyg')
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
    [applyImportedMarkdown, setFeedback],
  )

  const switchToSourceMode = useCallback(() => {
    const editor = editorRef.current
    if (!editor || editorViewModeRef.current === 'source') return

    if (
      editorViewModeRef.current !== 'preview' ||
      lastContentModeRef.current === 'wysiwyg'
    ) {
      const markdown = htmlToMarkdownBody(editor.getHTML())
      sourceMarkdownRef.current = markdown
      setSourceMarkdown(markdown)
    }

    lastContentModeRef.current = 'source'
    editorViewModeRef.current = 'source'
    setEditorViewMode('source')
  }, [editorRef])

  const switchToPreviewMode = useCallback(() => {
    const editor = editorRef.current
    if (!editor || editorViewModeRef.current === 'preview') return

    if (editorViewModeRef.current === 'source') {
      const markdown = sourceMarkdownRef.current || ''
      const html = markdown.trim() ? renderMarkdownToEditorHtml(markdown) : ''
      setPreviewHtml(html)
    } else {
      setPreviewHtml(editor.getHTML())
    }

    editorViewModeRef.current = 'preview'
    setEditorViewMode('preview')
  }, [editorRef])

  const switchToWysiwygMode = useCallback(() => {
    const editor = editorRef.current
    if (!editor || editorViewModeRef.current === 'wysiwyg') return

    if (
      editorViewModeRef.current === 'source' ||
      (editorViewModeRef.current === 'preview' &&
        lastContentModeRef.current === 'source')
    ) {
      const markdown = sourceMarkdownRef.current || ''
      const html = markdown.trim() ? renderMarkdownToEditorHtml(markdown) : ''
      skipNextEditorUpdateRef.current = true
      if (html) {
        editor.commands.setContent(html)
      } else {
        editor.commands.clearContent()
      }
      setPreviewHtml(editor.getHTML())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const st = editor.storage as any
      setCharCount(st.characterCount?.characters?.() ?? 0)
      refreshToc(editor)
      clearAutosaveTimers()
      setSaveState('dirty')
      scheduleDraftSave(latestTitleRef.current ?? '', editor)
    } else {
      setPreviewHtml(editor.getHTML())
    }

    lastContentModeRef.current = 'wysiwyg'
    editorViewModeRef.current = 'wysiwyg'
    setEditorViewMode('wysiwyg')
  }, [
    clearAutosaveTimers,
    editorRef,
    latestTitleRef,
    refreshToc,
    scheduleDraftSave,
    setCharCount,
    setSaveState,
  ])

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
      setPreviewHtml,
      skipNextEditorUpdateRef,
    ],
  )

  return {
    editorViewMode,
    setEditorViewMode,
    sourceMarkdown,
    setSourceMarkdown,
    previewHtml,
    setPreviewHtml,
    editorViewModeRef,
    sourceMarkdownRef,
    lastContentModeRef,
    skipNextEditorUpdateRef,
    markdownImportInputRef,
    syncEditorContentState,
    applyImportedMarkdown,
    handleImportedMarkdownFile,
    handleEditorCreate,
    switchToSourceMode,
    switchToPreviewMode,
    switchToWysiwygMode,
  }
}
