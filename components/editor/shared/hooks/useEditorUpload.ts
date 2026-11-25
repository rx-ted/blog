import { useCallback, useRef, useState } from 'react'
import {
  COVER_IMAGE_OPTIMIZE_OPTIONS,
  EDITOR_IMAGE_OPTIMIZE_OPTIONS,
  optimizeImageForUpload,
} from '@/lib/client-image'
import {
  createUploadPlaceholderMarker,
  insertUploadPlaceholder,
  insertUploadedFileIntoEditor,
  removeUploadPlaceholder,
  uploadEditorFile,
} from '@/lib/editor-file-upload'
import { useEditorUploadTriggers } from '@/lib/editor-ui'
import type { SaveFeedback } from '@/components/editor/shared'

interface UploadAssetTarget {
  postId?: number | null
  slug?: string | null
}

interface UseEditorUploadOptions<TEditor> {
  editorRef: React.RefObject<TEditor | null>
  latestTitleRef: React.RefObject<string>
  getCurrentAssetArticleTarget: () => UploadAssetTarget
  scheduleDraftSave: (nextTitle?: string, editor?: TEditor | null) => void
  markDirty: (metaOverrides?: { coverImage?: string }) => void
  setCoverImage: (url: string) => void
  setFeedback: React.Dispatch<React.SetStateAction<SaveFeedback>>
  insertImageIntoEditor: (editor: TEditor, url: string, alt: string) => void
  insertCollageIntoEditor: (
    editor: TEditor,
    url: string,
    alt: string,
    insertPos: number | null,
  ) => void
}

export function useEditorUpload<TEditor>({
  editorRef,
  latestTitleRef,
  getCurrentAssetArticleTarget,
  scheduleDraftSave,
  markDirty,
  setCoverImage,
  setFeedback,
  insertImageIntoEditor,
  insertCollageIntoEditor,
}: UseEditorUploadOptions<TEditor>) {
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const fileUploadRef = useRef<HTMLInputElement | null>(null)
  const coverInputRef = useRef<HTMLInputElement | null>(null)

  useEditorUploadTriggers(fileInputRef, fileUploadRef)

  const resetFileInputs = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (fileUploadRef.current) fileUploadRef.current.value = ''
  }, [])

  const uploadImageAndGetUrl = useCallback(
    async (file: File): Promise<string> => {
      setUploadingImage(true)
      setUploadProgress(0)
      setFeedback(null)
      try {
        const optimizedFile = await optimizeImageForUpload(
          file,
          EDITOR_IMAGE_OPTIMIZE_OPTIONS,
        )
        const result = await uploadEditorFile(
          optimizedFile,
          (p) => setUploadProgress(p),
          {
            ...getCurrentAssetArticleTarget(),
            role: 'inline',
            source: 'upload',
          },
        )
        const editor = editorRef.current
        if (editor) scheduleDraftSave(latestTitleRef.current ?? '', editor)
        return result.url
      } catch (error) {
        setFeedback({
          type: 'error',
          message: error instanceof Error ? error.message : '图片上传失败',
        })
        throw error
      } finally {
        setUploadingImage(false)
        setUploadProgress(0)
        resetFileInputs()
      }
    },
    [
      editorRef,
      getCurrentAssetArticleTarget,
      latestTitleRef,
      resetFileInputs,
      scheduleDraftSave,
      setFeedback,
    ],
  )

  const insertNonImageFile = useCallback(
    async (file: File) => {
      if (file.type.startsWith('image/')) {
        try {
          const url = await uploadImageAndGetUrl(file)
          const editor = editorRef.current
          if (editor) insertImageIntoEditor(editor, url, file.name)
        } catch {}
        return
      }
      const editor = editorRef.current
      if (!editor) {
        setFeedback({ type: 'error', message: '编辑器还没准备好' })
        return
      }
      setUploadingImage(true)
      setUploadProgress(0)
      setFeedback(null)
      const marker = createUploadPlaceholderMarker()
      // @ts-expect-error - editor is generic; runtime is Tiptap EditorInstance
      insertUploadPlaceholder(editor, file, marker)
      try {
        const result = await uploadEditorFile(file, (p) => setUploadProgress(p))
        // @ts-expect-error - editor is generic; runtime is Tiptap EditorInstance
        removeUploadPlaceholder(editor, marker)
        // @ts-expect-error - editor is generic; runtime is Tiptap EditorInstance
        insertUploadedFileIntoEditor(editor, file, result)
        scheduleDraftSave(latestTitleRef.current ?? '', editor)
      } catch (error) {
        try {
          // @ts-expect-error - editor is generic; runtime is Tiptap EditorInstance
          removeUploadPlaceholder(editor, marker)
        } catch {}
        setFeedback({
          type: 'error',
          message: error instanceof Error ? error.message : '文件上传失败',
        })
      } finally {
        setUploadingImage(false)
        setUploadProgress(0)
        resetFileInputs()
      }
    },
    [
      editorRef,
      insertImageIntoEditor,
      latestTitleRef,
      resetFileInputs,
      scheduleDraftSave,
      setFeedback,
      uploadImageAndGetUrl,
    ],
  )

  const handleSelectedFiles = useCallback(
    async (files: FileList | File[] | null | undefined) => {
      const queue = files ? Array.from(files) : []
      for (const file of queue) {
        // 顺序上传，避免多文件时占位和进度条互相打架
        await insertNonImageFile(file)
      }
    },
    [insertNonImageFile],
  )

  const insertCollageImage = useCallback(
    async (file: File, targetInsertPos: number | null) => {
      const editor = editorRef.current
      if (!editor) {
        setFeedback({ type: 'error', message: '编辑器还没准备好' })
        return
      }

      setUploadingImage(true)
      setUploadProgress(0)
      setFeedback(null)

      try {
        const result = await uploadEditorFile(
          file,
          (p) => setUploadProgress(p),
          {
            ...getCurrentAssetArticleTarget(),
            role: 'inline',
            source: 'collage',
          },
        )
        insertCollageIntoEditor(
          editor,
          result.url,
          file.name || '拼图',
          targetInsertPos,
        )
        scheduleDraftSave(latestTitleRef.current ?? '', editor)
      } catch (error) {
        setFeedback({
          type: 'error',
          message: error instanceof Error ? error.message : '拼图上传失败',
        })
        throw error
      } finally {
        setUploadingImage(false)
        setUploadProgress(0)
      }
    },
    [
      editorRef,
      getCurrentAssetArticleTarget,
      insertCollageIntoEditor,
      latestTitleRef,
      scheduleDraftSave,
      setFeedback,
    ],
  )

  const handleCoverUpload = useCallback(
    async (file: File) => {
      setUploadingImage(true)
      setUploadProgress(0)
      try {
        const optimizedFile = await optimizeImageForUpload(
          file,
          COVER_IMAGE_OPTIMIZE_OPTIONS,
        )
        const result = await uploadEditorFile(
          optimizedFile,
          (p) => setUploadProgress(p),
          {
            ...getCurrentAssetArticleTarget(),
            role: 'cover',
            source: 'upload',
          },
        )
        setCoverImage(result.url)
        markDirty({ coverImage: result.url })
      } catch (error) {
        setFeedback({
          type: 'error',
          message: error instanceof Error ? error.message : '封面上传失败',
        })
      } finally {
        setUploadingImage(false)
        setUploadProgress(0)
        if (coverInputRef.current) coverInputRef.current.value = ''
      }
    },
    [getCurrentAssetArticleTarget, markDirty, setCoverImage, setFeedback],
  )

  return {
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
  }
}
