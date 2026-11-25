import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

type TextIndex = {
  text: string
  positions: Array<number | null>
}

export type ExactTextRangeResult =
  | {
      status: 'found'
      from: number
      to: number
      matchCount: number
    }
  | {
      status: 'not_found'
      matchCount: 0
    }
  | {
      status: 'ambiguous'
      matchCount: number
    }

function pushText(index: TextIndex, text: string, startPos: number) {
  for (let offset = 0; offset < text.length; offset += 1) {
    index.text += text[offset]
    index.positions.push(startPos + offset)
  }
}

function pushSeparator(index: TextIndex) {
  index.text += '\n\n'
  index.positions.push(null, null)
}

export function buildEditorTextIndex(doc: ProseMirrorNode): TextIndex {
  const index: TextIndex = { text: '', positions: [] }
  let hasTextblock = false

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true

    if (hasTextblock) pushSeparator(index)
    hasTextblock = true

    node.descendants((child, childPos) => {
      if (!child.isText || !child.text) return true
      pushText(index, child.text, pos + 1 + childPos)
      return true
    })

    return false
  })

  return index
}

function findMatchIndices(text: string, needle: string) {
  const indices: number[] = []
  let cursor = text.indexOf(needle)

  while (cursor !== -1) {
    indices.push(cursor)
    cursor = text.indexOf(needle, cursor + Math.max(1, needle.length))
  }

  return indices
}

function getBoundaryPosition(
  positions: Array<number | null>,
  startIndex: number,
  endIndex: number,
) {
  let from: number | null = null
  let to: number | null = null

  for (let index = startIndex; index < endIndex; index += 1) {
    const pos = positions[index]
    if (pos !== null) {
      from = pos
      break
    }
  }

  for (let index = endIndex - 1; index >= startIndex; index -= 1) {
    const pos = positions[index]
    if (pos !== null) {
      to = pos + 1
      break
    }
  }

  if (from === null || to === null || from >= to) return null
  return { from, to }
}

export function resolveExactTextRangeInDoc(
  doc: ProseMirrorNode,
  exactText: string,
  options: {
    occurrence?: number
    useLastMatch?: boolean
  } = {},
): ExactTextRangeResult {
  const needle = exactText.trim()
  if (!needle) return { status: 'not_found', matchCount: 0 }

  const index = buildEditorTextIndex(doc)
  const matches = findMatchIndices(index.text, needle)
  if (matches.length === 0) return { status: 'not_found', matchCount: 0 }

  const occurrence =
    Number.isInteger(options.occurrence) && Number(options.occurrence) > 0
      ? Number(options.occurrence)
      : null
  const matchIndex = options.useLastMatch
    ? matches[matches.length - 1]
    : occurrence
      ? matches[occurrence - 1]
      : matches.length === 1
        ? matches[0]
        : undefined

  if (matchIndex === undefined) {
    return { status: 'ambiguous', matchCount: matches.length }
  }

  const boundary = getBoundaryPosition(
    index.positions,
    matchIndex,
    matchIndex + needle.length,
  )
  if (!boundary) return { status: 'not_found', matchCount: 0 }

  return {
    status: 'found',
    from: boundary.from,
    to: boundary.to,
    matchCount: matches.length,
  }
}
