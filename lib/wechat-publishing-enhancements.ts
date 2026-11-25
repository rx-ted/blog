type WechatBlockKind =
  | 'note'
  | 'tip'
  | 'info'
  | 'warning'
  | 'danger'
  | 'success'
  | 'quote'
  | 'conclusion'
  | 'profile'
  | 'qrcode'
  | 'badges'
  | 'grid'
  | 'slider'

type TiptapInsertNode = {
  type: string
  attrs?: Record<string, unknown>
  content?: TiptapInsertNode[]
  text?: string
}

type WechatBlockTemplateKind =
  | 'note'
  | 'warning'
  | 'conclusion'
  | 'profile'
  | 'qrcode'
  | 'badges'
  | 'grid'
  | 'slider'

const WECHAT_BLOCK_ALIASES: Record<string, WechatBlockKind> = {
  abstract: 'note',
  alert: 'note',
  author: 'profile',
  badge: 'badges',
  badges: 'badges',
  caution: 'danger',
  conclusion: 'conclusion',
  danger: 'danger',
  error: 'danger',
  grid: 'grid',
  important: 'warning',
  info: 'info',
  infogrid: 'grid',
  note: 'note',
  profile: 'profile',
  qr: 'qrcode',
  qrcode: 'qrcode',
  quote: 'quote',
  slider: 'slider',
  success: 'success',
  tip: 'tip',
  warning: 'warning',
  warn: 'warning',
  作者: 'profile',
  信息: 'info',
  卡片: 'grid',
  危险: 'danger',
  图集: 'slider',
  提示: 'tip',
  注意: 'warning',
  结论: 'conclusion',
  警告: 'warning',
}

const WECHAT_CALLOUT_LABELS: Record<WechatBlockKind, string> = {
  badges: '标签',
  conclusion: '结论',
  danger: '风险',
  grid: '信息',
  info: '信息',
  note: '提示',
  profile: '作者',
  qrcode: '二维码',
  quote: '摘录',
  slider: '图集',
  success: '完成',
  tip: '提示',
  warning: '注意',
}

const WECHAT_BLOCK_TEMPLATES: Record<WechatBlockTemplateKind, string[]> = {
  note: [':::note 提示', '这里写需要读者特别留意的信息。', ':::'],
  warning: [':::warning 注意', '这里写风险、限制或容易误解的地方。', ':::'],
  conclusion: [':::conclusion 结论', '一句话总结这一节最重要的判断。', ':::'],
  profile: [
    ':::profile rx-ted',
    'AI 不插电｜把前沿 AI 变成能用的工作流。',
    ':::',
  ],
  qrcode: [
    ':::qrcode 关注公众号',
    '把二维码图片拖到这里，或粘贴图片链接。',
    ':::',
  ],
  badges: [':::badges', 'AI, 公众号排版, 深度解读', ':::'],
  grid: [
    ':::grid',
    '适合场景 | 发布前检查、产品对比、步骤总结',
    '核心价值 | 信息密度更高，但移动端仍然好读',
    ':::',
  ],
  slider: [
    ':::slider',
    '把多张图片放在这里，发布时会变成横向滑动图组。',
    ':::',
  ],
}

const IMAGE_SIZE_PATTERN =
  /^(\d+(?:\.\d+)?(?:px|%)?)(?:\s*[x×]\s*(\d+(?:\.\d+)?(?:px|%)?))?$/i
const VIDEO_FILE_EXTENSION_PATTERN = /\.(?:m4v|mov|mp4|ogg|ogv|webm)$/i
const EXCLUDED_CONTAINER_SELECTOR = [
  'pre',
  'code',
  '.code-snippet__fix',
  '.wechat-link-references',
  '.wechat-image-slider',
  '.wechat-image-grid',
].join(',')

function paragraph(text: string): TiptapInsertNode {
  return text
    ? { type: 'paragraph', content: [{ type: 'text', text }] }
    : { type: 'paragraph' }
}

export function createWechatBlockTemplate(
  kind: WechatBlockTemplateKind,
): TiptapInsertNode[] {
  return WECHAT_BLOCK_TEMPLATES[kind].map(paragraph)
}

export function getWechatBlockTemplatePreview(kind: WechatBlockTemplateKind) {
  return WECHAT_BLOCK_TEMPLATES[kind].join('\n')
}

function normalizeKind(value: string): WechatBlockKind | null {
  return (
    WECHAT_BLOCK_ALIASES[value.trim().toLowerCase()] ||
    WECHAT_BLOCK_ALIASES[value.trim()] ||
    null
  )
}

function getDocument(root: ParentNode) {
  if (root instanceof Document) return root

  const doc = (root as Node).ownerDocument
  if (!doc) throw new Error('无法解析公众号导出文档')
  return doc
}

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === Node.ELEMENT_NODE
}

function isExcluded(element: Element | null) {
  return Boolean(element?.closest(EXCLUDED_CONTAINER_SELECTOR))
}

function isOnlyMeaninglessText(node: Node) {
  return node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()
}

function getMeaningfulChildNodes(element: Element) {
  return Array.from(element.childNodes).filter((node) => {
    if (isOnlyMeaninglessText(node)) return false
    if (node.nodeType !== Node.ELEMENT_NODE) return true
    return (node as HTMLElement).tagName.toLowerCase() !== 'br'
  })
}

function isFenceParagraph(element: Element | null, expectedClose = false) {
  if (!element || element.tagName.toLowerCase() !== 'p' || isExcluded(element))
    return null
  const text = (element.textContent || '').replace(/\u00a0/g, ' ').trim()
  if (expectedClose) return text === ':::' ? { kind: null, title: '' } : null

  const match = /^:::\s*([\p{L}\p{N}_-]+)(?:\s+(.+))?$/u.exec(text)
  if (!match) return null

  const kind = normalizeKind(match[1])
  if (!kind) return null

  return {
    kind,
    title: (match[2] || '').trim(),
  }
}

function appendMovedNodes(target: Element, nodes: Node[]) {
  for (const node of nodes) {
    if (!isOnlyMeaninglessText(node)) target.appendChild(node)
  }
}

function createSection(
  doc: Document,
  className: string,
  dataset: Record<string, string>,
) {
  const section = doc.createElement('section')
  section.className = className
  for (const [name, value] of Object.entries(dataset)) {
    section.setAttribute(name, value)
  }
  return section
}

function createTitle(doc: Document, className: string, title: string) {
  const element = doc.createElement('p')
  element.className = className
  element.textContent = title
  return element
}

function decodeVideoFilename(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function getVideoFilename(video: HTMLVideoElement) {
  const title = video.getAttribute('title')?.trim()
  if (title) return decodeVideoFilename(title)

  const source =
    video.getAttribute('src') ||
    video.querySelector('source')?.getAttribute('src') ||
    ''
  const pathname = source.split('#')[0]?.split('?')[0] || ''
  const filename = pathname.split('/').filter(Boolean).at(-1) || '视频'
  return decodeVideoFilename(filename)
}

function parseTextVideoFilename(value: string) {
  const normalized = value
    .replace(/\u00a0/g, ' ')
    .trim()
    .replace(/\\\[/g, '[')
    .replace(/\\\]/g, ']')
    .replace(/\\\./g, '.')
    .replace(/\\-/g, '-')
  if (!normalized.startsWith('[') || !normalized.endsWith(']')) return ''

  const filename = normalized.slice(1, -1).trim()
  if (
    !filename ||
    filename.includes('[') ||
    filename.includes(']') ||
    /[\r\n]/.test(filename)
  )
    return ''
  return VIDEO_FILE_EXTENSION_PATTERN.test(filename) ? filename : ''
}

function createVideoPlaceholder(
  doc: Document,
  filename: string,
  inline = false,
) {
  const placeholder = doc.createElement(inline ? 'span' : 'p')
  placeholder.className = 'wechat-video-placeholder'
  placeholder.setAttribute('data-wechat-video-placeholder', 'true')
  placeholder.textContent = `【插入视频：${filename}】`
  return placeholder
}

export function normalizeWechatVideoPlaceholders(root: ParentNode) {
  const doc = getDocument(root)

  for (const video of Array.from(
    root.querySelectorAll<HTMLVideoElement>('video'),
  )) {
    if (isExcluded(video)) continue

    const parent = video.parentElement
    const isOnlyChild = Boolean(
      parent &&
        parent.tagName.toLowerCase() === 'p' &&
        getMeaningfulChildNodes(parent).length === 1,
    )
    const target = isOnlyChild && parent ? parent : video
    const inline = target === video && parent?.tagName.toLowerCase() === 'p'
    target.replaceWith(
      createVideoPlaceholder(doc, getVideoFilename(video), inline),
    )
  }

  for (const paragraph of Array.from(
    root.querySelectorAll<HTMLParagraphElement>('p'),
  )) {
    if (
      !paragraph.isConnected ||
      isExcluded(paragraph) ||
      paragraph.matches('[data-wechat-video-placeholder]')
    )
      continue
    const filename = parseTextVideoFilename(paragraph.textContent || '')
    if (!filename) continue
    paragraph.replaceWith(createVideoPlaceholder(doc, filename))
  }
}

function createCalloutBlock(
  doc: Document,
  kind: WechatBlockKind,
  title: string,
  nodes: Node[],
) {
  const section = createSection(doc, `wechat-callout wechat-callout-${kind}`, {
    'data-wechat-callout': kind,
  })
  section.appendChild(
    createTitle(
      doc,
      'wechat-callout-title',
      title || WECHAT_CALLOUT_LABELS[kind] || '提示',
    ),
  )

  const body = createSection(doc, 'wechat-callout-body', {
    'data-wechat-callout-body': 'true',
  })
  appendMovedNodes(body, nodes)
  section.appendChild(body)
  return section
}

function createProfileBlock(doc: Document, title: string, nodes: Node[]) {
  const section = createSection(doc, 'wechat-profile-card', {
    'data-wechat-component': 'profile',
  })
  section.appendChild(
    createTitle(doc, 'wechat-profile-name', title || 'rx-ted'),
  )

  const body = createSection(doc, 'wechat-profile-body', {
    'data-wechat-component-body': 'true',
  })
  appendMovedNodes(body, nodes)
  section.appendChild(body)
  return section
}

function createQrCodeBlock(doc: Document, title: string, nodes: Node[]) {
  const section = createSection(doc, 'wechat-qrcode-card', {
    'data-wechat-component': 'qrcode',
  })
  section.appendChild(
    createTitle(doc, 'wechat-qrcode-title', title || '扫码关注'),
  )

  const body = createSection(doc, 'wechat-qrcode-body', {
    'data-wechat-component-body': 'true',
  })
  appendMovedNodes(body, nodes)
  section.appendChild(body)
  return section
}

function collectTextFromNodes(nodes: Node[]) {
  return nodes
    .map((node) => node.textContent || '')
    .join('\n')
    .trim()
}

function createBadgeGroup(doc: Document, nodes: Node[]) {
  const section = createSection(doc, 'wechat-badge-group', {
    'data-wechat-component': 'badges',
  })
  const items = collectTextFromNodes(nodes)
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean)

  for (const item of items.length > 0 ? items : ['重点']) {
    const badge = doc.createElement('span')
    badge.className = 'wechat-badge'
    badge.textContent = item
    section.appendChild(badge)
  }

  return section
}

function parseGridRows(nodes: Node[]) {
  const lines = collectTextFromNodes(nodes)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.map((line) => {
    const pipeIndex = line.indexOf('|')
    if (pipeIndex >= 0) {
      return {
        label: line.slice(0, pipeIndex).trim(),
        value: line.slice(pipeIndex + 1).trim(),
      }
    }

    const colonMatch = /^([^:：]{1,24})[:：]\s*(.+)$/.exec(line)
    if (colonMatch) {
      return {
        label: colonMatch[1].trim(),
        value: colonMatch[2].trim(),
      }
    }

    return {
      label: '信息',
      value: line,
    }
  })
}

function createInfoGrid(doc: Document, nodes: Node[]) {
  const section = createSection(doc, 'wechat-info-grid', {
    'data-wechat-component': 'grid',
  })
  const rows = parseGridRows(nodes)

  for (const row of rows.length > 0
    ? rows
    : [{ label: '信息', value: '补充内容' }]) {
    const card = doc.createElement('section')
    card.className = 'wechat-info-card'

    const label = doc.createElement('span')
    label.className = 'wechat-info-label'
    label.textContent = row.label
    card.appendChild(label)

    const value = doc.createElement('span')
    value.className = 'wechat-info-value'
    value.textContent = row.value
    card.appendChild(value)

    section.appendChild(card)
  }

  return section
}

function createImageSlider(doc: Document, title: string, nodes: Node[]) {
  const section = createSection(doc, 'wechat-image-slider', {
    'data-wechat-component': 'slider',
  })
  if (title)
    section.appendChild(createTitle(doc, 'wechat-image-slider-title', title))

  const track = createSection(doc, 'wechat-image-slider-track', {
    'data-wechat-slider-track': 'true',
  })
  for (const node of nodes) {
    if (isOnlyMeaninglessText(node)) continue
    const item = doc.createElement('section')
    item.className = 'wechat-image-slider-item'
    item.appendChild(node)
    track.appendChild(item)
  }

  section.appendChild(track)
  const hint = doc.createElement('p')
  hint.className = 'wechat-image-slider-hint'
  hint.textContent = '左右滑动看更多'
  section.appendChild(hint)
  return section
}

function createWechatBlock(
  doc: Document,
  kind: WechatBlockKind,
  title: string,
  nodes: Node[],
) {
  if (kind === 'profile') return createProfileBlock(doc, title, nodes)
  if (kind === 'qrcode') return createQrCodeBlock(doc, title, nodes)
  if (kind === 'badges') return createBadgeGroup(doc, nodes)
  if (kind === 'grid') return createInfoGrid(doc, nodes)
  if (kind === 'slider') return createImageSlider(doc, title, nodes)
  return createCalloutBlock(doc, kind, title, nodes)
}

export function normalizeWechatFencedBlocks(root: ParentNode) {
  const paragraphs = Array.from(root.querySelectorAll('p'))

  for (const opener of paragraphs) {
    if (!opener.isConnected) continue

    const fence = isFenceParagraph(opener)
    if (!fence?.kind || !opener.parentNode) continue

    const nodes: Node[] = []
    let closer: Element | null = null
    let cursor = opener.nextSibling

    while (cursor) {
      const current = cursor
      cursor = current.nextSibling

      if (isElement(current) && isFenceParagraph(current, true)) {
        closer = current
        break
      }

      nodes.push(current)
    }

    if (!closer) continue

    const block = createWechatBlock(
      getDocument(root),
      fence.kind,
      fence.title,
      nodes,
    )
    opener.parentNode.insertBefore(block, opener)
    opener.remove()
    closer.remove()
  }
}

function findFirstTextNode(element: Element) {
  const doc = element.ownerDocument
  const walker = doc.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  return walker.nextNode()
}

function removeEmptyFirstParagraph(element: Element) {
  const first = Array.from(element.children).find(
    (child) => child.tagName.toLowerCase() !== 'br',
  )
  if (!first || first.tagName.toLowerCase() !== 'p') return
  if (
    getMeaningfulChildNodes(first).length === 0 ||
    !(first.textContent || '').trim()
  )
    first.remove()
}

export function normalizeWechatAlertBlockquotes(root: ParentNode) {
  const doc = getDocument(root)

  for (const quote of Array.from(root.querySelectorAll('blockquote'))) {
    if (
      !quote.isConnected ||
      isExcluded(quote) ||
      quote.closest('[data-wechat-callout]')
    )
      continue

    const textNode = findFirstTextNode(quote)
    const text = textNode?.textContent || ''
    const match = /^\s*\[!([^\]]+)\]\s*([^\n]*)/.exec(text)
    if (!match) continue

    const kind = normalizeKind(match[1]) || 'note'
    const title = match[2].trim()
    if (textNode) textNode.textContent = text.slice(match[0].length)
    removeEmptyFirstParagraph(quote)

    const children = Array.from(quote.childNodes)
    const callout = createCalloutBlock(doc, kind, title, children)
    quote.replaceWith(callout)
  }
}

function normalizeCssSize(value: string) {
  const size = value.trim()
  if (!size) return ''
  if (size.endsWith('%') || size.endsWith('px')) return size
  return `${size}px`
}

function isFileLikeCaption(value: string) {
  return /\.(?:avif|gif|jpe?g|png|svg|webp)(?:\?.*)?$/i.test(value.trim())
}

function parseImageAltSyntax(alt: string) {
  const parts = alt
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length < 2) return null

  const size = parts.at(-1)
  const match = size ? IMAGE_SIZE_PATTERN.exec(size) : null
  if (!match) return null

  const caption = parts.slice(0, -1).join(' | ').trim()
  return {
    caption: caption && !isFileLikeCaption(caption) ? caption : '',
    width: normalizeCssSize(match[1]),
    height: match[2] ? normalizeCssSize(match[2]) : '',
  }
}

function isImageCarrier(element: Element, image: HTMLImageElement) {
  if (element === image) return true
  if (element.tagName.toLowerCase() !== 'a') return false
  const children = getMeaningfulChildNodes(element)
  return children.length === 1 && children[0] === image
}

function wrapImageWithFigure(image: HTMLImageElement, caption: string) {
  if (image.closest('figure, .wechat-image-slider, table.wechat-image-grid'))
    return

  const doc = image.ownerDocument
  const figure = doc.createElement('figure')
  figure.className = 'wechat-figure'
  figure.setAttribute('data-wechat-figure', 'true')

  const parent = image.parentElement
  const carrier = parent && isImageCarrier(parent, image) ? parent : image
  const carrierParent = carrier.parentElement
  const carrierGrandparent = carrierParent?.parentNode

  if (!carrierParent || !carrierGrandparent) return

  if (
    carrierParent.tagName.toLowerCase() === 'p' &&
    getMeaningfulChildNodes(carrierParent).length === 1 &&
    getMeaningfulChildNodes(carrierParent)[0] === carrier
  ) {
    carrierGrandparent.insertBefore(figure, carrierParent)
    figure.appendChild(carrier)
    carrierParent.remove()
  } else {
    carrierParent.insertBefore(figure, carrier)
    figure.appendChild(carrier)
  }

  const figcaption = doc.createElement('figcaption')
  figcaption.className = 'wechat-figure-caption'
  figcaption.textContent = caption
  figure.appendChild(figcaption)
}

export function normalizeWechatImageFigures(root: ParentNode) {
  for (const image of Array.from(
    root.querySelectorAll<HTMLImageElement>('img'),
  )) {
    if (isExcluded(image) || image.closest('figure, table.wechat-image-grid'))
      continue

    const parsed = parseImageAltSyntax(image.getAttribute('alt') || '')
    if (parsed?.width) {
      image.style.width = parsed.width
      image.style.maxWidth = '100%'
    }
    if (parsed?.height) {
      image.style.height = parsed.height
    }

    const explicitCaption =
      image.getAttribute('data-caption') || image.getAttribute('title') || ''
    const caption = explicitCaption.trim() || parsed?.caption || ''
    if (caption) wrapImageWithFigure(image, caption)
  }
}

function createInlineMark(doc: Document, kind: string, text: string) {
  const span = doc.createElement('span')
  span.className = `wechat-inline-mark wechat-inline-mark-${kind}`
  span.setAttribute('data-wechat-inline-mark', kind)
  span.textContent = text
  return span
}

function findNextInlineMarker(text: string, offset: number) {
  const candidates = [
    { kind: 'highlight', marker: '==', index: text.indexOf('==', offset) },
    { kind: 'underline', marker: '++', index: text.indexOf('++', offset) },
    { kind: 'wavy', marker: '~', index: text.indexOf('~', offset) },
  ].filter((candidate) => candidate.index >= 0)

  candidates.sort((a, b) => a.index - b.index)

  for (const candidate of candidates) {
    if (candidate.marker === '~') {
      if (
        text[candidate.index - 1] === '~' ||
        text[candidate.index + 1] === '~'
      )
        continue
    }

    const contentStart = candidate.index + candidate.marker.length
    const end = text.indexOf(candidate.marker, contentStart)
    if (end <= contentStart) continue
    if (candidate.marker === '~' && text[end + 1] === '~') continue

    return {
      ...candidate,
      contentStart,
      end,
      content: text.slice(contentStart, end),
    }
  }

  return null
}

function replaceInlineMarkupTextNode(node: Text) {
  const text = node.textContent || ''
  if (!text.includes('==') && !text.includes('++') && !text.includes('~'))
    return

  const doc = node.ownerDocument
  const fragment = doc.createDocumentFragment()
  let offset = 0
  let changed = false

  while (offset < text.length) {
    const match = findNextInlineMarker(text, offset)
    if (!match) break

    if (match.index > offset) {
      fragment.appendChild(doc.createTextNode(text.slice(offset, match.index)))
    }

    fragment.appendChild(createInlineMark(doc, match.kind, match.content))
    offset = match.end + match.marker.length
    changed = true
  }

  if (!changed) return

  if (offset < text.length) {
    fragment.appendChild(doc.createTextNode(text.slice(offset)))
  }

  node.replaceWith(fragment)
}

export function normalizeWechatInlineMarkup(root: ParentNode) {
  const doc = getDocument(root)
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement
      if (
        !parent ||
        isExcluded(parent) ||
        parent.closest('a, ruby, .wechat-inline-mark')
      )
        return NodeFilter.FILTER_REJECT
      const text = node.textContent || ''
      return text.includes('==') || text.includes('++') || text.includes('~')
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT
    },
  })
  const nodes: Text[] = []
  let current = walker.nextNode()
  while (current) {
    nodes.push(current as Text)
    current = walker.nextNode()
  }

  nodes.forEach(replaceInlineMarkupTextNode)
}

function isImageOnlyLink(anchor: HTMLAnchorElement) {
  const children = getMeaningfulChildNodes(anchor)
  return (
    children.length === 1 &&
    isElement(children[0]) &&
    children[0].tagName.toLowerCase() === 'img'
  )
}

function normalizeHref(value: string, baseUrl: string) {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return ''
  }
}

function shouldCollectExternalLinkReference(
  anchor: HTMLAnchorElement,
  baseUrl: string,
) {
  const href = anchor.getAttribute('href') || ''
  if (!/^https?:\/\//i.test(href)) return false
  if (anchor.closest('.wechat-link-references, pre, code, figure')) return false
  if (isImageOnlyLink(anchor)) return false
  if (!(anchor.textContent || '').trim()) return false

  const normalized = normalizeHref(href, baseUrl)
  if (!normalized) return false

  try {
    const url = new URL(normalized)
    const base = new URL(baseUrl)
    return url.origin !== base.origin
  } catch {
    return true
  }
}

export function normalizeWechatExternalLinkFootnotes(
  root: ParentNode,
  baseUrl: string,
) {
  const doc = getDocument(root)
  root
    .querySelectorAll('.wechat-link-references, sup.wechat-link-ref')
    .forEach((element) => {
      element.remove()
    })

  const references = new Map<string, { index: number; href: string }>()
  for (const anchor of Array.from(
    root.querySelectorAll<HTMLAnchorElement>('a[href]'),
  )) {
    if (!shouldCollectExternalLinkReference(anchor, baseUrl)) continue

    const href = normalizeHref(anchor.getAttribute('href') || '', baseUrl)
    let reference = references.get(href)
    if (!reference) {
      reference = {
        index: references.size + 1,
        href,
      }
      references.set(href, reference)
    }
  }

  if (references.size === 0) return

  const section = createSection(doc, 'wechat-link-references', {
    'data-wechat-link-references': 'true',
  })
  section.appendChild(
    createTitle(doc, 'wechat-link-references-title', '参考链接'),
  )

  for (const reference of references.values()) {
    const item = doc.createElement('p')
    item.className = 'wechat-link-reference-item'

    const number = doc.createElement('span')
    number.className = 'wechat-link-reference-number'
    number.textContent = `[${reference.index}]`
    item.appendChild(number)

    const text = doc.createElement('span')
    text.className = 'wechat-link-reference-text'
    text.textContent = reference.href
    item.appendChild(text)
    section.appendChild(item)
  }

  const body = root instanceof Document ? root.body : root
  body.appendChild(section)
}

export function normalizeWechatPublishingBlocks(root: ParentNode) {
  normalizeWechatFencedBlocks(root)
  normalizeWechatAlertBlockquotes(root)
}

export function normalizeWechatPublishingHtml(html: string) {
  if (!html || typeof DOMParser === 'undefined') return html

  const doc = new DOMParser().parseFromString(html, 'text/html')
  normalizeWechatPublishingBlocks(doc)
  normalizeWechatInlineMarkup(doc)
  normalizeWechatImageFigures(doc)
  return doc.body.innerHTML
}
