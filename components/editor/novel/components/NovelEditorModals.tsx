import dynamic from 'next/dynamic'
import { InputModal } from '@/components/InputModal'
import { resolvePostCoverImage } from '@/lib/default-cover-images'
import { normalizePostSlug } from '@/lib/post-utils'
import type { EditorInstance } from 'novel'
import type { EditorImageActionTarget } from '@/lib/resizable-image'
import type {
  EditorAiModalState,
  EditorImageModalState,
  EditorInputModalState,
} from '@/lib/editor-ui'

const ImageGenerationModal = dynamic(
  () =>
    import('@/components/ImageGenerationModal').then(
      (m) => m.ImageGenerationModal,
    ),
  { ssr: false },
)
const ImageCropModal = dynamic(
  () => import('@/components/ImageCropModal').then((m) => m.ImageCropModal),
  { ssr: false },
)
const ImageToolModal = dynamic(
  () => import('@/components/ImageToolModal').then((m) => m.ImageToolModal),
  { ssr: false },
)
const WeChatPublishModal = dynamic(
  () =>
    import('@/components/WeChatPublishModal').then((m) => m.WeChatPublishModal),
  { ssr: false },
)
const AIModal = dynamic(() => import('@/lib/ai-modal').then((m) => m.AIModal), {
  ssr: false,
})

interface NovelEditorModalsProps {
  wechatPublishOpen: boolean
  onCloseWechatPublish: () => void
  title: string
  previewHtml: string
  description: string
  wechatSourceUrl: string
  coverImage: string
  slug: string
  editSlug: string | null
  selectedWechatThemeId: string
  inputModal: EditorInputModalState
  onInputModalConfirm: (value: string) => void
  onInputModalCancel: () => void
  imageModal: EditorImageModalState
  postId: number | null
  onCloseImageModal: () => void
  onInsertGeneratedImage: (imageUrl: string, alt: string) => void
  onInsertCollageImage: (file: File, insertPos: number | null) => Promise<void>
  referenceImageTarget: EditorImageActionTarget | null
  onCloseReferenceImage: () => void
  onApplyReferenceImage: (
    imageUrl: string,
    alt: string,
    placementMode?: 'insert' | 'replace',
  ) => void
  cropImageTarget: EditorImageActionTarget | null
  onCloseCrop: () => void
  onApplyCrop: (
    file: File,
    placementMode: 'insert' | 'replace',
  ) => Promise<void>
  aiModal: EditorAiModalState
  editor: EditorInstance | null
  onCloseAiModal: () => void
  onApplyAiTitle: (nextTitle: string) => void
}

export function NovelEditorModals(props: NovelEditorModalsProps) {
  const normalizedSlug = normalizePostSlug(props.slug) || props.editSlug || ''

  return (
    <>
      {props.wechatPublishOpen && (
        <WeChatPublishModal
          isOpen={props.wechatPublishOpen}
          onClose={props.onCloseWechatPublish}
          title={props.title.trim() || '无标题'}
          html={props.previewHtml || ''}
          defaultDigest={props.description}
          defaultSourceUrl={props.wechatSourceUrl}
          defaultCoverImageUrl={resolvePostCoverImage({
            cover_image: props.coverImage,
            slug: normalizedSlug || props.title,
            title: props.title,
          })}
          exportThemeId={props.selectedWechatThemeId}
        />
      )}

      <InputModal
        open={props.inputModal.open}
        title={props.inputModal.title}
        placeholder={props.inputModal.placeholder}
        onConfirm={props.onInputModalConfirm}
        onCancel={props.onInputModalCancel}
      />

      {props.imageModal.open && (
        <ImageToolModal
          key={`${props.imageModal.open ? 'open' : 'closed'}-${props.imageModal.mode}`}
          open={props.imageModal.open}
          mode={props.imageModal.mode}
          contextText={props.imageModal.contextText}
          historyScope="admin-editor"
          insertPos={props.imageModal.insertPos}
          closeOnGenerate={false}
          postId={props.postId}
          slug={normalizedSlug}
          onClose={props.onCloseImageModal}
          onInsertImage={props.onInsertGeneratedImage}
          onInsertCollage={props.onInsertCollageImage}
        />
      )}

      {Boolean(props.referenceImageTarget) && (
        <ImageGenerationModal
          open={Boolean(props.referenceImageTarget)}
          contextText=""
          historyScope="admin-editor"
          referenceImageUrl={props.referenceImageTarget?.src}
          allowReplace
          defaultPlacementMode="replace"
          closeOnGenerate={false}
          generationMode="foreground"
          postId={props.postId}
          slug={normalizedSlug}
          onClose={props.onCloseReferenceImage}
          onInsert={(imageUrl, alt, placementMode) => {
            if (!props.referenceImageTarget) return
            props.onApplyReferenceImage(
              imageUrl,
              alt,
              placementMode ?? 'replace',
            )
          }}
        />
      )}

      {Boolean(props.cropImageTarget) && (
        <ImageCropModal
          open={Boolean(props.cropImageTarget)}
          imageUrl={props.cropImageTarget?.src || ''}
          imageAlt={props.cropImageTarget?.alt}
          defaultPlacementMode="replace"
          onClose={props.onCloseCrop}
          onApply={async (file, placementMode) => {
            if (!props.cropImageTarget) return
            await props.onApplyCrop(file, placementMode)
          }}
        />
      )}

      {props.aiModal.open && props.editor && (
        <AIModal
          editor={props.editor}
          isOpen={props.aiModal.open}
          onClose={props.onCloseAiModal}
          selectedText={props.aiModal.selectedText}
          position={props.aiModal.position}
          selectionRange={props.aiModal.selectionRange}
          initialContext={props.aiModal.initialContext}
          documentTitle={props.aiModal.documentTitle}
          documentText={props.aiModal.documentText}
          historyScope="admin-editor"
          onApplyTitle={props.onApplyAiTitle}
        />
      )}
    </>
  )
}
