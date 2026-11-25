import { useCallback, useMemo } from 'react'
import type { EditorInstance } from 'novel'
import { createEditorExtensions } from '@/lib/editor-extensions'
import {
  insertGeneratedImageAfterNode,
  insertGeneratedImageAtPosition,
  replaceImageNodeAtPosition,
} from '@/lib/editor-file-upload'
import type { EditorImageActionTarget } from '@/lib/resizable-image'
import type { DraftMetaState, SaveFeedback } from '@/components/editor/shared'

interface UseNovelImageActionsOptions {
  editorRef: React.RefObject<EditorInstance | null>
  imageModalInsertPos: number | null
  closeImageModal: () => void
  markDirty: (metaOverrides?: Partial<DraftMetaState>) => void
  setCoverImage: (cover: string) => void
  setFeedback: React.Dispatch<React.SetStateAction<SaveFeedback>>
  setReferenceImageTarget: React.Dispatch<React.SetStateAction<EditorImageActionTarget | null>>
  setCropImageTarget: React.Dispatch<React.SetStateAction<EditorImageActionTarget | null>>
}

export function useNovelImageActions({
  editorRef,
  imageModalInsertPos,
  closeImageModal,
  markDirty,
  setCoverImage,
  setFeedback,
  setReferenceImageTarget,
  setCropImageTarget,
}: UseNovelImageActionsOptions) {

  const insertGeneratedImage = useCallback((imageUrl: string, alt: string) => {
    const editor = editorRef.current
    if (!editor) return

    insertGeneratedImageAtPosition(editor, imageUrl, alt, imageModalInsertPos)
    closeImageModal()
  }, [closeImageModal, editorRef, imageModalInsertPos])

  const applyImageActionResult = useCallback((
    target: EditorImageActionTarget,
    imageUrl: string,
    alt: string,
    placementMode: 'insert' | 'replace' = 'replace',
  ) => {
    const editor = editorRef.current
    if (!editor) return

    const nextAlt = alt || target.alt || ''

    if (placementMode === 'replace') {
      replaceImageNodeAtPosition(editor, imageUrl, nextAlt, target.pos)
    } else {
      insertGeneratedImageAfterNode(editor, imageUrl, nextAlt, target.pos)
    }
  }, [editorRef])

  const imageExtensions = useMemo(() => createEditorExtensions({
    imageActions: {
      onSetCover: (target) => {
        setCoverImage(target.src)
        markDirty({ coverImage: target.src })
        setFeedback({ type: 'success', message: '已设为封面' })
      },
      onOpenReferenceImage: (target) => {
        setReferenceImageTarget(target)
      },
      onOpenCrop: (target) => {
        setCropImageTarget(target)
      },
    },
  }), [markDirty, setCoverImage, setCropImageTarget, setFeedback, setReferenceImageTarget])

  return {
    insertGeneratedImage,
    applyImageActionResult,
    imageExtensions,
  }
}
