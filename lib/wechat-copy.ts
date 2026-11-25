'use client'

import juice from 'juice'
import {
  buildPlainCodeLinesHtml,
  getCodeLanguage,
  isInfographicLanguage,
  isMermaidLanguage,
  isPlantUmlLanguage,
} from './code-highlight'
import { renderVisualDiagramsInHtml } from './content-enhancers'
import { renderMathElements } from './math-render'
import { renderRubyAnnotations } from './ruby-render'
import {
  rewriteWechatExportImageUrl,
  type WechatExportImageVariant,
} from './wechat-export-images'
import {
  buildWechatExportCss,
  normalizeWechatExportHtml,
  type WechatExportStyleTokens,
} from './wechat-export-style'
import {
  normalizeWechatExternalLinkFootnotes,
  normalizeWechatImageFigures,
  normalizeWechatInlineMarkup,
  normalizeWechatPublishingBlocks,
  normalizeWechatVideoPlaceholders,
} from './wechat-publishing-enhancements'
import {
  fetchWechatExportThemeConfig,
  getPreferredWechatExportThemeId,
} from './wechat-theme-client'
import { getWechatExportTheme, type WechatExportTheme } from './wechat-themes'
import {
  formatWechatOrderedListMarker,
  getWechatUnorderedListMarker,
  WECHAT_LIST_MARKER_CLASS,
} from './wechat-list-markers'

type ExportMode = 'bridge' | 'clipboard' | 'pdf'

interface WechatArticleExportOptions {
  theme?: WechatExportTheme | null
}

interface WechatCopyOptions extends WechatArticleExportOptions {
  themeId?: string
  inlineImagesAsBase64?: boolean
}

const URL_ATTRIBUTES = [
  ['img', 'src'],
  ['a', 'href'],
  ['audio', 'src'],
  ['video', 'src'],
  ['source', 'src'],
  ['iframe', 'src'],
] as const

const THEME_OWNED_INLINE_STYLE_PROPERTIES = [
  'color',
  'background',
  'background-color',
  'background-image',
  'font',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-decoration-color',
  'caret-color',
  'border-left',
  'border-left-color',
  'border-left-style',
  'border-left-width',
  'border-radius',
] as const

const WECHAT_MAC_CODE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="45px" height="13px" viewBox="0 0 450 130">
  <ellipse cx="50" cy="65" rx="50" ry="52" stroke="rgb(220,60,54)" stroke-width="2" fill="rgb(237,108,96)" />
  <ellipse cx="225" cy="65" rx="50" ry="52" stroke="rgb(218,151,33)" stroke-width="2" fill="rgb(247,193,81)" />
  <ellipse cx="400" cy="65" rx="50" ry="52" stroke="rgb(27,161,37)" stroke-width="2" fill="rgb(100,200,86)" />
</svg>
`.trim()

function shouldRewriteUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith('#')) return false
  if (/^(?:[a-z]+:|\/\/)/i.test(trimmed)) return false
  return true
}

function absolutizeUrls(root: Document | Element, baseUrl: string) {
  for (const [selector, attribute] of URL_ATTRIBUTES) {
    for (const element of root.querySelectorAll<HTMLElement>(selector)) {
      const value = element.getAttribute(attribute)
      if (!value || !shouldRewriteUrl(value)) continue
      element.setAttribute(attribute, new URL(value, baseUrl).toString())
    }
  }
}

function cleanAttributeValue(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, '')
}

function readCssVar(
  style: CSSStyleDeclaration,
  name: string,
  fallback: string,
) {
  const value = style.getPropertyValue(name)
  return value ? cleanAttributeValue(value) : fallback
}

function readWechatExportStyleTokens(): WechatExportStyleTokens {
  const rootStyle = window.getComputedStyle(document.documentElement)
  const bodyStyle = window.getComputedStyle(document.body)
  const bodyFont = readCssVar(
    rootStyle,
    '--body-font',
    bodyStyle.fontFamily || 'Arial, Helvetica, sans-serif',
  )

  return {
    background: readCssVar(rootStyle, '--background', '#f5f4ed'),
    panelBackground: readCssVar(rootStyle, '--editor-panel', '#faf9f5'),
    softBackground: readCssVar(rootStyle, '--editor-soft', '#e8e6dc'),
    lineColor: readCssVar(rootStyle, '--editor-line', '#f0eee6'),
    inkColor: readCssVar(rootStyle, '--editor-ink', '#141413'),
    mutedColor: readCssVar(rootStyle, '--editor-muted', '#5e5d59'),
    accentColor: readCssVar(rootStyle, '--editor-accent', '#c96442'),
    linkColor: readCssVar(rootStyle, '--editor-link', '#c96442'),
    codeBackground: readCssVar(rootStyle, '--editor-code-bg', '#faf9f5'),
    codeBorderColor: readCssVar(rootStyle, '--editor-code-border', '#e8e6dc'),
    quoteBackground: readCssVar(rootStyle, '--editor-quote-bg', '#faf9f5'),
    articleHeadingColor: readCssVar(rootStyle, '--article-heading', '#17120d'),
    articleBodyColor: readCssVar(rootStyle, '--article-body', '#2b241c'),
    articleQuoteColor: readCssVar(rootStyle, '--article-quote', '#51473a'),
    articleQuoteBorderColor: readCssVar(
      rootStyle,
      '--article-quote-border',
      '#cdb796',
    ),
    articleQuoteNestedBorderColor: readCssVar(
      rootStyle,
      '--article-quote-nested-border',
      '#b8a68a',
    ),
    articleQuoteNestedBackground: readCssVar(
      rootStyle,
      '--article-quote-nested-bg',
      'rgba(0, 0, 0, 0.02)',
    ),
    bodyFontFamily: bodyFont,
    monoFontFamily: readCssVar(
      rootStyle,
      '--font-geist-mono',
      '"SFMono-Regular", Consolas, monospace',
    ),
    titleFontFamily: readCssVar(
      rootStyle,
      '--article-heading-font',
      '"Songti SC", STSong, "Noto Serif CJK SC", "Source Han Serif SC", Georgia, serif',
    ),
  }
}

function normalizeMediaAttributes(root: ParentNode) {
  for (const image of root.querySelectorAll<HTMLImageElement>('img')) {
    const width = image.getAttribute('width')
    const height = image.getAttribute('height')

    if (width) {
      image.removeAttribute('width')
      image.style.width = /^\d+$/.test(width) ? `${width}px` : width
    }

    if (height) {
      image.removeAttribute('height')
      image.style.height = /^\d+$/.test(height) ? `${height}px` : height
    }
  }
}

function stripThemeConflictingInlineStyles(root: ParentNode) {
  for (const element of root.querySelectorAll<HTMLElement>('*')) {
    if (element.closest('pre, code, .code__pre')) continue

    for (const property of THEME_OWNED_INLINE_STYLE_PROPERTIES) {
      element.style.removeProperty(property)
    }

    const style = element.getAttribute('style')
    if (!style || style.trim().length === 0) {
      element.removeAttribute('style')
    }
  }
}

function normalizeCodeLinesMarkup(code: HTMLElement) {
  if (code.querySelector(':scope > .wechat-code-body')) return

  const codeText = (code.textContent || '').replace(/\r\n/g, '\n')
  const body = code.ownerDocument.createElement('span')
  body.className = 'wechat-code-body'

  const codeScroll = code.ownerDocument.createElement('span')
  codeScroll.className = 'wechat-code-scroll'

  const codeLines = code.ownerDocument.createElement('span')
  codeLines.className = 'wechat-code-lines'
  codeLines.innerHTML = buildPlainCodeLinesHtml(codeText)

  codeScroll.appendChild(codeLines)
  body.appendChild(codeScroll)
  code.replaceChildren(body)
}

function normalizeVisualDiagramMarkup(root: ParentNode) {
  for (const code of Array.from(
    root.querySelectorAll<HTMLElement>('pre > code'),
  )) {
    const language = getCodeLanguage(code)
    const isMermaid = isMermaidLanguage(language)
    const isPlantUml = isPlantUmlLanguage(language)
    const isInfographic = isInfographicLanguage(language)
    if (!isMermaid && !isPlantUml && !isInfographic) continue

    const pre = code.closest('pre')
    if (!pre) continue

    const diagram = code.ownerDocument.createElement('section')
    const label = isMermaid
      ? 'Mermaid'
      : isPlantUml
        ? 'PlantUML'
        : 'Infographic'
    diagram.className = isMermaid
      ? 'mermaid-diagram'
      : isPlantUml
        ? 'plantuml-diagram'
        : 'infographic-diagram'
    diagram.setAttribute(
      isMermaid
        ? 'data-mermaid-code'
        : isPlantUml
          ? 'data-plantuml-code'
          : 'data-infographic-code',
      code.textContent || '',
    )
    diagram.textContent = `正在渲染 ${label}...`
    pre.replaceWith(diagram)
  }
}

function normalizeCodeBlockMarkup(root: ParentNode) {
  for (const pre of root.querySelectorAll<HTMLPreElement>('pre')) {
    const code = pre.querySelector<HTMLElement>('code')
    if (!code) continue

    pre.classList.add('code__pre')

    normalizeCodeLinesMarkup(code)

    for (const sign of pre.querySelectorAll(':scope > .mac-sign')) {
      sign.remove()
    }

    const sign = pre.ownerDocument.createElement('span')
    sign.className = 'mac-sign'
    sign.setAttribute('aria-hidden', 'true')
    sign.setAttribute('style', 'padding: 10px 14px 0;')
    sign.innerHTML = WECHAT_MAC_CODE_SVG

    pre.insertBefore(sign, code)
  }
}

function isListElement(
  element: Element,
): element is HTMLUListElement | HTMLOListElement {
  const tagName = element.tagName.toLowerCase()
  return tagName === 'ul' || tagName === 'ol'
}

function readIntegerAttribute(element: Element, name: string) {
  const value = element.getAttribute(name)
  if (!value) return null

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function getListDepth(list: Element) {
  let depth = 0
  let current = list.parentElement
  while (current) {
    if (isListElement(current)) depth += 1
    current = current.parentElement
  }
  return depth
}

function getDirectListItems(list: Element) {
  return Array.from(list.children).filter(
    (child): child is HTMLLIElement => child.tagName.toLowerCase() === 'li',
  )
}

function isExistingListMarker(element: Element) {
  return element.classList.contains(WECHAT_LIST_MARKER_CLASS)
}

function hasDirectListMarker(item: HTMLLIElement) {
  for (const child of Array.from(item.children)) {
    if (isExistingListMarker(child)) return true
    if (isListElement(child)) continue
    if (
      child.firstElementChild &&
      isExistingListMarker(child.firstElementChild)
    )
      return true
  }
  return false
}

function isTaskList(list: Element) {
  return (
    list.tagName.toLowerCase() === 'ul' &&
    list.getAttribute('data-type') === 'taskList'
  )
}

function findTaskCheckbox(item: HTMLLIElement) {
  for (const child of Array.from(item.children)) {
    if (child.tagName.toLowerCase() === 'label') {
      const input = child.querySelector<HTMLInputElement>(
        'input[type="checkbox"]',
      )
      if (input) return input
    }
    if (
      child.tagName.toLowerCase() === 'input' &&
      child.getAttribute('type') === 'checkbox'
    ) {
      return child as HTMLInputElement
    }
  }
  return null
}

function isEmptyListItemBlock(element: Element) {
  const tagName = element.tagName.toLowerCase()
  if (tagName !== 'p' && tagName !== 'div') return false

  return getMeaningfulChildNodes(element).length === 0
}

function removeLeadingEmptyListItemBlocks(item: HTMLLIElement) {
  for (const child of Array.from(item.children)) {
    if (isListElement(child)) break
    if (!isEmptyListItemBlock(child)) break
    child.remove()
  }
}

function removeDirectTaskControl(item: HTMLLIElement) {
  for (const child of Array.from(item.children)) {
    const tagName = child.tagName.toLowerCase()
    if (tagName === 'label') {
      child.remove()
      continue
    }
    if (tagName === 'input' && child.getAttribute('type') === 'checkbox') {
      child.remove()
    }
  }
}

function hasMarkerContent(element: Element) {
  if (element.textContent?.replace(/\u00a0/g, ' ').trim()) return true
  return Boolean(
    element.querySelector(
      'img, video, audio, iframe, svg, math, table, pre, code',
    ),
  )
}

function findFirstMarkerContentBlock(element: HTMLElement): HTMLElement | null {
  if (element.tagName.toLowerCase() === 'p' && hasMarkerContent(element))
    return element

  for (const child of Array.from(element.children)) {
    const tagName = child.tagName.toLowerCase()
    if (isListElement(child) || tagName === 'label') continue
    if (!hasMarkerContent(child)) continue
    if (tagName === 'p') return child as HTMLElement
    if (tagName === 'div' || tagName === 'section') {
      return (
        findFirstMarkerContentBlock(child as HTMLElement) ||
        (child as HTMLElement)
      )
    }
    return child as HTMLElement
  }

  return null
}

function findMarkerTarget(item: HTMLLIElement) {
  for (const node of Array.from(item.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      return item
    }

    if (node.nodeType !== Node.ELEMENT_NODE) continue

    const element = node as HTMLElement
    if (isListElement(element) || element.tagName.toLowerCase() === 'label')
      continue
    if (!hasMarkerContent(element)) continue

    if (
      element.tagName.toLowerCase() === 'p' ||
      element.tagName.toLowerCase() === 'div' ||
      element.tagName.toLowerCase() === 'section'
    ) {
      return findFirstMarkerContentBlock(element) || element
    }

    return element
  }

  return item
}

function prependListMarker(
  item: HTMLLIElement,
  marker: string,
  options: { task?: boolean } = {},
) {
  if (hasDirectListMarker(item)) return

  const target = findMarkerTarget(item)
  const markerElement = item.ownerDocument.createElement('span')
  markerElement.className = WECHAT_LIST_MARKER_CLASS
  markerElement.setAttribute('data-wechat-list-marker', 'true')
  markerElement.setAttribute('aria-hidden', 'true')
  if (options.task)
    markerElement.setAttribute('data-wechat-task-marker', 'true')
  markerElement.textContent = marker

  target.insertBefore(markerElement, target.firstChild)
}

function normalizeWechatList(
  list: HTMLUListElement | HTMLOListElement,
  depth: number,
) {
  const ordered = list.tagName.toLowerCase() === 'ol'
  const taskList = isTaskList(list)
  const orderedType = ordered ? list.getAttribute('type') || '1' : '1'
  let counter = ordered ? (readIntegerAttribute(list, 'start') ?? 1) : 1

  list.setAttribute(
    'data-wechat-list',
    ordered ? 'ordered' : taskList ? 'task' : 'unordered',
  )

  for (const item of getDirectListItems(list)) {
    removeLeadingEmptyListItemBlocks(item)

    if (taskList) {
      const checkbox = findTaskCheckbox(item)
      const checked =
        item.getAttribute('data-checked') === 'true' ||
        Boolean(checkbox?.checked) ||
        Boolean(checkbox?.hasAttribute('checked')) ||
        checkbox?.getAttribute('aria-checked') === 'true'
      removeDirectTaskControl(item)
      prependListMarker(item, checked ? '☑' : '☐', { task: true })
    } else if (ordered) {
      const explicitValue = readIntegerAttribute(item, 'value')
      const value = explicitValue ?? counter
      prependListMarker(item, formatWechatOrderedListMarker(value, orderedType))
      counter = value + 1
    } else {
      prependListMarker(item, getWechatUnorderedListMarker(depth))
    }
  }
}

function normalizeWechatListMarkup(root: ParentNode) {
  const lists = Array.from(
    root.querySelectorAll<HTMLUListElement | HTMLOListElement>('ul, ol'),
  ).filter((list) => !list.closest('pre, code, .code-snippet__fix'))

  for (const list of lists) {
    normalizeWechatList(list, getListDepth(list))
  }
}

function getMeaningfulChildNodes(element: Element) {
  return Array.from(element.childNodes).filter((node) => {
    if (node.nodeType === Node.TEXT_NODE)
      return Boolean(node.textContent?.trim())
    if (node.nodeType !== Node.ELEMENT_NODE) return true
    return (node as Element).tagName.toLowerCase() !== 'br'
  })
}

function isImageGridItem(node: Node): node is HTMLElement {
  if (node.nodeType !== Node.ELEMENT_NODE) return false

  const element = node as HTMLElement
  const tagName = element.tagName.toLowerCase()

  if (tagName === 'img') return true
  if (tagName !== 'a') return false

  const children = getMeaningfulChildNodes(element)
  return (
    children.length === 1 &&
    children[0].nodeType === Node.ELEMENT_NODE &&
    (children[0] as HTMLElement).tagName.toLowerCase() === 'img'
  )
}

function getImageOnlyParagraphItems(paragraph: HTMLParagraphElement) {
  if (paragraph.closest('pre, code, .code-snippet__fix')) return null
  if (
    paragraph.closest('.wechat-image-slider, [data-wechat-component="slider"]')
  )
    return null

  const children = getMeaningfulChildNodes(paragraph)
  if (children.length === 0) return null
  if (!children.every(isImageGridItem)) return null

  return children as HTMLElement[]
}

function createWechatImageGridTable(doc: Document, items: HTMLElement[]) {
  const table = doc.createElement('table')
  table.className = 'wechat-image-grid'
  table.setAttribute('data-wechat-image-grid', 'true')

  const tbody = doc.createElement('tbody')

  for (let index = 0; index < items.length; index += 2) {
    const row = doc.createElement('tr')
    row.setAttribute('data-wechat-image-grid-row', 'true')

    for (const item of items.slice(index, index + 2)) {
      const cell = doc.createElement('td')
      cell.setAttribute('data-wechat-image-grid-cell', 'true')
      cell.appendChild(item)
      row.appendChild(cell)
    }

    tbody.appendChild(row)
  }

  table.appendChild(tbody)
  return table
}

function normalizeWechatImageGridMarkup(root: ParentNode) {
  const paragraphs = Array.from(
    root.querySelectorAll<HTMLParagraphElement>('p'),
  )
  const processed = new Set<HTMLParagraphElement>()

  for (const paragraph of paragraphs) {
    if (!paragraph.isConnected || processed.has(paragraph)) continue

    const firstItems = getImageOnlyParagraphItems(paragraph)
    if (!firstItems) continue

    const run = [paragraph]
    const items = [...firstItems]
    processed.add(paragraph)

    let cursor = paragraph.nextElementSibling
    while (cursor?.tagName.toLowerCase() === 'p') {
      const nextParagraph = cursor as HTMLParagraphElement
      const nextItems = getImageOnlyParagraphItems(nextParagraph)
      if (!nextItems) break

      run.push(nextParagraph)
      items.push(...nextItems)
      processed.add(nextParagraph)
      cursor = nextParagraph.nextElementSibling
    }

    if (items.length < 2) continue

    const table = createWechatImageGridTable(paragraph.ownerDocument, items)
    paragraph.parentNode?.insertBefore(table, paragraph)

    for (const item of run) {
      if (item.isConnected) item.remove()
    }
  }
}

function replaceElementWithInlineSpan(element: HTMLElement) {
  const span = element.ownerDocument.createElement('span')
  span.innerHTML = element.innerHTML

  const style = element.getAttribute('style')
  if (style) span.setAttribute('style', style)

  element.replaceWith(span)
}

function getWechatTableColumnCount(table: HTMLTableElement) {
  let maxColumns = 0

  const rows = Array.from(table.children).flatMap((child) => {
    const tagName = child.tagName.toLowerCase()
    if (tagName === 'tr') return [child]
    if (tagName === 'thead' || tagName === 'tbody' || tagName === 'tfoot') {
      return Array.from(child.children).filter(
        (row) => row.tagName.toLowerCase() === 'tr',
      )
    }
    return []
  })

  for (const row of rows) {
    const cells = Array.from(row.children).filter((cell) => {
      const tagName = cell.tagName.toLowerCase()
      return tagName === 'th' || tagName === 'td'
    })
    const columns = cells.reduce((total, cell) => {
      const colSpan = Number.parseInt(cell.getAttribute('colspan') || '', 10)
      return total + Math.max(1, Number.isFinite(colSpan) ? colSpan : 1)
    }, 0)
    maxColumns = Math.max(maxColumns, columns)
  }

  return maxColumns
}

function ensureWechatTableScrollContainer(table: HTMLTableElement) {
  if (table.closest('[data-wechat-table-scroll="true"]')) return
  if (!table.parentNode) return

  const wrapper = table.ownerDocument.createElement('section')
  wrapper.className = 'wechat-table-scroll'
  wrapper.setAttribute('data-wechat-table-scroll', 'true')

  table.parentNode.insertBefore(wrapper, table)
  wrapper.appendChild(table)
}

function normalizeWechatTableMarkup(root: ParentNode) {
  for (const table of root.querySelectorAll<HTMLTableElement>(
    'table:not(.wechat-image-grid)',
  )) {
    if (table.closest('pre, code, .code-snippet__fix')) continue
    table.setAttribute('data-wechat-table', 'true')

    const columnCount = getWechatTableColumnCount(table)
    if (columnCount > 0) {
      table.setAttribute('data-wechat-table-columns', String(columnCount))
      table.classList.add(
        columnCount > 3 ? 'wechat-table-wide' : 'wechat-table-compact',
      )
    }

    for (const cell of table.querySelectorAll<HTMLTableCellElement>('th, td')) {
      const blockChildren = Array.from(cell.children).filter(
        (child): child is HTMLElement => {
          const tagName = child.tagName.toLowerCase()
          if (child.querySelector('ul, ol, blockquote, table, pre'))
            return false
          return tagName === 'p' || tagName === 'div'
        },
      )

      blockChildren.forEach((child, index) => {
        replaceElementWithInlineSpan(child)
        if (index < blockChildren.length - 1) {
          cell.insertBefore(
            cell.ownerDocument.createElement('br'),
            blockChildren[index + 1] ?? null,
          )
        }
      })
    }

    ensureWechatTableScrollContainer(table)
  }
}

function normalizeWechatListItemMarkup(root: ParentNode) {
  for (const item of root.querySelectorAll<HTMLLIElement>('li')) {
    if (item.closest('pre, code, .code-snippet__fix')) continue

    for (const child of Array.from(item.children)) {
      const tagName = child.tagName.toLowerCase()
      if (tagName !== 'p' && tagName !== 'div') continue
      if (child.querySelector('ul, ol, blockquote, table, pre')) continue
      replaceElementWithInlineSpan(child as HTMLElement)
    }
  }
}

function getWechatListKind(list: HTMLUListElement | HTMLOListElement) {
  const existing = list.getAttribute('data-wechat-list')
  if (existing) return existing

  if (isTaskList(list)) return 'task'
  return list.tagName.toLowerCase() === 'ol' ? 'ordered' : 'unordered'
}

function transferListItemAttributes(
  source: HTMLLIElement,
  target: HTMLElement,
) {
  for (const attribute of Array.from(source.attributes)) {
    if (!attribute.name.startsWith('data-')) continue
    target.setAttribute(attribute.name, attribute.value)
  }
}

function normalizeWechatListContainers(root: ParentNode) {
  const lists = Array.from(
    root.querySelectorAll<HTMLUListElement | HTMLOListElement>('ul, ol'),
  )
    .filter((list) => !list.closest('pre, code, .code-snippet__fix'))
    .sort((a, b) => getListDepth(b) - getListDepth(a))

  for (const list of lists) {
    if (!list.isConnected) continue

    const block = list.ownerDocument.createElement('section')
    block.className = 'wechat-list-block'
    block.setAttribute('data-wechat-list-block', 'true')
    block.setAttribute('data-wechat-list', getWechatListKind(list))

    const dataType = list.getAttribute('data-type')
    if (dataType) block.setAttribute('data-type', dataType)

    for (const item of getDirectListItems(list)) {
      const itemBlock = list.ownerDocument.createElement('section')
      itemBlock.className = 'wechat-list-item'
      itemBlock.setAttribute('data-wechat-list-item', 'true')
      transferListItemAttributes(item, itemBlock)

      while (item.firstChild) {
        itemBlock.appendChild(item.firstChild)
      }

      block.appendChild(itemBlock)
    }

    list.replaceWith(block)
  }
}

function isWechatEmptyParagraph(
  element: Element | null,
): element is HTMLParagraphElement {
  if (!element || element.tagName.toLowerCase() !== 'p') return false
  if (
    element.querySelector(
      'img, video, audio, iframe, svg, math, table, pre, code',
    )
  )
    return false

  const text = (element.textContent || '').replace(/\u00a0/g, ' ').trim()
  return (
    element.getAttribute('data-wechat-empty') === 'true' || text.length === 0
  )
}

function removeEmptyParagraphsAroundWechatLists(root: ParentNode) {
  const lists = Array.from(
    root.querySelectorAll<HTMLElement>('ul, ol, .wechat-list-block'),
  ).filter((list) => !list.closest('pre, code, .code-snippet__fix'))

  for (const list of lists) {
    let previous = list.previousElementSibling
    while (isWechatEmptyParagraph(previous)) {
      const current = previous
      previous = current.previousElementSibling
      current.remove()
    }

    let next = list.nextElementSibling
    while (isWechatEmptyParagraph(next)) {
      const current = next
      next = current.nextElementSibling
      current.remove()
    }
  }
}

function getMediaSource(element: Element) {
  if (element instanceof HTMLMediaElement) {
    return element.currentSrc || element.getAttribute('src') || ''
  }

  if (element instanceof HTMLIFrameElement) {
    return element.getAttribute('src') || ''
  }

  return (
    element.getAttribute('src') ||
    element.querySelector('iframe')?.getAttribute('src') ||
    element.querySelector('source')?.getAttribute('src') ||
    ''
  )
}

function createPdfMediaPlaceholder(
  doc: Document,
  options: {
    href: string
    kind: 'video' | 'embed'
    title?: string
  },
) {
  const figure = doc.createElement('figure')
  figure.className = 'pdf-media-placeholder'
  figure.setAttribute('data-pdf-media-kind', options.kind)

  const poster = doc.createElement('div')
  poster.className = 'pdf-media-placeholder__poster'

  const play = doc.createElement('span')
  play.className = 'pdf-media-placeholder__play'
  play.textContent = '▶'
  poster.appendChild(play)

  const caption = doc.createElement('figcaption')
  caption.className = 'pdf-media-placeholder__caption'

  const title = doc.createElement('strong')
  title.className = 'pdf-media-placeholder__title'
  title.textContent =
    options.title?.trim() ||
    (options.kind === 'video' ? '视频内容' : '嵌入内容')
  caption.appendChild(title)

  const description = doc.createElement('p')
  description.className = 'pdf-media-placeholder__description'
  description.textContent =
    options.kind === 'video'
      ? 'PDF 中无法直接播放视频，请打开下方链接查看。'
      : 'PDF 中无法直接展示该嵌入内容，请打开下方链接查看。'
  caption.appendChild(description)

  if (options.href) {
    const link = doc.createElement('a')
    link.className = 'pdf-media-placeholder__link'
    link.href = options.href
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.textContent = options.href
    caption.appendChild(link)
  }

  figure.appendChild(poster)
  figure.appendChild(caption)
  return figure
}

function replaceUnsupportedPdfEmbeds(doc: Document) {
  for (const youtube of Array.from(
    doc.querySelectorAll<HTMLElement>('div[data-youtube-video]'),
  )) {
    const src = getMediaSource(youtube)
    youtube.replaceWith(
      createPdfMediaPlaceholder(doc, {
        href: src,
        kind: 'video',
        title: '嵌入视频',
      }),
    )
  }

  for (const video of Array.from(
    doc.querySelectorAll<HTMLVideoElement>('video'),
  )) {
    const src = getMediaSource(video)
    const title = video.getAttribute('title') || undefined
    video.replaceWith(
      createPdfMediaPlaceholder(doc, {
        href: src,
        kind: 'video',
        title,
      }),
    )
  }

  for (const iframe of Array.from(
    doc.querySelectorAll<HTMLIFrameElement>('iframe'),
  )) {
    const src = getMediaSource(iframe)
    iframe.replaceWith(
      createPdfMediaPlaceholder(doc, {
        href: src,
        kind: 'embed',
        title: iframe.getAttribute('title') || '嵌入内容',
      }),
    )
  }
}

function normalizeExportMarkup(html: string, mode: ExportMode = 'clipboard') {
  const parser = new DOMParser()
  const doc = parser.parseFromString(
    normalizeWechatExportHtml(html),
    'text/html',
  )
  absolutizeUrls(doc, window.location.origin)
  normalizeMediaAttributes(doc)
  normalizeWechatPublishingBlocks(doc)
  normalizeWechatInlineMarkup(doc)
  normalizeVisualDiagramMarkup(doc)
  normalizeCodeBlockMarkup(doc)
  normalizeWechatImageGridMarkup(doc)
  normalizeWechatImageFigures(doc)
  normalizeWechatListMarkup(doc)
  normalizeWechatTableMarkup(doc)
  normalizeWechatListItemMarkup(doc)
  normalizeWechatListContainers(doc)
  removeEmptyParagraphsAroundWechatLists(doc)
  if (mode === 'bridge') {
    normalizeWechatVideoPlaceholders(doc)
  }
  stripThemeConflictingInlineStyles(doc)
  renderRubyAnnotations(doc)
  renderMathElements(doc)
  normalizeWechatExternalLinkFootnotes(doc, window.location.origin)

  if (mode === 'pdf') {
    replaceUnsupportedPdfEmbeds(doc)
  }

  return doc.body.innerHTML
}

function buildWechatExportFragment(html: string) {
  return `
    <section class="wechat-export-root">
      <article class="wechat-export-article">
        <div class="wechat-export-content">${html}</div>
      </article>
    </section>
  `
}

function parseCssColor(value: string) {
  const color = value.trim()
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color)
  if (hex) {
    const raw = hex[1]
    const full =
      raw.length === 3
        ? raw
            .split('')
            .map((char) => `${char}${char}`)
            .join('')
        : raw
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
    }
  }

  const rgb = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(color)
  if (!rgb) return null

  return {
    r: Number.parseInt(rgb[1], 10),
    g: Number.parseInt(rgb[2], 10),
    b: Number.parseInt(rgb[3], 10),
  }
}

function readBorderLeftColor(element: HTMLElement) {
  return (
    element.style.getPropertyValue('border-left-color') ||
    element.style.borderLeftColor ||
    element.style.borderColor ||
    ''
  )
}

function getQuoteDepth(element: HTMLElement) {
  let depth = 0
  let parent = element.parentElement?.closest('blockquote')
  while (parent) {
    depth += 1
    parent = parent.parentElement?.closest('blockquote') || null
  }
  return depth
}

function normalizeInlinedQuoteStyles(root: ParentNode) {
  for (const quote of Array.from(
    root.querySelectorAll<HTMLElement>('blockquote'),
  )) {
    quote.style.borderTopLeftRadius = '0'
    quote.style.borderBottomLeftRadius = '0'

    const parentQuote = quote.parentElement?.closest(
      'blockquote',
    ) as HTMLElement | null
    const sourceColor = parentQuote
      ? readBorderLeftColor(parentQuote)
      : readBorderLeftColor(quote)
    const rgb = parseCssColor(sourceColor)
    const depth = getQuoteDepth(quote)

    if (rgb && depth > 0) {
      const alpha = Math.max(0.34, 0.72 - depth * 0.18)
      quote.style.borderLeftColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(2)})`
    }
  }
}

function normalizeInlinedWechatHtml(html: string) {
  if (typeof DOMParser === 'undefined') return html

  const doc = new DOMParser().parseFromString(html, 'text/html')
  normalizeInlinedQuoteStyles(doc)
  return doc.body.innerHTML
}

function inlineWechatExportHtml(fragment: string, css: string) {
  const html = juice.inlineContent(fragment, css, {
    applyWidthAttributes: true,
    applyHeightAttributes: true,
    applyAttributesTableElements: true,
    inlinePseudoElements: true,
    preserveImportant: true,
    resolveCSSVariables: false,
    removeStyleTags: true,
  })

  return normalizeInlinedWechatHtml(html)
}

function buildWechatArticleHtml(
  title: string,
  html: string,
  mode: ExportMode,
  options: WechatArticleExportOptions = {},
) {
  const normalizedTitle = title.trim() || '无标题'
  const normalizedHtml = normalizeExportMarkup(html, mode)
  const css = buildWechatExportCss(readWechatExportStyleTokens(), options.theme)
  const fragment = buildWechatExportFragment(normalizedHtml)

  return {
    exportedHtml: inlineWechatExportHtml(fragment, css),
    normalizedTitle,
  }
}

function buildWechatClipboardHtml(
  title: string,
  html: string,
  options: WechatArticleExportOptions = {},
) {
  return buildWechatArticleHtml(title, html, 'clipboard', options)
}

function buildWechatPdfHtml(
  title: string,
  html: string,
  options: WechatArticleExportOptions = {},
) {
  return buildWechatArticleHtml(title, html, 'pdf', options)
}

function rewriteBridgeImageUrl(
  input: string,
  variant: WechatExportImageVariant,
) {
  return rewriteWechatExportImageUrl(input, window.location.origin, variant)
}

function rewriteBridgeArticleHtml(exportedHtml: string) {
  const doc = new DOMParser().parseFromString(exportedHtml, 'text/html')

  for (const image of doc.querySelectorAll<HTMLImageElement>('img')) {
    const src = image.getAttribute('src')
    if (!src) continue
    image.setAttribute('src', rewriteBridgeImageUrl(src, 'content'))
  }

  return doc.body.innerHTML
}

export function buildWechatPreviewArticleHtml(
  title: string,
  html: string,
  options: WechatArticleExportOptions = {},
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return html
  }

  return buildWechatClipboardHtml(title, html, options).exportedHtml
}

export function buildWechatBridgeArticleExport(
  title: string,
  html: string,
  options: WechatArticleExportOptions = {},
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('当前环境不支持公众号发布导出')
  }

  const { exportedHtml, normalizedTitle } = buildWechatArticleHtml(
    title,
    html,
    'bridge',
    options,
  )

  return {
    normalizedTitle,
    exportedHtml: rewriteBridgeArticleHtml(exportedHtml),
  }
}

export async function buildWechatBridgeArticleExportAsync(
  title: string,
  html: string,
  options: WechatArticleExportOptions = {},
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('当前环境不支持公众号发布导出')
  }

  const { exportedHtml, normalizedTitle } = buildWechatArticleHtml(
    title,
    html,
    'bridge',
    options,
  )
  const renderedHtml = await renderVisualDiagramsInHtml(exportedHtml)

  return {
    normalizedTitle,
    exportedHtml: rewriteBridgeArticleHtml(renderedHtml),
  }
}

export function buildWechatBridgeCoverImageUrl(input: string) {
  const normalized = input.trim()
  if (!normalized) return ''

  if (typeof window === 'undefined') {
    throw new Error('当前环境不支持封面图处理')
  }

  return rewriteBridgeImageUrl(normalized, 'cover')
}

export function extractFirstWechatBridgeCoverImageUrl(html: string) {
  if (typeof window === 'undefined') {
    throw new Error('当前环境不支持封面图处理')
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const src = doc.querySelector('img')?.getAttribute('src') || ''
  return src ? rewriteBridgeImageUrl(src, 'cover') : ''
}

function copyUsingExecCommand(html: string, plainText: string) {
  return new Promise<void>((resolve, reject) => {
    const textarea = document.createElement('textarea')
    textarea.value = plainText
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    textarea.style.top = '0'
    textarea.style.opacity = '0'

    const handleCopy = (event: ClipboardEvent) => {
      event.preventDefault()
      event.clipboardData?.setData('text/html', html)
      event.clipboardData?.setData('text/plain', plainText)
    }

    document.body.appendChild(textarea)
    document.addEventListener('copy', handleCopy)
    textarea.select()

    try {
      const ok = document.execCommand('copy')
      if (!ok) {
        throw new Error('execCommand failed')
      }
      resolve()
    } catch (error) {
      reject(error instanceof Error ? error : new Error('复制失败'))
    } finally {
      document.removeEventListener('copy', handleCopy)
      textarea.remove()
    }
  })
}

async function writeClipboardHtml(html: string, plainText: string) {
  if (window.isSecureContext && navigator.clipboard?.write) {
    try {
      if (typeof ClipboardItem === 'undefined') {
        throw new TypeError('ClipboardItem is not supported in this browser.')
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
        }),
      ])
      return
    } catch {
      // fall through to legacy copy
    }
  }

  await copyUsingExecCommand(html, plainText)
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('图片转换失败'))
    reader.readAsDataURL(blob)
  })
}

async function convertImageToBase64(image: HTMLImageElement) {
  const src = image.getAttribute('src')?.trim()
  if (!src || /^data:/i.test(src)) return

  try {
    const url = shouldRewriteUrl(src)
      ? new URL(src, window.location.origin).toString()
      : src
    const response = await fetch(url, { mode: 'cors', cache: 'force-cache' })
    if (!response.ok) return

    const blob = await response.blob()
    if (!blob.type.startsWith('image/')) return

    const dataUrl = await blobToDataUrl(blob)
    if (dataUrl) image.setAttribute('src', dataUrl)
  } catch {
    // Keep the original URL when CORS or network conversion fails.
  }
}

async function inlineWechatImagesAsBase64(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  await Promise.all(
    Array.from(doc.querySelectorAll<HTMLImageElement>('img')).map(
      convertImageToBase64,
    ),
  )
  return doc.body.innerHTML
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
        return
      }

      reject(new Error('生成公众号长图失败'))
    }, 'image/png')
  })
}

async function resolveClientExportTheme(options: WechatCopyOptions) {
  if (options.theme) return options.theme

  const config = await fetchWechatExportThemeConfig()
  const themeId = getPreferredWechatExportThemeId(config, options.themeId)
  return getWechatExportTheme(config, themeId)
}

export async function copyAsWechatArticleFormat(
  title: string,
  html: string,
  options: WechatCopyOptions = {},
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('当前环境不支持复制')
  }

  const theme = await resolveClientExportTheme(options)
  const { exportedHtml, normalizedTitle } =
    await buildWechatBridgeArticleExportAsync(title, html, {
      theme,
    })
  const clipboardHtml =
    options.inlineImagesAsBase64 === false
      ? exportedHtml
      : await inlineWechatImagesAsBase64(exportedHtml)
  const plainText =
    new DOMParser()
      .parseFromString(clipboardHtml, 'text/html')
      .body.textContent?.trim() || normalizedTitle

  await writeClipboardHtml(clipboardHtml, plainText)
}

export async function downloadArticleAsWechatPng(
  title: string,
  html: string,
  options: WechatArticleExportOptions = {},
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('当前环境不支持导出长图')
  }

  const { default: html2pdf } = await import('html2pdf.js')

  const { exportedHtml, normalizedTitle } = buildWechatClipboardHtml(
    title,
    html,
    options,
  )
  const renderedHtml = await renderVisualDiagramsInHtml(exportedHtml)
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-10000px'
  container.style.top = '0'
  container.style.width = '430px'
  container.style.maxWidth = '430px'
  container.style.background = '#ffffff'
  container.style.pointerEvents = 'none'
  container.innerHTML = renderedHtml
  document.body.appendChild(container)

  try {
    const pngOptions = {
      margin: 0,
      image: { type: 'png', quality: 1 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 430,
        scrollX: 0,
        scrollY: 0,
      },
    }
    const worker = html2pdf()
      .set(pngOptions as never)
      .from(container)
      .toCanvas() as unknown as {
      get: (key: 'canvas') => Promise<HTMLCanvasElement>
    }
    const canvas = await worker.get('canvas')
    const blob = await canvasToPngBlob(canvas)
    downloadBlob(blob, `${normalizedTitle}.png`)
  } finally {
    container.remove()
  }
}

export async function downloadArticleAsPdf(
  title: string,
  html: string,
  options: WechatArticleExportOptions = {},
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('当前环境不支持导出 PDF')
  }

  const { default: html2pdf } = await import('html2pdf.js')

  const { exportedHtml, normalizedTitle } = buildWechatPdfHtml(
    title,
    html,
    options,
  )
  const renderedHtml = await renderVisualDiagramsInHtml(exportedHtml)
  const pdfOptions = {
    margin: [16, 12, 16, 12],
    filename: `${normalizedTitle}.pdf`,
    image: { type: 'jpeg', quality: 0.96 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: 760,
      scrollX: 0,
      scrollY: 0,
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    },
    pagebreak: {
      mode: ['css', 'legacy'],
      avoid: [
        'img',
        'pre',
        'blockquote',
        'table',
        'figure',
        'p',
        'li',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        '.wechat-callout',
        '.wechat-profile-card',
        '.wechat-qrcode-card',
        '.wechat-info-grid',
        '.wechat-image-slider',
        '.pdf-media-placeholder',
      ],
    },
  }

  // html2pdf.js runtime supports `pagebreak`, but its bundled d.ts omits it.
  const worker = html2pdf().set(pdfOptions as never) as {
    from: (source: string, type: string) => { save: () => Promise<void> }
  }

  await worker.from(renderedHtml, 'string').save()
}
