import type MarkdownIt from 'markdown-it'
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs'
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import type Token from 'markdown-it/lib/token.mjs'

type MarkdownItInstance = ReturnType<typeof MarkdownIt>

const INFERRED_MATH_TEXT_TOKEN_TYPES = new Set(['text', 'text_special'])
const INLINE_MATH_MAX_LENGTH = 160
const INFERRED_PAREN_MATH_MAX_LENGTH = 80

function normalizeLatex(latex: string) {
  return latex.replace(/\s+/g, ' ').trim()
}

function findUnescapedMarker(value: string, marker: string, from: number) {
  let index = value.indexOf(marker, from)
  while (index !== -1) {
    let slashCount = 0
    for (
      let cursor = index - 1;
      cursor >= 0 && value[cursor] === '\\';
      cursor -= 1
    ) {
      slashCount += 1
    }
    if (slashCount % 2 === 0) return index
    index = value.indexOf(marker, index + marker.length)
  }
  return -1
}

function findClosingSingleDollar(value: string, from: number) {
  for (let index = from; index < value.length; index += 1) {
    if (value[index] !== '$') continue
    if (value[index + 1] === '$') continue
    if (index > 0 && value[index - 1] === '\\') continue
    return index
  }
  return -1
}

function looksLikeFormula(value: string, options: { inferred?: boolean } = {}) {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (options.inferred && trimmed.length > INFERRED_PAREN_MATH_MAX_LENGTH)
    return false
  if (options.inferred && /[\u4e00-\u9fff]/.test(trimmed)) return false
  if (/^\d+(?:[.,]\d+)?$/.test(trimmed)) return false

  return (
    /\\[a-zA-Z]+/.test(trimmed) ||
    /[\^_]\s*\{?[-+A-Za-z0-9]+/.test(trimmed) ||
    /(?:\d|[A-Za-z])\s*(?:[=<>+\-*/×]|\\times|\\cdot)\s*(?:\d|[A-Za-z])/.test(
      trimmed,
    ) ||
    /\\(?:frac|sqrt|sum|prod|int|log|ln|exp|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|times|cdot)\b/.test(
      trimmed,
    )
  )
}

function createMathToken(
  state: StateInline,
  latex: string,
  markup: string,
  displayMode = false,
) {
  const token = state.push(
    displayMode ? 'math_block' : 'math_inline',
    displayMode ? 'div' : 'span',
    0,
  )
  token.content = normalizeLatex(latex)
  token.markup = markup
  token.meta = { displayMode }
}

function createInlineTextToken(state: StateInline, text: string) {
  const token = new state.Token('text', '', 0)
  token.content = text
  return token
}

function createInferredInlineMathToken(state: StateInline, latex: string) {
  const token = new state.Token('math_inline', 'span', 0)
  token.content = normalizeLatex(latex)
  token.markup = '()'
  token.meta = { displayMode: false }
  return token
}

function inlineMathRule(state: StateInline, silent: boolean) {
  const { src, pos } = state

  if (src.startsWith('\\(', pos)) {
    const end = findUnescapedMarker(src, '\\)', pos + 2)
    if (end === -1) return false

    const latex = src.slice(pos + 2, end)
    if (!latex.trim() || latex.length > INLINE_MATH_MAX_LENGTH) return false
    if (!silent) createMathToken(state, latex, '\\(', false)
    state.pos = end + 2
    return true
  }

  if (src[pos] === '$' && src[pos + 1] !== '$') {
    if (/\s/.test(src[pos + 1] || '')) return false

    const end = findClosingSingleDollar(src, pos + 1)
    if (end === -1) return false

    const latex = src.slice(pos + 1, end)
    if (
      !latex.trim() ||
      latex.includes('\n') ||
      latex.length > INLINE_MATH_MAX_LENGTH
    )
      return false
    if (!looksLikeFormula(latex)) return false
    if (!silent) createMathToken(state, latex, '$', false)
    state.pos = end + 1
    return true
  }

  return false
}

function inferredParenthesizedMathRule(state: StateInline) {
  const nextTokens: Token[] = []
  let index = 0

  while (index < state.tokens.length) {
    const token = state.tokens[index]

    if (!token || !INFERRED_MATH_TEXT_TOKEN_TYPES.has(token.type)) {
      if (token) nextTokens.push(token)
      index += 1
      continue
    }

    let text = ''
    let cursorIndex = index

    while (cursorIndex < state.tokens.length) {
      const current = state.tokens[cursorIndex]
      if (!current || !INFERRED_MATH_TEXT_TOKEN_TYPES.has(current.type)) break
      text += current.content
      cursorIndex += 1
    }

    if (!text.includes('(')) {
      nextTokens.push(token)
      for (let restIndex = index + 1; restIndex < cursorIndex; restIndex += 1) {
        const restToken = state.tokens[restIndex]
        if (restToken) nextTokens.push(restToken)
      }
      index = cursorIndex
      continue
    }

    const matches = Array.from(text.matchAll(/\(([^()\n]+)\)/g))
    let cursor = 0
    let changed = false

    for (const match of matches) {
      const raw = match[0]
      const latex = match[1] || ''
      const start = match.index ?? 0

      if (!looksLikeFormula(latex, { inferred: true })) continue

      if (start > cursor)
        nextTokens.push(createInlineTextToken(state, text.slice(cursor, start)))
      nextTokens.push(createInferredInlineMathToken(state, latex))
      cursor = start + raw.length
      changed = true
    }

    if (!changed) {
      for (let restIndex = index; restIndex < cursorIndex; restIndex += 1) {
        const restToken = state.tokens[restIndex]
        if (restToken) nextTokens.push(restToken)
      }
      index = cursorIndex
      continue
    }

    if (cursor < text.length)
      nextTokens.push(createInlineTextToken(state, text.slice(cursor)))
    index = cursorIndex
  }

  state.tokens.splice(0, state.tokens.length, ...nextTokens)
  return false
}

function readMathBlock(state: StateBlock, startLine: number, endLine: number) {
  const start = state.bMarks[startLine] + state.tShift[startLine]
  const firstLineEnd = state.eMarks[startLine]
  const firstLine = state.src.slice(start, firstLineEnd)
  const openMarker = firstLine.startsWith('$$')
    ? '$$'
    : firstLine.startsWith('\\[')
      ? '\\['
      : ''
  if (!openMarker) return null

  const closeMarker = openMarker === '$$' ? '$$' : '\\]'
  const firstRest = firstLine.slice(openMarker.length)
  const sameLineEnd = firstRest.indexOf(closeMarker)

  if (sameLineEnd !== -1) {
    const trailing = firstRest.slice(sameLineEnd + closeMarker.length).trim()
    if (trailing) return null
    return {
      content: firstRest.slice(0, sameLineEnd),
      markup: openMarker,
      nextLine: startLine + 1,
    }
  }

  const lines = [firstRest]
  for (let line = startLine + 1; line < endLine; line += 1) {
    const lineStart = state.bMarks[line] + state.tShift[line]
    const lineEnd = state.eMarks[line]
    const lineText = state.src.slice(lineStart, lineEnd)
    const closeIndex = lineText.indexOf(closeMarker)

    if (closeIndex !== -1) {
      const trailing = lineText.slice(closeIndex + closeMarker.length).trim()
      if (trailing) return null
      lines.push(lineText.slice(0, closeIndex))
      return {
        content: lines.join('\n'),
        markup: openMarker,
        nextLine: line + 1,
      }
    }

    lines.push(lineText)
  }

  return null
}

function mathBlockRule(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
) {
  if (state.sCount[startLine] - state.blkIndent >= 4) return false

  const block = readMathBlock(state, startLine, endLine)
  if (!block || !block.content.trim()) return false
  if (silent) return true

  const token = state.push('math_block', 'div', 0)
  token.block = true
  token.content = block.content.trim()
  token.markup = block.markup
  token.map = [startLine, block.nextLine]
  token.meta = { displayMode: true }
  state.line = block.nextLine
  return true
}

function renderMathToken(
  md: MarkdownItInstance,
  tokens: Token[],
  index: number,
  displayMode: boolean,
) {
  const latex = normalizeLatex(tokens[index]?.content || '')
  const escapedLatex = md.utils.escapeHtml(latex)
  const tag = displayMode ? 'div' : 'span'
  const className = displayMode ? 'math-block-wrapper' : 'math-inline-wrapper'
  const suffix = displayMode ? '\n' : ''

  return `<${tag} data-math-latex="${escapedLatex}" data-display-mode="${String(displayMode)}" class="${className}">${escapedLatex}</${tag}>${suffix}`
}

export function markdownMathPlugin(md: MarkdownItInstance) {
  md.inline.ruler.before('text', 'editor_math_inline', inlineMathRule)
  md.inline.ruler2.push(
    'editor_math_parentheses',
    inferredParenthesizedMathRule,
  )
  md.block.ruler.before('paragraph', 'editor_math_block', mathBlockRule, {
    alt: ['paragraph', 'reference', 'blockquote'],
  })
  md.renderer.rules.math_inline = (tokens, index) =>
    renderMathToken(md, tokens, index, false)
  md.renderer.rules.math_block = (tokens, index) =>
    renderMathToken(md, tokens, index, true)
}

export function hasEditorMarkdownMath(markdown: string) {
  const text = markdown.trim()
  if (!text) return false

  return (
    /\\\(([\s\S]+?)\\\)/.test(text) ||
    /\\\[([\s\S]+?)\\\]/.test(text) ||
    /\$\$([\s\S]+?)\$\$/.test(text) ||
    /(^|[^$])\$([^$\n]+?)\$/.test(text) ||
    (/\(([^()\n]+)\)/.test(text) &&
      text.match(/\(([^()\n]+)\)/g)?.some((match) => {
        const latex = match.slice(1, -1)
        return looksLikeFormula(latex, { inferred: true })
      }) === true)
  )
}
