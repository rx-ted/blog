'use client'

import { useEffect, useState } from 'react'
import { Images, Library, WandSparkles, X } from 'lucide-react'
import { CollageModal } from '@/components/CollageModal'
import { ImageGenerationModal } from '@/components/ImageGenerationModal'
import { MediaAssetLibrary } from '@/components/MediaAssetLibrary'

export type ImageToolMode = 'generate' | 'collage' | 'library'

interface ImageToolModalProps {
  open: boolean
  mode: ImageToolMode
  contextText: string
  historyScope: string
  insertPos: number | null
  closeOnGenerate?: boolean
  generationMode?: 'background' | 'foreground'
  postId?: number | null
  slug?: string | null
  onClose: () => void
  onInsertImage: (
    imageUrl: string,
    alt: string,
    placementMode?: 'insert' | 'replace',
  ) => void
  onInsertCollage: (
    file: File,
    insertPos: number | null,
  ) => Promise<void> | void
}

export function ImageToolModal({
  open,
  mode,
  contextText,
  historyScope,
  insertPos,
  closeOnGenerate = false,
  generationMode = 'background',
  postId,
  slug,
  onClose,
  onInsertImage,
  onInsertCollage,
}: ImageToolModalProps) {
  const [activeMode, setActiveMode] = useState<ImageToolMode>(mode)

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    const previousOverscroll = document.body.style.overscrollBehavior

    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscroll
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/45 px-2 py-2 sm:px-4 sm:py-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="flex min-h-full items-center justify-center">
        <div className="flex h-[calc(100vh-1rem)] w-full max-w-[1180px] flex-col overflow-hidden rounded-[24px] border border-[var(--editor-line)] bg-[var(--editor-panel)] shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:h-[min(860px,calc(100vh-2rem))]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--editor-line)] px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <div className="text-base font-semibold text-[var(--editor-ink)]">
                图片工具
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-full bg-[var(--editor-soft)] p-1">
              <button
                type="button"
                onClick={() => setActiveMode('generate')}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  activeMode === 'generate'
                    ? 'bg-[var(--editor-panel)] text-[var(--editor-ink)] shadow-sm'
                    : 'text-[var(--editor-muted)] hover:text-[var(--editor-ink)]'
                }`}
              >
                <WandSparkles className="h-4 w-4" />
                生图
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('collage')}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  activeMode === 'collage'
                    ? 'bg-[var(--editor-panel)] text-[var(--editor-ink)] shadow-sm'
                    : 'text-[var(--editor-muted)] hover:text-[var(--editor-ink)]'
                }`}
              >
                <Images className="h-4 w-4" />
                拼图
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('library')}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  activeMode === 'library'
                    ? 'bg-[var(--editor-panel)] text-[var(--editor-ink)] shadow-sm'
                    : 'text-[var(--editor-muted)] hover:text-[var(--editor-ink)]'
                }`}
              >
                <Library className="h-4 w-4" />
                图库
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--editor-muted)] transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)]"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1">
            <div className={activeMode === 'generate' ? 'h-full' : 'hidden'}>
              <ImageGenerationModal
                open={open}
                active={activeMode === 'generate'}
                embedded
                contextText={contextText}
                historyScope={historyScope}
                closeOnGenerate={closeOnGenerate}
                generationMode={generationMode}
                postId={postId}
                slug={slug}
                onClose={onClose}
                onInsert={onInsertImage}
              />
            </div>

            <div className={activeMode === 'collage' ? 'h-full' : 'hidden'}>
              <CollageModal
                open={open}
                active={activeMode === 'collage'}
                embedded
                insertPos={insertPos}
                onClose={onClose}
                onInsert={onInsertCollage}
              />
            </div>

            <div className={activeMode === 'library' ? 'h-full' : 'hidden'}>
              <MediaAssetLibrary
                active={activeMode === 'library'}
                postId={postId}
                slug={slug}
                onInsert={(asset) =>
                  onInsertImage(asset.url, asset.alt || '图片')
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
