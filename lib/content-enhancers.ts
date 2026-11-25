import {
  getCodeLanguage,
  highlightCodeElement,
  isInfographicLanguage,
  isMermaidLanguage,
  isPlantUmlLanguage,
} from './code-highlight'
import { renderMathElements } from './math-render'
import { renderMathElementsAsSvg } from './math-svg-render'
import { buildPlantUmlSvgUrl } from './plantuml'
import { renderRubyAnnotations } from './ruby-render'

type DomRoot = Document | Element

let mermaidPromise: Promise<typeof import('mermaid')['default']> | null = null
const plantUmlSvgCache = new Map<string, string>()
const infographicSvgCache = new Map<string, string>()
let infographicRenderQueue = Promise.resolve()

export function getWechatMermaidConfig() {
  return {
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'default',
    htmlLabels: false,
    themeVariables: {
      background: '#ffffff',
      mainBkg: '#ffffff',
      primaryColor: '#ffffff',
      primaryTextColor: '#333333',
      primaryBorderColor: '#666666',
      secondaryColor: '#f7f7f7',
      tertiaryColor: '#ffffff',
      lineColor: '#333333',
      nodeBorder: '#666666',
      clusterBkg: '#f7f7f7',
      clusterBorder: '#dddddd',
      edgeLabelBackground: '#ffffff',
      textColor: '#333333',
    },
    flowchart: {
      htmlLabels: false,
    },
  } as const
}

function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((module) => {
      module.default.initialize(getWechatMermaidConfig())
      return module.default
    })
  }

  return mermaidPromise
}

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash).toString(36)
}

function createDiagramContainer(
  doc: Document,
  className: string,
  codeAttribute: string,
  code: string,
  label: string,
) {
  const container = doc.createElement('section')
  container.className = className
  container.setAttribute(codeAttribute, code)
  container.textContent = `正在渲染 ${label}...`
  return container
}

function createMermaidContainer(doc: Document, code: string) {
  return createDiagramContainer(
    doc,
    'mermaid-diagram',
    'data-mermaid-code',
    code,
    'Mermaid',
  )
}

function createPlantUmlContainer(doc: Document, code: string) {
  return createDiagramContainer(
    doc,
    'plantuml-diagram',
    'data-plantuml-code',
    code,
    'PlantUML',
  )
}

function createInfographicContainer(doc: Document, code: string) {
  return createDiagramContainer(
    doc,
    'infographic-diagram',
    'data-infographic-code',
    code,
    'Infographic',
  )
}

function getMermaidTargets(root: DomRoot) {
  const targets: HTMLElement[] = []

  for (const element of Array.from(
    root.querySelectorAll<HTMLElement>('[data-mermaid-code]'),
  )) {
    if (
      element.getAttribute('data-mermaid-rendered') === 'true' &&
      element.querySelector('svg')
    )
      continue
    targets.push(element)
  }

  for (const code of Array.from(
    root.querySelectorAll<HTMLElement>('pre > code'),
  )) {
    const language = getCodeLanguage(code)
    if (!isMermaidLanguage(language)) continue
    const pre = code.closest('pre')
    if (!pre || pre.closest('[data-mermaid-code]')) continue

    const container = createMermaidContainer(
      code.ownerDocument,
      code.textContent || '',
    )
    pre.replaceWith(container)
    targets.push(container)
  }

  return targets
}

function getPlantUmlTargets(root: DomRoot) {
  const targets: HTMLElement[] = []

  for (const element of Array.from(
    root.querySelectorAll<HTMLElement>('[data-plantuml-code]'),
  )) {
    if (
      element.getAttribute('data-plantuml-rendered') === 'true' &&
      element.querySelector('svg, img')
    )
      continue
    targets.push(element)
  }

  for (const code of Array.from(
    root.querySelectorAll<HTMLElement>('pre > code'),
  )) {
    const language = getCodeLanguage(code)
    if (!isPlantUmlLanguage(language)) continue
    const pre = code.closest('pre')
    if (!pre || pre.closest('[data-plantuml-code]')) continue

    const container = createPlantUmlContainer(
      code.ownerDocument,
      code.textContent || '',
    )
    pre.replaceWith(container)
    targets.push(container)
  }

  return targets
}

function getInfographicTargets(root: DomRoot) {
  const targets: HTMLElement[] = []

  for (const element of Array.from(
    root.querySelectorAll<HTMLElement>('[data-infographic-code]'),
  )) {
    if (
      element.getAttribute('data-infographic-rendered') === 'true' &&
      element.querySelector('svg')
    )
      continue
    targets.push(element)
  }

  for (const code of Array.from(
    root.querySelectorAll<HTMLElement>('pre > code'),
  )) {
    const language = getCodeLanguage(code)
    if (!isInfographicLanguage(language)) continue
    const pre = code.closest('pre')
    if (!pre || pre.closest('[data-infographic-code]')) continue

    const container = createInfographicContainer(
      code.ownerDocument,
      code.textContent || '',
    )
    pre.replaceWith(container)
    targets.push(container)
  }

  return targets
}

export function highlightArticleCodeBlocks(root: DomRoot) {
  for (const code of Array.from(
    root.querySelectorAll<HTMLElement>('pre > code'),
  )) {
    highlightCodeElement(code)
  }
}

export async function renderMermaidDiagrams(root: DomRoot) {
  if (typeof window === 'undefined') return

  const targets = getMermaidTargets(root)
  if (targets.length === 0) return

  const mermaid = await getMermaid()

  await Promise.all(
    targets.map(async (target) => {
      const code =
        target.getAttribute('data-mermaid-code') || target.textContent || ''
      const normalized = code.trim()
      if (!normalized) return

      try {
        const id = `mermaid-${hashString(normalized)}-${Math.random().toString(36).slice(2)}`
        const result = await mermaid.render(id, normalized)
        target.innerHTML = result.svg
        target.setAttribute('data-mermaid-rendered', 'true')
      } catch (error) {
        target.textContent =
          error instanceof Error
            ? `Mermaid 渲染失败：${error.message}`
            : 'Mermaid 渲染失败'
        target.setAttribute('data-mermaid-rendered', 'false')
      }
    }),
  )
}

function sanitizeSvgMarkup(svgText: string) {
  const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  const svg = parsed.querySelector('svg')
  if (!svg) return ''

  for (const element of Array.from(svg.querySelectorAll('*'))) {
    if (element.tagName.toLowerCase() === 'script') {
      element.remove()
      continue
    }

    for (const attribute of Array.from(element.attributes)) {
      if (/^on/i.test(attribute.name)) {
        element.removeAttribute(attribute.name)
      }
    }
  }

  svg.removeAttribute('width')
  svg.removeAttribute('height')
  svg.style.setProperty('max-width', '100%')
  svg.style.setProperty('height', 'auto')

  return new XMLSerializer().serializeToString(svg)
}

async function fetchPlantUmlSvg(url: string) {
  const response = await fetch(url, { mode: 'cors', cache: 'force-cache' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const svg = sanitizeSvgMarkup(await response.text())
  if (!svg) throw new Error('PlantUML SVG 解析失败')
  return svg
}

function createPlantUmlImageFallback(target: HTMLElement, url: string) {
  const image = target.ownerDocument.createElement('img')
  image.src = url
  image.alt = 'PlantUML Diagram'
  image.style.maxWidth = '100%'
  image.style.height = 'auto'
  target.replaceChildren(image)
}

export async function renderPlantUmlDiagrams(root: DomRoot) {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return

  const targets = getPlantUmlTargets(root)
  if (targets.length === 0) return

  await Promise.all(
    targets.map(async (target) => {
      const code =
        target.getAttribute('data-plantuml-code') || target.textContent || ''
      const normalized = code.trim()
      if (!normalized) return

      const cacheKey = hashString(normalized)
      const url = buildPlantUmlSvgUrl(normalized)
      target.setAttribute('data-plantuml-url', url)

      try {
        const cached = plantUmlSvgCache.get(cacheKey)
        const svg = cached || (await fetchPlantUmlSvg(url))
        plantUmlSvgCache.set(cacheKey, svg)
        target.innerHTML = svg
        target.setAttribute('data-plantuml-rendered', 'true')
      } catch {
        createPlantUmlImageFallback(target, url)
        target.setAttribute('data-plantuml-rendered', 'fallback')
      }
    }),
  )
}

function getInfographicThemeMode() {
  if (typeof document === 'undefined') return 'default'
  return document.documentElement.classList.contains('dark')
    ? 'dark'
    : 'default'
}

async function renderInfographicSvg(code: string) {
  const cacheKey = `${getInfographicThemeMode()}:${hashString(code)}`
  const cached = infographicSvgCache.get(cacheKey)
  if (cached) return cached

  const { Infographic, exportToSVG, setDefaultFont, setFontExtendFactor } =
    await import('@antv/infographic')

  setFontExtendFactor(1.1)
  setDefaultFont(
    '-apple-system-font, system-ui, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif',
  )

  const host = document.createElement('div')
  host.id = `infographic-render-${cacheKey}-${Math.random().toString(36).slice(2)}`
  host.style.position = 'fixed'
  host.style.left = '0'
  host.style.top = '0'
  host.style.width = '720px'
  host.style.height = '480px'
  host.style.overflow = 'hidden'
  host.style.opacity = '0'
  host.style.pointerEvents = 'none'
  host.style.zIndex = '-1'
  document.body.appendChild(host)

  let instance: InstanceType<typeof Infographic> | null = null

  try {
    instance = new Infographic({
      container: host,
      svg: {
        style: {
          width: '100%',
          height: '100%',
          background: 'transparent',
        },
        background: false,
      },
      theme: getInfographicThemeMode(),
    })
    const activeInstance = instance

    const svgMarkup = await new Promise<string>((resolve, reject) => {
      let settled = false
      let finishing = false
      let pollTimer: number | null = null

      const clearTimers = () => {
        if (pollTimer !== null) window.clearTimeout(pollTimer)
        window.clearTimeout(timeout)
      }

      const fail = (error: unknown) => {
        if (settled) return
        settled = true
        clearTimers()
        reject(error)
      }

      const timeout = window.setTimeout(() => {
        fail(new Error('Infographic 渲染超时'))
      }, 20000)

      const finish = (source?: SVGSVGElement | null) => {
        if (settled || finishing) return
        const svgSource = source || host.querySelector<SVGSVGElement>('svg')
        if (!svgSource) return

        finishing = true
        if (pollTimer !== null) window.clearTimeout(pollTimer)

        void exportToSVG(svgSource, { removeIds: true })
          .then((svg) => {
            if (settled) return
            settled = true
            clearTimers()
            svg.style.setProperty('max-width', '100%')
            svg.style.setProperty('height', 'auto')
            resolve(new XMLSerializer().serializeToString(svg))
          })
          .catch(fail)
      }

      const pollForSvg = () => {
        if (settled) return
        finish()
        if (!settled) {
          pollTimer = window.setTimeout(pollForSvg, 120)
        }
      }

      activeInstance.on('loaded', ({ node }: { node?: SVGSVGElement }) => {
        finish(node)
      })

      const renderResult = activeInstance.render(code) as unknown
      if (
        renderResult &&
        typeof (renderResult as PromiseLike<void>).then === 'function'
      ) {
        void (renderResult as PromiseLike<void>).then(() => finish(), fail)
      }
      pollForSvg()
    })

    infographicSvgCache.set(cacheKey, svgMarkup)
    return svgMarkup
  } finally {
    instance?.destroy()
    host.remove()
  }
}

function enqueueInfographicRender(code: string) {
  const task = infographicRenderQueue.then(() => renderInfographicSvg(code))
  infographicRenderQueue = task.then(
    () => undefined,
    () => undefined,
  )
  return task
}

export async function renderInfographicDiagrams(root: DomRoot) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const targets = getInfographicTargets(root)
  if (targets.length === 0) return

  for (const target of targets) {
    const code =
      target.getAttribute('data-infographic-code') || target.textContent || ''
    const normalized = code.trim()
    if (!normalized) continue

    try {
      const svg = await enqueueInfographicRender(normalized)
      target.innerHTML = svg
      target.setAttribute('data-infographic-rendered', 'true')
    } catch (error) {
      target.textContent =
        error instanceof Error
          ? `Infographic 渲染失败：${error.message}`
          : 'Infographic 渲染失败'
      target.setAttribute('data-infographic-rendered', 'false')
    }
  }
}

export async function renderVisualDiagrams(root: DomRoot) {
  await renderMermaidDiagrams(root)
  await renderPlantUmlDiagrams(root)
  await renderInfographicDiagrams(root)
}

export async function enhanceArticleContent(root: DomRoot) {
  renderRubyAnnotations(root)
  renderMathElements(root)
  highlightArticleCodeBlocks(root)
  await renderVisualDiagrams(root)
}

const SVG_INLINE_STYLE_PROPERTIES = [
  'color',
  'fill',
  'fill-opacity',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'opacity',
  'stroke',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-opacity',
  'stroke-width',
  'text-anchor',
] as const

function normalizeCssValue(value: string) {
  return value.trim()
}

function shouldInlineSvgValue(property: string, value: string) {
  const normalized = normalizeCssValue(value)
  if ((property === 'fill' || property === 'stroke') && normalized === 'none')
    return true

  return (
    normalized &&
    normalized !== 'auto' &&
    normalized !== 'normal' &&
    normalized !== 'none' &&
    normalized !== '0px' &&
    normalized !== 'rgba(0, 0, 0, 0)'
  )
}

function copyComputedSvgStyles(source: Element, target: Element) {
  const computed = window.getComputedStyle(source)

  for (const property of SVG_INLINE_STYLE_PROPERTIES) {
    const value = normalizeCssValue(computed.getPropertyValue(property))
    if (!shouldInlineSvgValue(property, value)) continue

    target.setAttribute(property, value)
    const targetStyle = (target as HTMLElement | SVGElement).style
    targetStyle.setProperty(property, value)
  }
}

function walkSvgPair(source: Element, target: Element) {
  copyComputedSvgStyles(source, target)

  const sourceChildren = Array.from(source.children)
  const targetChildren = Array.from(target.children)

  for (let index = 0; index < sourceChildren.length; index += 1) {
    const sourceChild = sourceChildren[index]
    const targetChild = targetChildren[index]
    if (!targetChild) continue
    walkSvgPair(sourceChild, targetChild)
  }
}

function inlineSvgComputedStyles(svg: SVGSVGElement) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const clone = svg.cloneNode(true) as SVGSVGElement
  const wrapper = document.createElement('div')
  wrapper.setAttribute('aria-hidden', 'true')
  wrapper.style.position = 'fixed'
  wrapper.style.left = '-10000px'
  wrapper.style.top = '0'
  wrapper.style.width = '0'
  wrapper.style.height = '0'
  wrapper.style.overflow = 'hidden'
  wrapper.appendChild(clone)
  document.body.appendChild(wrapper)

  try {
    walkSvgPair(clone, svg)
  } finally {
    wrapper.remove()
  }
}

function normalizeWechatDiagramSvg(root: DomRoot) {
  for (const svg of root.querySelectorAll<SVGSVGElement>(
    '.mermaid-diagram svg, .plantuml-diagram svg, .infographic-diagram svg',
  )) {
    inlineSvgComputedStyles(svg)

    for (const style of svg.querySelectorAll('style')) {
      style.remove()
    }

    svg.removeAttribute('aria-roledescription')
    svg.style.setProperty('max-width', '100%')
    svg.style.setProperty('height', 'auto')
  }

  for (const element of root.querySelectorAll<SVGElement>(
    '.mermaid-diagram text, .mermaid-diagram tspan, .plantuml-diagram text, .plantuml-diagram tspan, .infographic-diagram text, .infographic-diagram tspan',
  )) {
    element.setAttribute('fill', '#333333')
    element.setAttribute('stroke', 'none')
    element.style.setProperty('fill', '#333333', 'important')
    element.style.setProperty('color', '#333333', 'important')
    element.style.setProperty('stroke', 'none', 'important')
  }
}

export async function renderVisualDiagramsInHtml(html: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined')
    return html

  const doc = new DOMParser().parseFromString(html, 'text/html')
  await renderMathElementsAsSvg(doc)
  await renderVisualDiagrams(doc)
  normalizeWechatDiagramSvg(doc)
  return doc.body.innerHTML
}

export async function renderMermaidDiagramsInHtml(html: string) {
  return renderVisualDiagramsInHtml(html)
}
