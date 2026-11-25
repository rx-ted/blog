import type { EditorInstance } from 'novel'
import {
  htmlToMarkdownBody,
  renderMarkdownToEditorHtml,
} from '@/lib/editor-markdown'
import { replaceEditorRangeWithMarkdown } from '@/lib/editor-markdown'
import type {
  EditorAdapter,
  EditorContentSnapshot,
  EditorHeading,
} from '@/components/editor/shared/types/editor'

function extractHeadings(editor: EditorInstance): EditorHeading[] {
  const headings: EditorHeading[] = []
  let index = 0
  editor.state.doc.descendants((node) => {
    if (node.type.name !== 'heading') return true
    const level = Number(node.attrs.level)
    if (![1, 2, 3].includes(level)) return true
    const text = node.textContent.trim()
    if (!text) return true
    index += 1
    const id =
      (typeof node.attrs.id === 'string' && node.attrs.id) || `heading-${index}`
    headings.push({ id, text, level })
    return true
  })
  return headings
}

export function createNovelEditorAdapter(
  editor: EditorInstance,
): EditorAdapter<EditorInstance> {
  return {
    getDocument() {
      return editor
    },

    getMarkdown() {
      return htmlToMarkdownBody(editor.getHTML())
    },

    setMarkdown(markdown: string) {
      const html = markdown.trim() ? renderMarkdownToEditorHtml(markdown) : ''
      if (html) {
        editor.commands.setContent(html)
      } else {
        editor.commands.clearContent()
      }
    },

    getSelectedText() {
      const { selection } = editor.state
      if (selection.empty) return ''
      return editor.state.doc
        .textBetween(selection.from, selection.to, '\n\n')
        .trim()
    },

    insertContent(content: string) {
      const trimmed = content.trim()
      if (!trimmed) return
      const pos = editor.state.selection.to
      replaceEditorRangeWithMarkdown(editor, trimmed, { from: pos, to: pos })
    },

    replaceSelection(content: string) {
      const trimmed = content.trim()
      if (!trimmed) return
      const { from, to } = editor.state.selection
      replaceEditorRangeWithMarkdown(editor, trimmed, { from, to })
    },

    getHeadings() {
      return extractHeadings(editor)
    },

    focus() {
      editor.commands.focus()
    },

    subscribe(listener: () => void) {
      editor.on('update', listener)
      return () => {
        editor.off('update', listener)
      }
    },

    getContentSnapshot(): EditorContentSnapshot {
      const _st = editor.storage as any
      return {
        contentJson: editor.getJSON(),
        html: editor.getHTML(),
        plainText: editor.getText({ blockSeparator: '\n\n' }).trim(),
        markdown: htmlToMarkdownBody(editor.getHTML()),
      }
    },
  }
}
