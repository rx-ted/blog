import { describe, expect, it } from 'vitest'
import juice from 'juice'
import katex from 'katex'
import {
  buildWechatExportCss,
  normalizeWechatExportHtml,
  type WechatExportStyleTokens,
} from '@/lib/wechat-export-style'
import { WECHAT_EXPORT_BUILTIN_THEMES } from '@/lib/wechat-themes'

const TOKENS: WechatExportStyleTokens = {
  background: '#f5f4ed',
  panelBackground: '#faf9f5',
  softBackground: '#e8e6dc',
  lineColor: '#f0eee6',
  inkColor: '#141413',
  mutedColor: '#5e5d59',
  accentColor: '#c96442',
  linkColor: '#c96442',
  codeBackground: '#faf9f5',
  codeBorderColor: '#e8e6dc',
  quoteBackground: '#faf9f5',
  articleHeadingColor: '#17120d',
  articleBodyColor: '#2b241c',
  articleQuoteColor: '#51473a',
  articleQuoteBorderColor: '#cdb796',
  articleQuoteNestedBorderColor: '#b8a68a',
  articleQuoteNestedBackground: 'rgba(0, 0, 0, 0.02)',
  bodyFontFamily: 'Georgia, serif',
  monoFontFamily: '"SF Mono", monospace',
  titleFontFamily: 'Georgia, serif',
}

describe('wechat export helpers', () => {
  it('preserves intentional empty paragraphs for wechat paste', () => {
    const html =
      '<p>第一段</p><p><br class="ProseMirror-trailingBreak"></p><p>第二段</p><p>   </p>'

    const normalized = normalizeWechatExportHtml(html)

    expect(normalized).toContain('<p data-wechat-empty="true">&nbsp;</p>')
    expect(normalized).toContain('<p>第一段</p>')
    expect(normalized).toContain('<p>第二段</p>')
  })

  it('builds md-like css for tables, code blocks, quotes, empty paragraphs, and image spacing', () => {
    const css = buildWechatExportCss(TOKENS)

    expect(css).toContain('.wechat-export-title')
    expect(css).toContain('.wechat-export-content table')
    expect(css).toContain('.wechat-export-article')
    expect(css).toContain('.wechat-export-content pre')
    expect(css).toContain('font-family: Georgia, serif;')
    expect(css).toContain(
      'background: linear-gradient(to right, transparent, #f0eee6, transparent);',
    )
    expect(css).toContain('height: 1px;')
    expect(css).toContain('opacity: 0.8;')
    expect(css).toContain('pre.code__pre > code')
    expect(css).toContain('.wechat-export-content code')
    expect(css).toContain('.wechat-export-content blockquote')
    expect(css).toContain('p[data-wechat-empty="true"]')
    expect(css).toContain('text-align: left;')
    expect(css).toContain('text-align: left !important;')
    expect(css).toContain('text-align-last: left !important;')
    expect(css).toContain('text-justify: none !important;')
    expect(css).toContain('word-spacing: normal !important;')
    expect(css).toContain('.wechat-export-content section')
    expect(css).toContain('word-break: break-all !important;')
    expect(css).toContain('.wechat-export-content img + p')
    expect(css).toContain('.wechat-export-content img + img')
    expect(css).toContain('table.wechat-image-grid')
    expect(css).toContain('data-wechat-table')
    expect(css).toContain('.wechat-export-content .wechat-table-scroll')
    expect(css).toContain('data-wechat-table-scroll')
    expect(css).toContain('table-layout: fixed')
    expect(css).toContain('table-layout: auto')
    expect(css).toContain('overflow: auto')
    expect(css).toContain('word-wrap: break-word')
    expect(css).toContain('data-wechat-table-columns="2"')
    expect(css).toContain('.wechat-export-content .wechat-list-marker')
    expect(css).toContain('.wechat-export-content .wechat-list-block')
    expect(css).toContain('.wechat-export-content .wechat-list-item')
    expect(css).toContain('.wechat-export-content .wechat-callout')
    expect(css).toContain('.wechat-export-content .wechat-callout-warning')
    expect(css).toContain('.wechat-export-content .wechat-profile-card')
    expect(css).toContain('.wechat-export-content .wechat-qrcode-card')
    expect(css).toContain('.wechat-export-content .wechat-badge-group')
    expect(css).toContain('.wechat-export-content .wechat-info-grid')
    expect(css).toContain('.wechat-export-content .wechat-image-slider-track')
    expect(css).toContain('.wechat-export-content .wechat-link-references')
    expect(css).toContain(
      '.wechat-export-content .wechat-inline-mark-highlight',
    )
    expect(css).toContain(
      '.wechat-export-content .wechat-inline-mark-underline',
    )
    expect(css).toContain('.wechat-export-content .wechat-inline-mark-wavy')
    expect(css).toContain('.wechat-list-block[data-wechat-list="task"]')
    expect(css).toContain('margin: 0.68em 0;')
    expect(css).toContain('padding-left: 0.92em;')
    expect(css).toContain('min-width: 0.72em;')
    expect(css).toContain('margin-left: -0.92em;')
    expect(css).toContain('font-size: 1.12em;')
    expect(css).toContain('list-style-type: none;')
    expect(css).toContain('list-style-type: none !important;')
    expect(css).toContain('vertical-align: baseline;')
    expect(css).toContain('.wechat-export-content ruby')
    expect(css).toContain('.wechat-export-content rt')
    expect(css).toContain('.wechat-export-content .math-svg-wrapper')
    expect(css).toContain(
      '.wechat-export-content .math-block-wrapper.math-svg-wrapper',
    )
    expect(css).toContain('.wechat-export-content .math-svg-wrapper svg')
    expect(css).toContain('.wechat-export-content pre.code__pre > .mac-sign')
    expect(css).toContain('.wechat-export-content .mac-sign svg')
    expect(css).not.toContain('.hljs-keyword')
    expect(css).not.toContain('.hljs-comment')
    expect(css).toContain('list-style: none;')
    expect(css).toContain('font-size: 17px;')
    expect(css).toContain('font-size: 82%;')
    expect(css).toContain('.wechat-export-content h1 { font-size: 1.72rem; }')
    expect(css).toContain('.wechat-export-content h2 { font-size: 1.46rem; }')
    expect(css).toContain('.wechat-export-content h3 { font-size: 1.24rem; }')
    expect(css).toContain('.wechat-export-content h4 { font-size: 1.12rem; }')
    expect(css).toContain('.wechat-export-content h5 { font-size: 1.04rem; }')
    expect(css).toContain('.wechat-export-content h6 { font-size: 0.98rem; }')
    expect(css).toContain('display: block;')
    expect(css).toContain('.pdf-media-placeholder')
    expect(css).toContain('break-inside: avoid-page;')
    expect(css).toContain('page-break-inside: avoid;')
    expect(css).toContain('color: #d14')
    expect(css).toContain('padding: 0 3px;')
    expect(css).toContain('padding: 0 !important;')
    expect(css).toContain('background: #242628;')
    expect(css).toContain('background: #242628 !important;')
    expect(css).toContain('font-size: 82% !important;')
    expect(css).toContain('.wechat-export-content .wechat-code-row')
    expect(css).toContain('.wechat-export-content .wechat-code-line-number')
    expect(css).toContain('.wechat-export-content .wechat-code-scroll')
    expect(css).not.toContain('.wechat-code-line-add')
    expect(css).not.toContain('.wechat-code-line-remove')
    expect(css).toContain('white-space: pre-wrap;')
    expect(css).toContain('overflow-wrap: anywhere;')
    expect(css).toContain('.wechat-export-content .plantuml-diagram')
    expect(css).toContain('.wechat-export-content .infographic-diagram')
    expect(css).toContain('.wechat-export-content .plantuml-diagram img')
    expect(css).toContain('white-space: nowrap;')
    expect(css).toContain('padding: 0 !important;')
    expect(css).toContain('padding: 8px 14px 14px !important;')
    expect(css).toContain('border-top-left-radius: 0 !important;')
    expect(css).toContain('border-bottom-left-radius: 0 !important;')
    expect(css).toContain('overflow: auto !important;')
    expect(css).toContain('table-layout: fixed !important;')
    expect(css).toContain('min-width: 6.5em !important;')
    expect(css).toContain('.wechat-export-content .katex .op-symbol.large-op')
    expect(css).toContain('.wechat-export-content .katex .op-limits > .vlist-t')
    expect(css).toContain(
      '.wechat-export-content .katex .sizing.reset-size6.size3',
    )
    expect(css).toContain('font-size: 0.7em;')
    expect(css).toContain('.wechat-export-content .katex .mfrac .frac-line')
    expect(css).toContain('border-bottom-style: solid;')
    expect(css).toContain('.wechat-export-content .katex .mathbb')
    expect(css).toContain('.wechat-export-content blockquote span')
    expect(css).not.toContain('word-break: keep-all')
    expect(css).not.toContain(TOKENS.background)
  })

  it('keeps 3px article padding, aligned headings, and simple wrapping code blocks', () => {
    const css = buildWechatExportCss(TOKENS)

    // qm-default 外层左右 padding 收缩到 3px
    expect(css).toMatch(/\.wechat-export-article \{[^}]*padding: 0 3px;/)

    // 文章标题、内容内 H1、H2 与正文共享同一左边界
    expect(css).toMatch(
      /\.wechat-export-title,\s*\.wechat-export-content h1,\s*\.wechat-export-content h2 \{[^}]*margin-left: 0;[^}]*margin-right: 0;[^}]*padding-left: 0;[^}]*padding-right: 0;[^}]*text-align: left;/,
    )

    // 代码块相对前后正文的上下外间距增大
    expect(css).toMatch(/\.wechat-export-content pre \{[^}]*margin: 1\.7em 0;/)

    // 沿用 doocs/md 的紧凑 SVG 圆点结构，不再叠加独立标题栏和底部分隔线
    expect(css).toMatch(
      /pre > \.mac-sign \{[^}]*padding: 10px 14px 0;[^}]*background: #242628;/,
    )
    expect(css).toMatch(/\.mac-sign svg \{[^}]*width: 45px;[^}]*height: 13px;/)
    expect(css).not.toMatch(/pre > \.mac-sign \{[^}]*border-bottom:/)

    // 每行把行号与代码放进同一个 flex row，长代码换行时行号仍与该逻辑行对齐
    expect(css).toMatch(/\.wechat-code-scroll \{[^}]*padding: 8px 14px 14px;/)
    expect(css).toMatch(
      /\.wechat-code-row \{[^}]*display: flex;[^}]*align-items: flex-start;/,
    )
    expect(css).toMatch(
      /\.wechat-code-line-number \{[^}]*flex: 0 0 2\.4em;[^}]*text-align: right;/,
    )
    expect(css).toMatch(
      /\.wechat-code-line \{[^}]*white-space: pre-wrap;[^}]*word-break: break-word;[^}]*overflow-wrap: anywhere;/,
    )
    expect(css).toContain('white-space: pre-wrap !important;')

    // 代码文字统一单色，不再有语法彩色、斜体注释或 diff 红绿强调
    expect(css).toMatch(/\.wechat-code-lines \{[^}]*color: #f8f8f2;/)
    expect(css).not.toMatch(
      /hljs-(keyword|selector-tag|literal|title|string|regexp|addition|number|attribute|variable|comment|quote)/,
    )
    expect(css).not.toContain('wechat-code-line-add')
    expect(css).not.toContain('wechat-code-line-remove')
  })

  it('inlines mobile-safe table wrapper and cell wrapping styles', () => {
    const html = juice.inlineContent(
      `<div class="wechat-export-content"><section class="wechat-table-scroll" data-wechat-table-scroll="true"><table class="wechat-table-compact" data-wechat-table="true" data-wechat-table-columns="2"><thead><tr><th>实验室</th><th>核心证据</th></tr></thead><tbody><tr><td>Google DeepMind</td><td>AlphaProof AlphaZero Docs Drive GRPO long-token-chain</td></tr></tbody></table></section></div>`,
      buildWechatExportCss(TOKENS),
      { removeStyleTags: true, preserveImportant: true },
    )

    expect(html).toContain('data-wechat-table-scroll="true"')
    expect(html).toContain('overflow: auto')
    expect(html).toContain('table-layout: fixed')
    expect(html).toContain('word-break: normal')
    expect(html).toContain('overflow-wrap: anywhere')
    expect(html).toContain('word-wrap: break-word')
  })

  it('inlines row-aligned line numbers and wrapping code styles', () => {
    const html = juice.inlineContent(
      `<div class="wechat-export-content"><pre><code><span class="wechat-code-body"><span class="wechat-code-scroll"><span class="wechat-code-lines"><span class="wechat-code-row"><span class="wechat-code-line-number" aria-hidden="true">9</span><span class="wechat-code-line">const a = someFunctionWithAVeryLongName()</span></span><span class="wechat-code-row"><span class="wechat-code-line-number" aria-hidden="true">10</span><span class="wechat-code-line">const b = 2</span></span></span></span></span></code></pre></div>`,
      buildWechatExportCss(TOKENS),
      { removeStyleTags: true, preserveImportant: true },
    )

    // 外层容器确实内联了 text-align-last: left，是行号居中被破坏的根因
    const rootMatch = html.match(
      /class="wechat-export-content"[^>]*style="([^"]*)"/,
    )
    expect(rootMatch).not.toBeNull()
    expect(rootMatch![1]).toContain('text-align-last: left')

    const rowStyles = [
      ...html.matchAll(/class="wechat-code-row"[^>]*style="([^"]*)"/g),
    ]
    expect(rowStyles).toHaveLength(2)
    expect(rowStyles[0][1]).toContain('display: flex')
    expect(rowStyles[0][1]).toContain('align-items: flex-start')

    const numberStyles = [
      ...html.matchAll(/class="wechat-code-line-number"[^>]*style="([^"]*)"/g),
    ]
    expect(numberStyles.length).toBe(2)
    for (const match of numberStyles) {
      expect(match[1]).toContain('display: block')
      expect(match[1]).toContain('width: 2.4em')
      expect(match[1]).toContain('text-align: right')
      expect(match[1]).toContain('text-align-last: right')
    }

    const codeStyles = [
      ...html.matchAll(/class="wechat-code-line"[^>]*style="([^"]*)"/g),
    ]
    expect(codeStyles).toHaveLength(2)
    for (const match of codeStyles) {
      expect(match[1]).toContain('white-space: pre-wrap')
      expect(match[1]).toContain('word-break: break-word')
      expect(match[1]).toContain('overflow-wrap: anywhere')
    }
  })

  it('inlines WeChat component styles for callouts, grids, sliders, and references', () => {
    const html = juice.inlineContent(
      `<div class="wechat-export-content"><section class="wechat-callout wechat-callout-warning"><p class="wechat-callout-title">注意</p><section class="wechat-callout-body"><p>风险点</p></section></section><section class="wechat-info-grid"><section class="wechat-info-card"><span class="wechat-info-label">场景</span><span class="wechat-info-value">公众号</span></section></section><section class="wechat-image-slider"><section class="wechat-image-slider-track"><section class="wechat-image-slider-item"><img src="https://example.com/a.png"></section></section><p class="wechat-image-slider-hint">左右滑动看更多</p></section><p>外链<sup class="wechat-link-ref">[1]</sup></p><section class="wechat-link-references"><p class="wechat-link-reference-item">[1] https://example.com</p></section></div>`,
      buildWechatExportCss(TOKENS),
      { removeStyleTags: true, preserveImportant: true },
    )

    expect(html).toContain('wechat-callout-warning')
    expect(html).toContain('border-left-width: 4px')
    expect(html).toContain('display: table')
    expect(html).toContain('overflow-x: auto')
    expect(html).toContain('width: 82%')
    expect(html).toContain('vertical-align: super')
    expect(html).toContain('word-break: break-all')
  })

  it('appends custom theme css before final wechat compatibility overrides', () => {
    const css = buildWechatExportCss(TOKENS, {
      css: '.wechat-export-title { color: #123456; }',
    })

    expect(css).toContain('.wechat-export-content table')
    expect(css).toContain('.wechat-export-title { color: #123456; }')
    expect(
      css.indexOf('.wechat-export-title { color: #123456; }'),
    ).toBeLessThan(css.indexOf('border-top-left-radius: 0 !important;'))
  })

  it('adds a restrained text-stroke heading boost for the default body and inlines it via juice', () => {
    const css = buildWechatExportCss(TOKENS)

    // 基础 700 之上叠加极轻描边，H1-H6 同规则保持层级一致；非重要级， Juice 可内联
    expect(css).toMatch(
      /\.wechat-export-content h1,\s*\.wechat-export-content h2,\s*\.wechat-export-content h3,\s*\.wechat-export-content h4,\s*\.wechat-export-content h5,\s*\.wechat-export-content h6 \{[^}]*-webkit-text-stroke: 0\.3px currentColor;[^}]*paint-order: stroke fill;/,
    )
    expect(css).not.toContain('font-weight: 800')
    expect(css).not.toContain('font-weight: 900')

    const html = juice.inlineContent(
      `<div class="wechat-export-content"><h2>小节标题</h2><h4>更小的标题</h4><p>正文段落</p></div>`,
      css,
      { removeStyleTags: true, preserveImportant: true },
    )

    // Juice 内联后描边落到每个标题元素上，正文不受影响
    const h2Match = html.match(/<h2[^>]*style="([^"]*)"/)
    const h4Match = html.match(/<h4[^>]*style="([^"]*)"/)
    const pMatch = html.match(/<p[^>]*style="([^"]*)"/)
    expect(h2Match).not.toBeNull()
    expect(h4Match).not.toBeNull()
    expect(h2Match![1]).toContain('-webkit-text-stroke: 0.3px currentColor')
    expect(h4Match![1]).toContain('-webkit-text-stroke: 0.3px currentColor')
    expect(pMatch).not.toBeNull()
    expect(pMatch![1]).not.toContain('text-stroke')
  })

  it('does not inject the default heading stroke when an explicit theme css is provided', () => {
    const themedCss = buildWechatExportCss(TOKENS, {
      css: '.wechat-export-content h2 { font-weight: 600; }',
    })

    // 显式主题（NVIDIA/Apple/Claude 等）自带标题处理，默认增重不得污染
    expect(themedCss).not.toContain('-webkit-text-stroke')
    expect(themedCss).not.toContain('paint-order: stroke fill')
    expect(themedCss).toContain(
      '.wechat-export-content h2 { font-weight: 600; }',
    )

    const html = juice.inlineContent(
      `<div class="wechat-export-content"><h2>主题标题</h2></div>`,
      themedCss,
      { removeStyleTags: true, preserveImportant: true },
    )
    expect(html).not.toContain('text-stroke')
  })

  it('keeps blueprint light code overrides, mac sign, and wrapping when qiaomu-clean-reading is selected', () => {
    const theme = WECHAT_EXPORT_BUILTIN_THEMES.find(
      (theme) => theme.id === 'qiaomu-clean-reading',
    )
    const css = buildWechatExportCss(TOKENS, theme)

    // 主题浅色代码覆盖写在 compat 层之前，靠更高特异性 + !important 生效
    const overrideIndex = css.indexOf('background: #f2f8fa !important;')
    const compatIndex = css.indexOf('background: #242628 !important;')
    expect(overrideIndex).toBeGreaterThan(-1)
    expect(compatIndex).toBeGreaterThan(overrideIndex)
    expect(css).toContain(
      '.wechat-export-root .wechat-export-article .wechat-export-content pre',
    )

    // mac 三色 SVG 尺寸与顶部紧凑间距不回退
    expect(css).toContain('.mac-sign svg')
    expect(css).toContain('width: 45px !important;')
    expect(css).toContain('padding: 10px 14px 0 !important;')

    // .wechat-code-row / .wechat-code-line 的 flex 与自动换行规则保留
    expect(css).toContain('display: flex !important;')
    expect(css).toContain('white-space: pre-wrap !important;')
    expect(css).toContain('overflow-wrap: anywhere !important;')

    // Juice 内联后浅色纸面确实压过 compat 深色（同 !important 比特异性）
    const html = juice.inlineContent(
      `<section class="wechat-export-root"><article class="wechat-export-article"><div class="wechat-export-content"><pre><span class="mac-sign"><svg></svg></span><code><span class="wechat-code-body"><span class="wechat-code-scroll"><span class="wechat-code-lines"><span class="wechat-code-row"><span class="wechat-code-line-number" aria-hidden="true">1</span><span class="wechat-code-line">const a = 1</span></span></span></span></span></code></pre></div></article></section>`,
      css,
      { removeStyleTags: true, preserveImportant: true },
    )

    const preStyle = html.match(/<pre[^>]*style="([^"]*)"/)?.[1] ?? ''
    expect(preStyle).toContain('background: #f2f8fa')
    expect(preStyle).not.toContain('#242628')
    expect(html.match(/class="mac-sign"[^>]*style="([^"]*)"/)?.[1]).toContain(
      'background: #e2edf1',
    )
    expect(html.match(/<code[^>]*style="([^"]*)"/)?.[1]).toContain(
      'color: #2a3b46',
    )
    expect(
      html.match(/class="wechat-code-line"[^>]*style="([^"]*)"/)?.[1],
    ).toContain('white-space: pre-wrap')

    // 图注 Juice 内联后 text-align 与 text-align-last 都保持居中（单行图注靠后者对齐）
    const captionHtml = juice.inlineContent(
      `<section class="wechat-export-root"><article class="wechat-export-article"><div class="wechat-export-content"><figure><figcaption>图注</figcaption></figure></div></article></section>`,
      css,
      { removeStyleTags: true, preserveImportant: true },
    )
    const captionStyle =
      captionHtml.match(/<figcaption[^>]*style="([^"]*)"/)?.[1] ?? ''
    expect(captionStyle).toContain('text-align: center')
    expect(captionStyle).toContain('text-align-last: center')
  })

  it('keeps wrapping code layout consistent across base and compat css', () => {
    const css = buildWechatExportCss(TOKENS)

    expect(css).toMatch(
      /\.wechat-code-scroll \{[^}]*overflow: hidden;[^}]*padding: 8px 14px 14px;/,
    )
    expect(css).toMatch(
      /\.wechat-code-lines \{[^}]*min-width: 0;[^}]*white-space: normal;/,
    )
    expect(css).toContain('padding: 8px 14px 14px !important;')
    expect(css).toContain('min-width: 0 !important;')
    expect(css).toContain('white-space: pre-wrap !important;')
    expect(css).not.toContain('.wechat-code-line-numbers')
    expect(css).not.toContain('min-width: max-content')
  })

  it('inlines KaTeX large-operator layout styles used by copied formulas', () => {
    const formulaHtml = katex.renderToString('\\chi = \\sum_{i=1}^{n} x_i', {
      displayMode: true,
      output: 'html',
      throwOnError: false,
    })
    const html = juice.inlineContent(
      `<div class="wechat-export-content">${formulaHtml}</div>`,
      buildWechatExportCss(TOKENS),
      { removeStyleTags: true },
    )

    expect(html).toContain(
      'class="mop op-symbol large-op" style="border-color: currentColor; position: relative; font-family: KaTeX_Size2',
    )
    expect(html).toContain(
      'class="sizing reset-size6 size3 mtight" style="border-color: currentColor; display: inline-block; font-size: 0.7em;',
    )
    expect(html).toContain(
      'class="vlist-t vlist-t2" style="border-color: currentColor; display: inline-table;',
    )
  })
})
