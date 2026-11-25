'use client'

import dynamic from 'next/dynamic'
import { useRef, useState, useCallback, useMemo } from 'react'
import type { EditorInstance, JSONContent } from 'novel'
import { buildEditorProps } from '@/lib/editor-extensions'
import { EditorTocRail } from '@/components/ArticleToc'
import { useToast } from '@/components/Toast'
import { insertGeneratedImageAtPosition } from '@/lib/editor-file-upload'
import {
  extractFilesFromClipboard,
  useEditorAuxiliaryModals,
} from '@/lib/editor-ui'
import type { EditorImageActionTarget } from '@/lib/resizable-image'
import { normalizePostSlug } from '@/lib/post-utils'
import { getSiteDisplayUrl } from '@/lib/site-config'
import { resizeTextareaHeight } from '@/lib/textarea-autosize'
import {
  focusEditorDocumentStart,
  isTitleEndEnter,
} from '@/lib/editor-title-navigation'

// Optional tools must not block the writing surface. Mount them only when opened.
const EditorAiChatPanel = dynamic(
  () =>
    import('@/components/EditorAiChatPanel').then((m) => m.EditorAiChatPanel),
  { ssr: false },
)

import {
  EMPTY_DOCUMENT,
  calcReadTime,
  createEditorDraftDocumentKey,
  relativeTime,
  type DraftMetaState,
  type MetaGenerationTarget,
  type PublishStatus,
  type SaveFeedback,
  type SaveState,
  type SidebarTab,
} from '@/components/editor/shared'
import { useEditorMetadata } from '@/components/editor/shared/hooks/useEditorMetadata'
import { useEditorAutosave } from '@/components/editor/shared/hooks/useEditorAutosave'
import { useEditorUpload } from '@/components/editor/shared/hooks/useEditorUpload'
import { useNovelToc } from '@/components/editor/novel/hooks/useNovelToc'
import { useNovelContent } from '@/components/editor/novel/hooks/useNovelContent'
import { useNovelSave } from '@/components/editor/novel/hooks/useNovelSave'
import { useNovelMetadataGeneration } from '@/components/editor/novel/hooks/useNovelMetadataGeneration'
import { useNovelExportActions } from '@/components/editor/novel/hooks/useNovelExportActions'
import { useNovelWechatTheme } from '@/components/editor/novel/hooks/useNovelWechatTheme'
import { useNovelImageActions } from '@/components/editor/novel/hooks/useNovelImageActions'
import { useNovelEditorShellEffects } from '@/components/editor/novel/hooks/useNovelEditorShellEffects'
import { useNovelEditorInit } from '@/components/editor/novel/hooks/useNovelEditorInit'
import type { EditorAdapter } from '@/components/editor/shared/types/editor'
import { useNovelAiBridge } from '@/components/editor/novel/hooks/useNovelAiBridge'
import { useNovelScroll } from '@/components/editor/novel/hooks/useNovelScroll'
import { NovelMobilePreview } from '@/components/editor/novel/components/NovelMobilePreview'
import { NovelEditorModals } from '@/components/editor/novel/components/NovelEditorModals'
import { NovelWysiwygCanvas } from '@/components/editor/novel/components/NovelWysiwygCanvas'
import { NovelMainPane } from '@/components/editor/novel/components/NovelMainPane'
import { EditorSidebar } from '@/components/editor/shared/components/EditorSidebar'
import { EditorMetadataPanel } from '@/components/editor/shared/components/EditorMetadataPanel'
import { EditorHeader } from '@/components/editor/shared/components/EditorHeader'

const SITE_DISPLAY_URL = getSiteDisplayUrl()

interface NovelEditorProps {
  initialData?: {
    id: number
    slug: string
    title: string
    html: string
    category?: string
    status?: 'draft' | 'published' | 'deleted'
    password?: string | null
    is_hidden?: number
    tags?: string[]
    description?: string | null
    cover_image?: string | null
  }
}

export function NovelEditor({ initialData }: NovelEditorProps = {}) {
  // ── Core state ──
  const [draftReady, setDraftReady] = useState(false)
  const [initialContent, setInitialContent] =
    useState<JSONContent>(EMPTY_DOCUMENT)
  const editorRef = useRef<EditorInstance | null>(null)
  const novelAdapterRef = useRef<EditorAdapter<EditorInstance> | null>(null)
  const markdownImportInputRef = useRef<HTMLInputElement | null>(null)
  // ── Fields ──
  const [title, setTitle] = useState('')
  const latestTitleRef = useRef('')
  const [charCount, setCharCount] = useState(0)
  const [publishStatus, setPublishStatus] = useState<PublishStatus>(
    initialData?.status === 'draft'
      ? 'draft'
      : initialData?.password
        ? 'encrypted'
        : initialData?.is_hidden
          ? 'unlisted'
          : 'public',
  )

  // ── Bridge refs (hook-order safe wiring) ──
  const markDirtyRef = useRef<
    (metaOverrides?: Partial<DraftMetaState>) => void
  >(() => {})
  const handleSaveRef = useRef<() => void>(() => {})

  // ── Metadata / theme ──
  const {
    postId,
    editSlug,
    slug,
    setSlug,
    category,
    setCategory,
    tags,
    setTags,
    tagInput,
    setTagInput,
    addTag,
    removeTag,
    description,
    setDescription,
    coverImage,
    setCoverImage,
    slugInputFocusedRef,
    latestMetaRef,
    patchMetadata,
    syncPersistedSlug,
    resetMetadata,
  } = useEditorMetadata({
    initialData,
    markDirty: (metaOverrides) => markDirtyRef.current(metaOverrides),
  })
  const {
    wechatThemeConfig,
    selectedWechatThemeId,
    setSelectedWechatThemeId,
    selectedWechatTheme,
  } = useNovelWechatTheme()

  // ── UI state / TOC / panels ──
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('properties')
  const {
    tocItems,
    activeTocId,
    setActiveTocId,
    tocCollapsed,
    setTocCollapsed,
    activeTocItem,
    refreshToc,
    scrollToTocItem,
  } = useNovelToc(editorRef)
  const [publishPanelOpen, setPublishPanelOpen] = useState(false)
  const [wechatPublishOpen, setWechatPublishOpen] = useState(false)
  const [copywritingMenuOpen, setCopywritingMenuOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pendingMetadataTargets, setPendingMetadataTargets] = useState<
    MetaGenerationTarget[]
  >([])
  const [feedback, setFeedback] = useState<SaveFeedback>(null)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [lastSavedAt, setLastSavedAt] = useState<number>(Date.now())
  const [referenceImageTarget, setReferenceImageTarget] =
    useState<EditorImageActionTarget | null>(null)
  const [cropImageTarget, setCropImageTarget] =
    useState<EditorImageActionTarget | null>(null)
  const [, setTick] = useState(0) // force re-render for relative time

  // ── Refs / misc ──
  const publishPanelRef = useRef<HTMLDivElement>(null)
  const copywritingMenuRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const toast = useToast()

  const draftAiDocumentKeyRef = useRef(createEditorDraftDocumentKey())
  const skipNextEditorUpdateRef = useRef(Boolean(initialData?.html))

  const getEditorContent = useCallback(
    (
      editor: EditorInstance,
    ): { contentJson: unknown; html: string; plainText: string } => {
      const contentJson = editor.getJSON()
      const html = editor.getHTML()
      const plainText = editor.getText({ blockSeparator: '\n\n' }).trim()
      return { contentJson, html, plainText }
    },
    [],
  )

  const {
    clearAutosaveTimers,
    abortAutosaveRequest,
    scheduleDraftSave,
    lastAutosaveSnapshotRef,
  } = useEditorAutosave({
    draftReady,
    editorRef,
    latestTitleRef,
    latestMetaRef,
    getEditorContent,
    patchMetadata,
    syncPersistedSlug,
    setSaveState,
    setLastSavedAt,
  })

  const {
    previewHtml,
    syncEditorContentState,
    handleImportedMarkdownFile,
    handleEditorCreate,
  } = useNovelContent({
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
  })

  const {
    mobilePreviewOpen,
    setMobilePreviewOpen,
    mobileWechatPreviewHtml,
    mobileWechatPreviewError,
    setMobileWechatPreviewRetry,
    editorScrollAreaRef,
    mobilePreviewScrollRef,
  } = useNovelScroll({
    title,
    previewHtml,
    selectedWechatTheme,
    draftReady,
    sidebarOpen,
    titleRef,
  })

  const getCurrentAssetArticleTarget = useCallback(
    () => ({
      postId,
      slug: normalizePostSlug(slug) || editSlug || '',
    }),
    [editSlug, postId, slug],
  )

  const markDirty = useCallback(
    (metaOverrides?: Partial<DraftMetaState>) => {
      if (metaOverrides) {
        patchMetadata(metaOverrides)
      }
      scheduleDraftSave()
    },
    [patchMetadata, scheduleDraftSave],
  )
  markDirtyRef.current = markDirty

  const {
    uploadingImage,
    uploadProgress,
    fileInputRef,
    fileUploadRef,
    coverInputRef,
    uploadImageAndGetUrl,
    insertNonImageFile,
    handleSelectedFiles,
    insertCollageImage,
    handleCoverUpload,
  } = useEditorUpload<EditorInstance>({
    editorRef,
    latestTitleRef,
    getCurrentAssetArticleTarget,
    scheduleDraftSave,
    markDirty,
    setCoverImage,
    setFeedback,
    insertImageIntoEditor: (editor, url, alt) => {
      editor.chain().focus().setImage({ src: url, alt }).run()
    },
    insertCollageIntoEditor: (editor, url, alt, insertPos) => {
      insertGeneratedImageAtPosition(editor, url, alt, insertPos)
    },
  })

  useNovelEditorInit({
    initialData,
    latestTitleRef,
    setTitle,
    setInitialContent,
    setDraftReady,
    setSidebarOpen,
  })

  useNovelEditorShellEffects({
    sidebarOpen,
    setTick,
    title,
    draftReady,
    editSlug,
    titleRef,
    publishPanelOpen,
    copywritingMenuOpen,
    setPublishPanelOpen,
    setCopywritingMenuOpen,
    publishPanelRef,
    copywritingMenuRef,
    onSaveShortcut: () => handleSaveRef.current(),
  })

  const {
    aiModal,
    closeAiModal,
    closeImageModal,
    handleInputModalCancel,
    handleInputModalConfirm,
    imageModal,
    inputModal,
    openDocumentImageModal,
  } = useEditorAuxiliaryModals({
    title,
    getDocumentText: () =>
      editorRef.current?.getText({ blockSeparator: '\n\n' }).trim() || '',
    getSelectionContext: () => {
      const selection = editorRef.current?.state.selection
      return {
        insertPos: selection?.to ?? null,
        selectedText: selection
          ? editorRef.current?.state.doc
              .textBetween(selection.from, selection.to, '\n')
              .trim() || ''
          : '',
      }
    },
  })

  const { insertGeneratedImage, applyImageActionResult, imageExtensions } =
    useNovelImageActions({
      editorRef,
      imageModalInsertPos: imageModal.insertPos,
      closeImageModal,
      markDirty,
      setCoverImage,
      setFeedback,
      setReferenceImageTarget,
      setCropImageTarget,
    })

  // ── Save ──
  const { handleSave, handleStartNewArticle } = useNovelSave({
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
    initialPassword: initialData?.password,
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
  })
  handleSaveRef.current = handleSave

  const {
    getCurrentCopyExport,
    handleDownloadPdf,
    handleWechatThemeChange,
    handleFormatCopywriting,
    handleOpenWechatPublish,
  } = useNovelExportActions({
    editorRef,
    title,
    selectedWechatTheme,
    setSelectedWechatThemeId,
    setCopywritingMenuOpen,
    setWechatPublishOpen,
    markDirty,
    toast,
  })

  const { handleGenerateMetadata, isMetadataTargetPending } =
    useNovelMetadataGeneration({
      editorRef,
      latestTitleRef,
      title,
      category,
      description,
      tags,
      slug,
      editSlug,
      pendingMetadataTargets,
      setPendingMetadataTargets,
      toast,
      setFeedback,
      setDescription,
      setTags,
      setTagInput,
      setSlug,
      setCoverImage,
      markDirty,
    })

  const openAiChatPanel = useCallback(() => {
    setSidebarOpen(true)
    setSidebarTab('ai')
  }, [])

  const handleEditorCompositionEnd = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    syncEditorContentState(editor)
  }, [syncEditorContentState])
  const {
    getEditorChatContext,
    insertAiChatText,
    setAiChatTitle,
    setAiChatDescription,
    setAiChatTags,
    readAiChatArticleContent,
    editAiChatArticleContent,
    insertAiChatMarkdown,
    insertAiChatImage,
  } = useNovelAiBridge({
    editorRef,
    title,
    latestTitleRef,
    titleRef,
    description,
    category,
    tags,
    slug,
    editSlug,
    postId,
    tocItems,
    activeTocItem,
    draftAiDocumentKeyRef,
    setTitle,
    setDescription,
    setTags,
    setTagInput,
    markDirty,
  })

  // ── Save status display ──
  const saveStatusText =
    saveState === 'saved'
      ? `已保存 · ${relativeTime(lastSavedAt)}`
      : saveState === 'dirty'
        ? '未保存'
        : saveState === 'saving'
          ? '保存中…'
          : '保存失败'

  const saveStatusColor =
    saveState === 'saved'
      ? 'text-emerald-600'
      : saveState === 'error'
        ? 'text-orange-500'
        : 'text-[var(--stone-gray)]'

  const showSidebar = sidebarOpen
  const wechatSourceUrl = useMemo(() => {
    const currentSlug = normalizePostSlug(editSlug || slug)
    return currentSlug ? `https://${SITE_DISPLAY_URL}/${currentSlug}` : ''
  }, [editSlug, slug])

  return (
    <div className="min-h-screen bg-[var(--editor-app-bg)]">
      <EditorHeader
        status={{
          saveStatusText,
          saveStatusColor,
          saveState,
          charCount,
          calcReadTime,
          uploadingImage,
          uploadProgress,
        }}
        tools={{
          onImportMarkdown: () => markdownImportInputRef.current?.click(),
          tocCollapsed,
          tocItemsCount: tocItems.length,
          onToggleToc: () => setTocCollapsed((value) => !value),
          getCopyExport: getCurrentCopyExport,
          wechatThemeId: selectedWechatThemeId,
          wechatTheme: selectedWechatTheme,
          onWechatPublish: handleOpenWechatPublish,
          coverImage,
          description,
          onDownloadPdf: handleDownloadPdf,
          copywritingMenuOpen,
          onToggleCopywritingMenu: () =>
            setCopywritingMenuOpen((open) => !open),
          copywritingMenuRef,
          onFormatCopywriting: handleFormatCopywriting,
          showSidebar,
          sidebarTab,
          onOpenAiChat: openAiChatPanel,
          onOpenImageTool: () => openDocumentImageModal('generate'),
          mobilePreviewOpen,
          onToggleMobilePreview: () => setMobilePreviewOpen((open) => !open),
          sidebarOpen,
          onToggleSidebar: () => setSidebarOpen(!sidebarOpen),
        }}
        publish={{
          category,
          onCategoryChange: (val) => {
            setCategory(val)
            markDirty({ category: val })
          },
          onSave: handleSave,
          saving,
          editSlug,
          publishPanelOpen,
          onTogglePublishPanel: () => setPublishPanelOpen(!publishPanelOpen),
          publishPanelRef,
          publishStatus,
          onPublishStatusChange: setPublishStatus,
        }}
        feedback={{
          feedback,
          onClear: () => setFeedback(null),
          onStartNewArticle: handleStartNewArticle,
        }}
      />

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleSelectedFiles(e.target.files)
        }}
      />
      <input
        ref={fileUploadRef}
        type="file"
        accept="video/*,audio/*,.pdf,.zip,.rar,.7z,.epub,.mobi,.azw,.azw3,.txt,image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleSelectedFiles(e.target.files)
        }}
      />
      <input
        ref={markdownImportInputRef}
        type="file"
        accept=".md,.markdown,text/markdown,text/plain"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleImportedMarkdownFile(file)
        }}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleCoverUpload(f)
        }}
      />

      {/* ── Main layout: editor + sidebar ── */}
      <div className="flex">
        <EditorTocRail
          items={tocItems}
          collapsed={tocCollapsed}
          onCollapsedChange={setTocCollapsed}
          activeId={activeTocId}
          onActiveIdChange={setActiveTocId}
          onItemSelect={scrollToTocItem}
          root={editorRef.current?.view.dom as HTMLElement | null}
        />

        {/* Main editor area */}
        <NovelMainPane
          scrollRef={editorScrollAreaRef}
          mobilePreviewOpen={mobilePreviewOpen}
          title={title}
          titleRef={titleRef}
          onTitleChange={(v, el) => {
            setTitle(v)
            latestTitleRef.current = v
            resizeTextareaHeight(el)
            markDirty()
            if (feedback?.type === 'error') setFeedback(null)
          }}
          onTitlePaste={(e) => {
            const files = extractFilesFromClipboard(e)
            if (files.length === 0) return
            e.preventDefault()
            editorRef.current?.chain().focus().run()
            void handleSelectedFiles(files)
          }}
          onTitleKeyDown={(e) => {
            if (!isTitleEndEnter(e) || !editorRef.current) return
            e.preventDefault()
            focusEditorDocumentStart(editorRef.current)
          }}
          draftReady={draftReady}
          wysiwygContent={
            <NovelWysiwygCanvas
              initialContent={initialContent}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              extensions={imageExtensions as any}
              mobilePreviewOpen={mobilePreviewOpen}
              editorProps={buildEditorProps(
                (file) => uploadImageAndGetUrl(file),
                (file) => void insertNonImageFile(file),
                'editor-main-prose',
                handleEditorCompositionEnd,
              )}
              onCreate={handleEditorCreate}
              onUpdate={({ editor }) => {
                editorRef.current = editor
                if (editor.view.composing) return
                if (skipNextEditorUpdateRef.current) {
                  skipNextEditorUpdateRef.current = false
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const st = editor.storage as any
                  setCharCount(st.characterCount?.characters?.() ?? 0)
                  return
                }
                syncEditorContentState(editor)
              }}
            />
          }
        />

        {mobilePreviewOpen && (
          <NovelMobilePreview
            themeConfig={wechatThemeConfig}
            selectedThemeId={selectedWechatThemeId}
            onThemeChange={handleWechatThemeChange}
            previewHtml={mobileWechatPreviewHtml}
            previewError={mobileWechatPreviewError}
            onRetry={() => setMobileWechatPreviewRetry((value) => value + 1)}
            scrollRef={mobilePreviewScrollRef}
          />
        )}

        {/* ── Right Sidebar ── */}
        <EditorSidebar
          open={showSidebar}
          tab={sidebarTab}
          onTabChange={setSidebarTab}
          onClose={() => setSidebarOpen(false)}
        >
          {sidebarTab === 'properties' ? (
            <EditorMetadataPanel
              tags={tags}
              tagInput={tagInput}
              setTagInput={setTagInput}
              onAddTag={addTag}
              onRemoveTag={removeTag}
              description={description}
              onDescriptionChange={(nextDescription) => {
                setDescription(nextDescription)
                markDirty({ description: nextDescription })
              }}
              coverImage={coverImage}
              coverInputRef={coverInputRef}
              onCoverUpload={(f) => {
                void handleCoverUpload(f)
              }}
              onCoverRemove={() => {
                setCoverImage('')
                markDirty({ coverImage: '' })
              }}
              slug={slug}
              editSlug={editSlug}
              slugInputFocusedRef={slugInputFocusedRef}
              onSlugChange={(nextSlug) => {
                setSlug(nextSlug)
                markDirty({ slug: nextSlug })
              }}
              onSlugBlur={(value) => {
                const normalizedSlug = normalizePostSlug(value)
                if (normalizedSlug !== slug) {
                  setSlug(normalizedSlug)
                  markDirty({ slug: normalizedSlug })
                }
              }}
              onGenerateMetadata={(target) => {
                void handleGenerateMetadata(target)
              }}
              isMetadataTargetPending={isMetadataTargetPending}
            />
          ) : (
            <EditorAiChatPanel
              getContext={getEditorChatContext}
              onInsertText={insertAiChatText}
              onSetTitle={setAiChatTitle}
              onSetDescription={setAiChatDescription}
              onSetTags={setAiChatTags}
              onReadArticleContent={readAiChatArticleContent}
              onInsertMarkdown={insertAiChatMarkdown}
              onEditArticleContent={editAiChatArticleContent}
              onInsertImage={insertAiChatImage}
            />
          )}
        </EditorSidebar>
      </div>

      <NovelEditorModals
        wechatPublishOpen={wechatPublishOpen}
        onCloseWechatPublish={() => setWechatPublishOpen(false)}
        title={title.trim() || '无标题'}
        previewHtml={previewHtml || ''}
        description={description}
        wechatSourceUrl={wechatSourceUrl}
        coverImage={coverImage}
        slug={slug}
        editSlug={editSlug}
        selectedWechatThemeId={selectedWechatThemeId}
        inputModal={inputModal}
        onInputModalConfirm={handleInputModalConfirm}
        onInputModalCancel={handleInputModalCancel}
        imageModal={imageModal}
        postId={postId}
        onCloseImageModal={closeImageModal}
        onInsertGeneratedImage={insertGeneratedImage}
        onInsertCollageImage={insertCollageImage}
        referenceImageTarget={referenceImageTarget}
        onCloseReferenceImage={() => setReferenceImageTarget(null)}
        onApplyReferenceImage={(imageUrl, alt, placementMode) => {
          if (!referenceImageTarget) return
          applyImageActionResult(
            referenceImageTarget,
            imageUrl,
            alt,
            placementMode ?? 'replace',
          )
          setReferenceImageTarget(null)
        }}
        cropImageTarget={cropImageTarget}
        onCloseCrop={() => setCropImageTarget(null)}
        onApplyCrop={async (file, placementMode) => {
          if (!cropImageTarget) return
          const uploaded = await uploadImageAndGetUrl(file)
          applyImageActionResult(
            cropImageTarget,
            uploaded,
            cropImageTarget.alt || file.name,
            placementMode,
          )
          setCropImageTarget(null)
        }}
        aiModal={aiModal}
        editor={editorRef.current}
        onCloseAiModal={closeAiModal}
        onApplyAiTitle={(nextTitle) => {
          latestTitleRef.current = nextTitle
          setTitle(nextTitle)
          markDirty()
        }}
      />
    </div>
  )
}
