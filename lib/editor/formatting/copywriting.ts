import type { EditorInstance } from 'novel'
import { formatChineseCopywritingText } from '@/lib/chinese-copywriting'

const CHINESE_COPYWRITING_SKIP_NODES = new Set(['codeBlock', 'mathBlock', 'inlineMath'])
const CHINESE_COPYWRITING_SKIP_MARKS = new Set(['code', 'link'])

export type ChineseCopywritingScope = 'selection' | 'block' | 'document'

function getChineseCopywritingRange(editor: EditorInstance, scope: ChineseCopywritingScope) {
  const { state } = editor
  const { selection } = state

  if (scope === 'document') {
    return { from: 0, to: state.doc.content.size }
  }

  if (scope === 'selection') {
    if (selection.empty) return null
    return { from: selection.from, to: selection.to }
  }

  return {
    from: selection.$from.start(),
    to: selection.$from.end(),
  }
}

export function formatChineseCopywritingInEditor(
  editor: EditorInstance,
  scope: ChineseCopywritingScope = 'selection',
): boolean {
  const { state, view } = editor
  const range = getChineseCopywritingRange(editor, scope)
  if (!range || range.from >= range.to) return false

  const { from, to } = range
  const changes: Array<{ from: number; to: number; text: string }> = []

  state.doc.nodesBetween(from, to, (node, pos, parent) => {
    if (CHINESE_COPYWRITING_SKIP_NODES.has(node.type.name)) return false
    if (!node.isText || !node.text) return true
    if (parent && CHINESE_COPYWRITING_SKIP_NODES.has(parent.type.name)) return false
    if (node.marks.some((mark) => CHINESE_COPYWRITING_SKIP_MARKS.has(mark.type.name))) return true

    const nodeFrom = Math.max(from, pos)
    const nodeTo = Math.min(to, pos + node.nodeSize)
    const textFrom = nodeFrom - pos
    const textTo = nodeTo - pos
    const original = node.text.slice(textFrom, textTo)
    const formatted = formatChineseCopywritingText(original)

    if (formatted !== original) {
      changes.push({ from: nodeFrom, to: nodeTo, text: formatted })
    }

    return true
  })

  if (changes.length === 0) return false

  let tr = state.tr
  for (const change of changes.reverse()) {
    tr = tr.insertText(change.text, change.from, change.to)
  }
  view.dispatch(tr.scrollIntoView())
  return true
}
