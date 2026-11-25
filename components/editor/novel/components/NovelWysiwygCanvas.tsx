'use client'

import { EditorContent, EditorRoot, type EditorInstance } from 'novel'
import { BlockHandleMenu } from '@/lib/editor-block-menu'
import { FormattingBubble, SlashMenu } from '@/lib/editor-extensions'

interface NovelWysiwygCanvasProps {
  initialContent: any
  extensions: any[]
  mobilePreviewOpen: boolean
  editorProps: Record<string, unknown>
  onCreate: (params: { editor: EditorInstance }) => void
  onUpdate: (params: { editor: EditorInstance }) => void
}

export function NovelWysiwygCanvas({
  initialContent,
  extensions,
  mobilePreviewOpen,
  editorProps,
  onCreate,
  onUpdate,
}: NovelWysiwygCanvasProps) {
  return (
    <EditorRoot>
      <div>
        <EditorContent
          initialContent={initialContent}
          extensions={extensions}
          className={
            mobilePreviewOpen
              ? 'editor-surface editor-mobile-preview-surface'
              : 'editor-surface'
          }
          immediatelyRender={false}
          editorProps={editorProps}
          onCreate={onCreate}
          onUpdate={onUpdate}
        >
          <BlockHandleMenu />
          <FormattingBubble />
          <SlashMenu />
        </EditorContent>
      </div>
    </EditorRoot>
  )
}
