import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

export type BlockActionTarget = {
  pos: number
  node: ProseMirrorNode
  contentFrom: number
  contentTo: number
  textPos: number
}

export function getTopLevelTargetFromDoc(
  doc: ProseMirrorNode,
  rawPos: number,
): BlockActionTarget | null {
  if (doc.childCount === 0) return null

  const safePos = Math.max(0, Math.min(rawPos, doc.content.size))
  let offset = 0
  let fallback: BlockActionTarget | null = null

  for (let index = 0; index < doc.childCount; index += 1) {
    const node = doc.child(index)
    const from = offset
    const to = offset + node.nodeSize
    const isLast = index === doc.childCount - 1
    const includesPos =
      safePos >= from && (safePos < to || (isLast && safePos <= to))

    if (!fallback && (safePos < to || isLast)) {
      fallback = {
        pos: from,
        node,
        contentFrom: Math.min(from + 1, to),
        contentTo: Math.max(from + 1, to - 1),
        textPos: Math.min(from + 1, doc.content.size),
      }
    }

    if (includesPos) {
      return {
        pos: from,
        node,
        contentFrom: Math.min(from + 1, to),
        contentTo: Math.max(from + 1, to - 1),
        textPos: Math.min(from + 1, doc.content.size),
      }
    }

    offset = to
  }

  return fallback
}
