import { DOMParser as PMDOMParser } from '@tiptap/pm/model'
import { TextSelection } from '@tiptap/pm/state'
import type { EditorInstance } from 'novel'
import TurndownService from 'turndown'
import { renderMarkdownToEditorHtml } from './renderer'

let turndownService: TurndownService | null = null

function getTurndownService() {
  if (turndownService) return turndownService

  turndownService = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
  })

  turndownService.addRule('editorMath', {
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return false
      return node.hasAttribute('data-math-latex')
    },
    replacement: (_content, node) => {
      const element = node as HTMLElement
      const latex = element.getAttribute('data-math-latex') || ''
      const displayMode = element.getAttribute('data-display-mode') === 'true'
      if (!latex.trim()) return ''
      return displayMode ? `\n$$\n${latex}\n$$\n` : `$${latex}$`
    },
  })

  return turndownService
}

function resolveRange(
  editor: EditorInstance,
  range?: { from: number; to: number } | null,
) {
  const maxPos = Math.max(1, editor.state.doc.content.size)
  const clamp = (pos: number) => Math.min(Math.max(1, pos), maxPos)

  if (range) {
    const from = clamp(range.from)
    const to = clamp(range.to)
    return from <= to ? { from, to } : { from: to, to: from }
  }

  const { from, to } = editor.state.selection
  return { from: clamp(from), to: clamp(to) }
}

function createMarkdownSlice(editor: EditorInstance, markdown: string) {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = renderMarkdownToEditorHtml(markdown)
  return PMDOMParser.fromSchema(editor.state.schema).parseSlice(wrapper)
}

export function replaceEditorRangeWithMarkdown(
  editor: EditorInstance,
  markdown: string,
  range?: { from: number; to: number } | null,
) {
  const normalized = markdown.trim()
  if (!normalized) return false

  const nextRange = resolveRange(editor, range)
  const slice = createMarkdownSlice(editor, normalized)
  const selection = TextSelection.create(
    editor.view.state.doc,
    nextRange.from,
    nextRange.to,
  )

  editor.commands.focus()
  const tr = editor.view.state.tr
    .setSelection(selection)
    .replaceSelection(slice)
    .scrollIntoView()
  editor.view.dispatch(tr)
  return true
}

export function htmlToMarkdownBody(html: string) {
  const normalized = (html || '').trim()
  if (!normalized) return ''
  try {
    return getTurndownService().turndown(normalized).trim()
  } catch {
    return ''
  }
}
