import katex from 'katex'

type DomRoot = Document | Element

const MATH_SKIP_SELECTOR =
  'pre, code, script, style, textarea, [data-math-latex], .katex, .katex-display'

function shouldSkipTextNode(node: Text) {
  const parent = node.parentElement
  return !parent || Boolean(parent.closest(MATH_SKIP_SELECTOR))
}

function looksLikeFormula(value: string) {
  const trimmed = value.trim()
  if (!trimmed || /^\d+(?:[.,]\d+)?$/.test(trimmed)) return false
  return /\\|[_^=+\-*/<>]|[A-Za-z].*[0-9]|[0-9].*[A-Za-z]/.test(trimmed)
}

function createMathElement(doc: Document, latex: string, displayMode: boolean) {
  const element = doc.createElement(displayMode ? 'section' : 'span')
  element.className = displayMode ? 'math-block-wrapper' : 'math-inline-wrapper'
  element.setAttribute('data-math-latex', latex)
  element.setAttribute('data-display-mode', String(displayMode))
  return element
}

function getDomDocument(root: DomRoot) {
  if (typeof document === 'undefined' || typeof NodeFilter === 'undefined')
    return null
  return root.nodeType === 9 ? (root as Document) : root.ownerDocument
}

function renderMathElement(element: HTMLElement) {
  const latex = element.getAttribute('data-math-latex') || ''
  if (!latex.trim() || element.getAttribute('data-math-rendered') === 'true')
    return

  const displayMode = element.getAttribute('data-display-mode') !== 'false'

  try {
    element.innerHTML = katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      output: 'html',
    })
    element.classList.add(
      displayMode ? 'math-block-wrapper' : 'math-inline-wrapper',
    )
    element.setAttribute('data-math-rendered', 'true')
  } catch {
    element.textContent = latex
  }
}

function replaceRawBlockMath(root: DomRoot) {
  const doc = getDomDocument(root)
  if (!doc) return

  const walker = doc.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text)

  for (const node of textNodes) {
    if (shouldSkipTextNode(node) || !node.nodeValue?.includes('$$')) continue

    const text = node.nodeValue
    const matches = Array.from(text.matchAll(/\$\$([\s\S]+?)\$\$/g))
    if (matches.length === 0) continue

    const fragment = node.ownerDocument.createDocumentFragment()
    let cursor = 0

    for (const match of matches) {
      const raw = match[0]
      const latex = match[1]?.trim() || ''
      const index = match.index ?? 0

      if (index > cursor) fragment.append(text.slice(cursor, index))
      fragment.appendChild(createMathElement(node.ownerDocument, latex, true))
      cursor = index + raw.length
    }

    if (cursor < text.length) fragment.append(text.slice(cursor))
    node.replaceWith(fragment)
  }
}

function replaceRawInlineMath(root: DomRoot) {
  const doc = getDomDocument(root)
  if (!doc) return

  const walker = doc.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text)

  for (const node of textNodes) {
    if (shouldSkipTextNode(node) || !node.nodeValue?.includes('$')) continue

    const text = node.nodeValue
    const fragment = node.ownerDocument.createDocumentFragment()
    const matcher = /(^|[^$])\$([^$\n]+?)\$(?=$|[\s?!.,:;，。！？、；：)）\]])/g
    let cursor = 0
    let changed = false

    for (
      let match = matcher.exec(text);
      match !== null;
      match = matcher.exec(text)
    ) {
      const prefix = match[1] || ''
      const latex = match[2]?.trim() || ''
      const fullIndex = match.index
      const dollarIndex = fullIndex + prefix.length

      if (!looksLikeFormula(latex)) continue

      if (dollarIndex > cursor) fragment.append(text.slice(cursor, dollarIndex))
      fragment.appendChild(createMathElement(node.ownerDocument, latex, false))
      cursor = dollarIndex + latex.length + 2
      changed = true
    }

    if (!changed) continue

    if (cursor < text.length) fragment.append(text.slice(cursor))
    node.replaceWith(fragment)
  }
}

export function renderMathElements(root: DomRoot) {
  if (typeof document !== 'undefined') {
    replaceRawBlockMath(root)
    replaceRawInlineMath(root)
  }

  for (const element of Array.from(
    root.querySelectorAll<HTMLElement>('[data-math-latex]'),
  )) {
    renderMathElement(element)
  }
}
