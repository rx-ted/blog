import type { Mark, MarkType, Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Transaction } from '@tiptap/pm/state'
import { find } from 'linkifyjs'

export interface EditorAutolinkMatch {
  from: number
  to: number
  href: string
  text: string
}

const CJK_LINK_BOUNDARY =
  /[，。；：！？、…（）【】《》〈〉「」『』〔〕［］｛｝“”‘’]/u
const editorAutolinkPluginKey = new PluginKey('editorCjkAutolink')

function isCjkLinkBoundary(value: string | undefined) {
  return Boolean(value && CJK_LINK_BOUNDARY.test(value))
}

function decodeHref(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function stripDefaultProtocol(value: string) {
  return value.replace(/^(?:https?:\/\/|mailto:)/i, '')
}

function isSelfDescribingLink(mark: Mark, text: string) {
  const href = String(mark.attrs.href || '')
  if (!href) return false

  const decodedHref = decodeHref(href)
  return (
    decodedHref === text ||
    stripDefaultProtocol(decodedHref) === stripDefaultProtocol(text)
  )
}

interface LinkCoverageSegment {
  mark: Mark
  text: string
}

function getLinkCoverage(
  doc: ProseMirrorNode,
  from: number,
  to: number,
  linkType: MarkType,
) {
  const segments: LinkCoverageSegment[] = []
  let linkedLength = 0

  doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText || !node.text) return

    const segmentFrom = Math.max(from, pos)
    const segmentTo = Math.min(to, pos + node.nodeSize)
    const length = Math.max(0, segmentTo - segmentFrom)
    if (length === 0) return

    const mark = node.marks.find((currentMark) => currentMark.type === linkType)
    if (!mark) return

    segments.push({
      mark,
      text: node.text.slice(segmentFrom - pos, segmentTo - pos),
    })
    linkedLength += length
  })

  return {
    segments,
    fullyLinked: linkedLength === to - from,
  }
}

function linkTargetsMatch(mark: Mark, match: EditorAutolinkMatch) {
  const href = String(mark.attrs.href || '')
  if (!href) return false

  const decodedHref = decodeHref(href)
  return (
    decodedHref === match.href ||
    decodedHref === match.text ||
    stripDefaultProtocol(decodedHref) === stripDefaultProtocol(match.href) ||
    stripDefaultProtocol(decodedHref) === stripDefaultProtocol(match.text)
  )
}

function repairPartialAutolinks(
  doc: ProseMirrorNode,
  tr: Transaction,
  linkType: MarkType,
  repairedRanges?: Array<{ from: number; to: number }>,
) {
  let changed = false

  doc.descendants((node, pos) => {
    if (!node.isTextblock || node.type.spec.code) return

    // Preserve one character for inline leaf nodes so text offsets still map to document positions.
    const text = node.textBetween(0, node.content.size, '\ufffc', '\ufffc')
    const matches = findEditorAutolinks(text)
    if (matches.length === 0) return false

    const blockStart = pos + 1
    for (const match of matches) {
      const from = blockStart + match.from
      const to = blockStart + match.to
      const codeType = doc.type.schema.marks.code
      if (codeType && doc.rangeHasMark(from, to, codeType)) continue

      const coverage = getLinkCoverage(doc, from, to, linkType)
      if (coverage.segments.length === 0 || coverage.fullyLinked) continue
      const allTargetsMatch = coverage.segments.every((segment) =>
        linkTargetsMatch(segment.mark, match),
      )
      // A pasted link whose visible text matches its own href was auto-generated from the
      // URL text, so it is safe to extend it to the full detected URL and update the href.
      const allSelfDescribing = coverage.segments.every((segment) =>
        isSelfDescribingLink(segment.mark, segment.text),
      )
      if (!allTargetsMatch && !allSelfDescribing) continue

      const sourceMark = coverage.segments[0].mark
      const href = allTargetsMatch
        ? String(sourceMark.attrs.href || match.href)
        : match.href
      tr.removeMark(from, to, linkType)
      tr.addMark(from, to, linkType.create({ ...sourceMark.attrs, href }))
      repairedRanges?.push({ from, to })
      changed = true
    }

    return false
  })

  return changed
}

export function findEditorAutolinks(text: string): EditorAutolinkMatch[] {
  const matches: EditorAutolinkMatch[] = []
  let segmentStart = 0

  const collectSegment = (segmentEnd: number) => {
    const segment = text.slice(segmentStart, segmentEnd)
    for (const match of find(segment)) {
      if (!match.isLink) continue
      matches.push({
        from: segmentStart + match.start,
        to: segmentStart + match.end,
        href: match.href,
        text: match.value,
      })
    }
  }

  for (let index = 0; index < text.length; index += 1) {
    if (!CJK_LINK_BOUNDARY.test(text[index] || '')) continue
    collectSegment(index)
    segmentStart = index + 1
  }

  collectSegment(text.length)
  return matches
}

export function createEditorAutolinkPlugin(linkType: MarkType) {
  return new Plugin({
    key: editorAutolinkPluginKey,
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some((transaction) => transaction.docChanged))
        return null
      if (
        transactions.some((transaction) =>
          transaction.getMeta(editorAutolinkPluginKey),
        )
      )
        return null
      if (
        transactions.some((transaction) =>
          transaction.getMeta('preventAutolink'),
        )
      )
        return null

      const tr = newState.tr
      const repairedRanges: Array<{ from: number; to: number }> = []
      let changed = repairPartialAutolinks(
        newState.doc,
        tr,
        linkType,
        repairedRanges,
      )

      newState.doc.descendants((node, pos) => {
        if (
          !node.isText ||
          !node.text ||
          node.marks.some((mark) => mark.type.name === 'code')
        ) {
          return
        }

        // Mark edits don't move positions; skip nodes already rebuilt by the repair pass so
        // the trimming branch below cannot shrink the extended link back to its stale href.
        if (
          repairedRanges.some(
            (range) => pos >= range.from && pos + node.nodeSize <= range.to,
          )
        ) {
          return
        }

        const matches = findEditorAutolinks(node.text)
        if (matches.length === 0) return

        const existingLink = node.marks.find((mark) => mark.type === linkType)
        if (existingLink) {
          const [match] = matches
          if (
            match &&
            match.from === 0 &&
            match.to < node.text.length &&
            isSelfDescribingLink(existingLink, node.text)
          ) {
            tr.removeMark(pos, pos + node.nodeSize, linkType)
            tr.addMark(
              pos,
              pos + match.to,
              linkType.create({ ...existingLink.attrs, href: match.href }),
            )
            changed = true
          }
          return
        }

        for (const match of matches) {
          if (!isCjkLinkBoundary(node.text[match.to])) continue
          tr.addMark(
            pos + match.from,
            pos + match.to,
            linkType.create({ href: match.href }),
          )
          changed = true
        }
      })

      if (!changed) return null
      tr.setMeta(editorAutolinkPluginKey, true)
      tr.setMeta('preventAutolink', true)
      return tr
    },
  })
}
