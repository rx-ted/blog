type MathJaxDocumentState = {
  adaptor: {
    outerHTML(node: unknown): string
  }
  html: {
    convert(latex: string, options: { display: boolean }): unknown
  }
}

let mathJaxDocumentPromise: Promise<MathJaxDocumentState> | null = null

function readSvgAttribute(tag: string, name: string) {
  const match = new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag)
  return match?.[1] || ''
}

function readStyleProperty(style: string, name: string) {
  const match = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, 'i').exec(
    style,
  )
  return match?.[1]?.trim() || ''
}

function normalizeMathSvgForWechat(svg: string) {
  return svg.replace(/<svg\b([^>]*)>/i, (tag) => {
    const style = readSvgAttribute(tag, 'style')
    const width =
      readStyleProperty(style, 'min-width') ||
      readSvgAttribute(tag, 'width') ||
      'auto'
    const withoutWidth = tag.replace(/\swidth="[^"]*"/i, '')
    const wechatStyle = [
      'display: initial',
      'max-width: 300vw !important',
      'height: auto',
      'color: #333333',
      'flex-shrink: 0',
      `width: ${width}`,
    ].join('; ')

    if (/\sstyle="/i.test(withoutWidth)) {
      return withoutWidth.replace(
        /\sstyle="([^"]*)"/i,
        (_styleAttr, existingStyle: string) =>
          ` style="${existingStyle.replace(/;?\s*$/, ';')} ${wechatStyle};"`,
      )
    }

    return withoutWidth.replace('<svg', `<svg style="${wechatStyle};"`)
  })
}

function extractSvg(markup: string) {
  const start = markup.indexOf('<svg')
  const end = markup.lastIndexOf('</svg>')
  if (start < 0 || end < start) return ''
  return markup.slice(start, end + '</svg>'.length)
}

async function getMathJaxDocument() {
  if (!mathJaxDocumentPromise) {
    mathJaxDocumentPromise = Promise.all([
      import('mathjax-full/js/mathjax.js'),
      import('mathjax-full/js/input/tex.js'),
      import('mathjax-full/js/output/svg.js'),
      import('mathjax-full/js/adaptors/liteAdaptor.js'),
      import('mathjax-full/js/handlers/html.js'),
      import('mathjax-full/js/input/tex/AllPackages.js'),
    ]).then(
      ([
        mathjaxModule,
        texModule,
        svgModule,
        adaptorModule,
        htmlModule,
        packagesModule,
      ]) => {
        const adaptor = adaptorModule.liteAdaptor()
        htmlModule.RegisterHTMLHandler(adaptor)
        const tex = new texModule.TeX({ packages: packagesModule.AllPackages })
        const svg = new svgModule.SVG({ fontCache: 'none' })
        const html = mathjaxModule.mathjax.document('', {
          InputJax: tex,
          OutputJax: svg,
        })

        return { adaptor, html }
      },
    )
  }

  return mathJaxDocumentPromise
}

export async function renderLatexToMathSvgMarkup(
  latex: string,
  displayMode: boolean,
) {
  const normalized = latex.trim()
  if (!normalized) return ''

  const { adaptor, html } = await getMathJaxDocument()
  const node = html.convert(normalized, { display: displayMode })
  const svg = extractSvg(adaptor.outerHTML(node))
  if (!svg) return ''

  return normalizeMathSvgForWechat(svg)
}

export async function renderMathElementsAsSvg(root: Document | Element) {
  const targets = Array.from(
    root.querySelectorAll<HTMLElement>('[data-math-latex]'),
  ).filter(
    (element) => element.getAttribute('data-math-svg-rendered') !== 'true',
  )

  await Promise.all(
    targets.map(async (element) => {
      let svg = ''
      let displayMode = true

      try {
        const latex = element.getAttribute('data-math-latex') || ''
        displayMode = element.getAttribute('data-display-mode') !== 'false'
        svg = await renderLatexToMathSvgMarkup(latex, displayMode)
      } catch {
        return
      }

      if (!svg) return

      element.innerHTML = svg
      element.classList.add('math-svg-wrapper')
      element.style.display = displayMode ? 'block' : 'inline'
      element.style.maxWidth = '100%'
      element.style.overflowX = 'auto'
      element.style.textAlign = displayMode ? 'center' : ''
      element.style.verticalAlign = displayMode ? '' : 'baseline'
      element.setAttribute('data-math-svg-rendered', 'true')
    }),
  )
}
