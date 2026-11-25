import type { ReactNode, RefObject } from 'react'

interface NovelMainPaneProps {
  scrollRef: RefObject<HTMLDivElement | null>
  mobilePreviewOpen: boolean
  title: string
  titleRef: RefObject<HTMLTextAreaElement | null>
  onTitleChange: (value: string, el: HTMLTextAreaElement) => void
  onTitlePaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void
  onTitleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  draftReady: boolean
  editorViewMode: 'wysiwyg' | 'source' | 'preview'
  wysiwygContent: ReactNode
  sourceContent: ReactNode
  previewContent: ReactNode
}

export function NovelMainPane({
  scrollRef,
  mobilePreviewOpen,
  title,
  titleRef,
  onTitleChange,
  onTitlePaste,
  onTitleKeyDown,
  draftReady,
  editorViewMode,
  wysiwygContent,
  sourceContent,
  previewContent,
}: NovelMainPaneProps) {
  return (
    <main className="flex-1 min-w-0">
      <div
        ref={scrollRef}
        className={`mx-auto px-4 pt-10 pb-8 transition-[max-width,padding] duration-200 sm:px-6 ${
          mobilePreviewOpen ? 'max-w-[430px] sm:px-5' : 'max-w-4xl'
        }`}
      >
        <div className="pb-4">
          <textarea
            ref={titleRef}
            placeholder="无标题"
            value={title}
            rows={1}
            onChange={(e) => onTitleChange(e.target.value, e.target)}
            onPaste={onTitlePaste}
            onKeyDown={onTitleKeyDown}
            className={`editor-title-textarea block w-full appearance-none bg-transparent p-0 m-0 resize-none overflow-hidden border-0 rounded-none shadow-none outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 font-bold leading-tight text-[var(--editor-ink)] placeholder:text-[var(--stone-gray)] ${
              mobilePreviewOpen ? 'text-2xl' : 'text-4xl'
            }`}
            style={{ minHeight: '52px' }}
          />
        </div>

        {!draftReady ? (
          <div className={mobilePreviewOpen ? 'editor-surface editor-mobile-preview-surface' : 'editor-surface'} />
        ) : (
          <>
            <div className={editorViewMode === 'wysiwyg' ? '' : 'hidden'}>
              {wysiwygContent}
            </div>

            {editorViewMode === 'source' && sourceContent}
            {editorViewMode === 'preview' && previewContent}
          </>
        )}
      </div>
    </main>
  )
}
