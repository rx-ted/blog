const RUBY_SKIP_SELECTOR = 'pre, code, script, style, textarea, ruby'
const RUBY_PATTERN = /\[([^\]\n]+)\](?:\{([^}\n]+)\}|\^\(([^)\n]+)\))/g
const RUBY_SEPARATOR_PATTERN = /[・．。-]/g

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function shouldSkipTextNode(node: Text) {
  const parent = node.parentElement
  return !parent || Boolean(parent.closest(RUBY_SKIP_SELECTOR))
}

function buildRuby(text: string, ruby: string) {
  const safeText = escapeHtml(text)
  const safeRuby = escapeHtml(ruby)
  return `<ruby data-text="${safeText}" data-ruby="${safeRuby}">${safeText}<rp>(</rp><rt>${safeRuby}</rt><rp>)</rp></ruby>`
}

export function renderRubyAnnotationHtml(text: string, ruby: string) {
  const rubyParts = ruby
    .split(RUBY_SEPARATOR_PATTERN)
    .map((part) => part.trim())
    .filter(Boolean)
  if (rubyParts.length <= 1) return buildRuby(text, ruby.trim())

  const textChars = Array.from(text)
  const result: string[] = []
  let currentIndex = 0

  for (
    let index = 0;
    index < rubyParts.length && currentIndex < textChars.length;
    index += 1
  ) {
    const remainingChars = textChars.length - currentIndex
    const remainingParts = rubyParts.length - index
    const charCount = remainingParts === 1 ? remainingChars : 1
    const currentText = textChars
      .slice(currentIndex, currentIndex + charCount)
      .join('')
    result.push(buildRuby(currentText, rubyParts[index]))
    currentIndex += charCount
  }

  if (currentIndex < textChars.length) {
    result.push(escapeHtml(textChars.slice(currentIndex).join('')))
  }

  return result.join('')
}

function renderRubyTextNode(node: Text) {
  const value = node.nodeValue || ''
  if (!value.includes('[')) return

  RUBY_PATTERN.lastIndex = 0
  if (!RUBY_PATTERN.test(value)) return
  RUBY_PATTERN.lastIndex = 0

  const fragment = node.ownerDocument.createDocumentFragment()
  let cursor = 0

  for (
    let match = RUBY_PATTERN.exec(value);
    match !== null;
    match = RUBY_PATTERN.exec(value)
  ) {
    const index = match.index
    if (index > cursor) fragment.append(value.slice(cursor, index))

    const wrapper = node.ownerDocument.createElement('span')
    wrapper.innerHTML = renderRubyAnnotationHtml(
      match[1],
      match[2] || match[3] || '',
    )
    while (wrapper.firstChild) fragment.appendChild(wrapper.firstChild)

    cursor = index + match[0].length
  }

  if (cursor < value.length) fragment.append(value.slice(cursor))
  node.replaceWith(fragment)
}

export function renderRubyAnnotations(root: Document | Element) {
  if (typeof document === 'undefined' || typeof NodeFilter === 'undefined')
    return

  const doc = root.nodeType === 9 ? (root as Document) : root.ownerDocument
  if (!doc) return

  const walker = doc.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text)

  for (const node of textNodes) {
    if (!shouldSkipTextNode(node)) renderRubyTextNode(node)
  }
}
