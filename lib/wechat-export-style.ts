export interface WechatExportStyleTokens {
  background: string
  panelBackground: string
  softBackground: string
  lineColor: string
  inkColor: string
  mutedColor: string
  accentColor: string
  linkColor: string
  codeBackground: string
  codeBorderColor: string
  quoteBackground: string
  articleHeadingColor: string
  articleBodyColor: string
  articleQuoteColor: string
  articleQuoteBorderColor: string
  articleQuoteNestedBorderColor: string
  articleQuoteNestedBackground: string
  bodyFontFamily: string
  monoFontFamily: string
  titleFontFamily: string
}

export interface WechatExportThemeCss {
  css?: string
}

function stripEditorOnlyBreaks(html: string) {
  return html.replace(
    /\s*<br\b[^>]*class="[^"]*ProseMirror-trailingBreak[^"]*"[^>]*>\s*/gi,
    '',
  )
}

export function normalizeWechatExportHtml(html: string) {
  return stripEditorOnlyBreaks(html)
    .replace(
      /<p(?:\s[^>]*)?>\s*(?:<br\b[^>]*>)?\s*<\/p>/gi,
      '<p data-wechat-empty="true">&nbsp;</p>',
    )
    .replace(
      /<p(?![^>]*data-wechat-empty="true")([^>]*)>\s*&nbsp;\s*<\/p>/gi,
      '<p$1 data-wechat-empty="true">&nbsp;</p>',
    )
}

const KATEX_FONT_SIZE_STEPS = [
  1, 1.2, 1.4, 1.6, 1.8, 2, 2.4, 2.88, 3.456, 4.148, 4.976,
] as const

function formatKatexEm(value: number) {
  return Number.parseFloat(value.toFixed(10)).toString()
}

function buildKatexSizingCss() {
  return KATEX_FONT_SIZE_STEPS.flatMap((resetSize, resetIndex) =>
    KATEX_FONT_SIZE_STEPS.map((size, sizeIndex) => {
      const reset = resetIndex + 1
      const target = sizeIndex + 1
      const fontSize = formatKatexEm(size / resetSize)

      return `.wechat-export-content .katex .sizing.reset-size${reset}.size${target},
.wechat-export-content .katex .fontsize-ensurer.reset-size${reset}.size${target} {
  font-size: ${fontSize}em;
}`
    }),
  ).join('\n\n')
}

export function buildWechatExportCss(
  tokens: WechatExportStyleTokens,
  theme?: WechatExportThemeCss | null,
) {
  const baseCss = `
.wechat-export-root {
  color: ${tokens.articleBodyColor};
  font-family: ${tokens.bodyFontFamily};
  background: transparent;
}

.wechat-export-article {
  color: ${tokens.articleBodyColor};
  font-family: ${tokens.bodyFontFamily};
  box-sizing: border-box;
  padding: 0 3px;
}

.wechat-export-title {
  margin: 0 0 1.45em;
  color: ${tokens.articleBodyColor};
  font-family: ${tokens.titleFontFamily};
  font-size: 18px;
  font-weight: 600;
  line-height: 1.55;
  letter-spacing: 0.02em;
}

.wechat-export-content {
  color: ${tokens.articleBodyColor};
  font-family: ${tokens.bodyFontFamily};
  font-size: 17px;
  line-height: 1.78;
  text-align: left;
  text-align-last: left;
  text-justify: none;
  word-spacing: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.wechat-export-content > :first-child {
  margin-top: 0;
}

.wechat-export-content > :last-child {
  margin-bottom: 0;
}

.wechat-export-content h1,
.wechat-export-content h2,
.wechat-export-content h3,
.wechat-export-content h4,
.wechat-export-content h5,
.wechat-export-content h6 {
  margin: 1.9em 0 0.8em;
  color: ${tokens.articleHeadingColor};
  font-family: ${tokens.titleFontFamily};
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: 0.015em;
}

.wechat-export-content h1 { font-size: 1.72rem; }
.wechat-export-content h2 { font-size: 1.46rem; }
.wechat-export-content h3 { font-size: 1.24rem; }
.wechat-export-content h4 { font-size: 1.12rem; }
.wechat-export-content h5 { font-size: 1.04rem; }
.wechat-export-content h6 { font-size: 0.98rem; }

.wechat-export-title,
.wechat-export-content h1,
.wechat-export-content h2 {
  margin-left: 0;
  margin-right: 0;
  padding-left: 0;
  padding-right: 0;
  text-align: left;
}

.wechat-export-title,
.wechat-export-content h1,
.wechat-export-content h2,
.wechat-export-content h3,
.wechat-export-content h4,
.wechat-export-content h5,
.wechat-export-content h6,
.wechat-export-content p,
.wechat-export-content ul,
.wechat-export-content ol,
.wechat-export-content li,
.wechat-export-content blockquote,
.wechat-export-content pre,
.wechat-export-content table,
.wechat-export-content .wechat-table-scroll,
.wechat-export-content figure,
.wechat-export-content .wechat-callout,
.wechat-export-content .wechat-profile-card,
.wechat-export-content .wechat-qrcode-card,
.wechat-export-content .wechat-badge-group,
.wechat-export-content .wechat-info-grid,
.wechat-export-content .wechat-image-slider,
.wechat-export-content .wechat-link-references,
.wechat-export-content .pdf-media-placeholder {
  break-inside: avoid-page;
  page-break-inside: avoid;
}

.wechat-export-content p {
  margin: 1.45em 0;
  color: inherit;
  letter-spacing: 0.03em;
  text-align: left;
  text-align-last: left;
  text-justify: none;
  word-spacing: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
  orphans: 3;
  widows: 3;
}

.wechat-export-content p[data-wechat-empty="true"] {
  margin: 0.8em 0;
  line-height: 1;
  font-size: 0.92em;
  letter-spacing: 0;
}

.wechat-export-content li p,
.wechat-export-content blockquote p,
.wechat-export-content td p,
.wechat-export-content th p {
  margin: 0.45em 0;
  letter-spacing: inherit;
}

.wechat-export-content a {
  color: #576b95;
  text-decoration: none;
  word-break: break-all;
  overflow-wrap: anywhere;
}

.wechat-export-content ruby {
  ruby-align: center;
}

.wechat-export-content rt {
  color: ${tokens.mutedColor};
  font-size: 0.58em;
  line-height: 1;
  letter-spacing: 0;
}

.wechat-export-content rp {
  font-size: 0;
  line-height: 0;
}

.wechat-export-content ul,
.wechat-export-content ol,
.wechat-export-content .wechat-list-block {
  display: block;
  margin: 0.68em 0;
  padding-left: 0.92em;
  color: inherit;
  list-style: none;
  list-style-type: none;
}

.wechat-export-content li,
.wechat-export-content .wechat-list-item {
  display: block;
  margin: 0.14em 0;
  color: inherit;
  list-style: none;
  list-style-type: none;
}

.wechat-export-content .wechat-list-marker {
  display: inline-block;
  min-width: 0.72em;
  margin-left: -0.92em;
  padding-right: 0.16em;
  color: inherit;
  font-size: 1.12em;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0;
  text-align: center;
  vertical-align: baseline;
}

.wechat-export-content blockquote {
  margin: 1.4em 0;
  padding: 0.2em 0 0.2em 1em;
  border-left: 3px solid ${tokens.articleQuoteBorderColor};
  border-radius: 0;
  background: transparent;
  color: ${tokens.articleQuoteColor};
  font-style: normal;
}

.wechat-export-content blockquote > :first-child {
  margin-top: 0;
}

.wechat-export-content blockquote > :last-child {
  margin-bottom: 0;
}

.wechat-export-content blockquote blockquote {
  margin: 0.8em 0 0;
  padding-left: 0.9em;
  border-left-color: ${tokens.articleQuoteBorderColor};
  background: transparent;
}

.wechat-export-content .wechat-callout {
  margin: 1.45em 0;
  padding: 0.9em 1em;
  border: 1px solid ${tokens.lineColor};
  border-left: 4px solid ${tokens.accentColor};
  border-radius: 10px;
  background: rgba(201, 100, 66, 0.08);
  color: ${tokens.articleQuoteColor};
}

.wechat-export-content .wechat-callout-title {
  margin: 0 0 0.45em;
  color: ${tokens.articleHeadingColor};
  font-size: 0.96em;
  font-weight: 700;
  line-height: 1.5;
  letter-spacing: 0.02em;
}

.wechat-export-content .wechat-callout-body {
  margin: 0;
  color: inherit;
}

.wechat-export-content .wechat-callout-body > :first-child {
  margin-top: 0;
}

.wechat-export-content .wechat-callout-body > :last-child {
  margin-bottom: 0;
}

.wechat-export-content .wechat-callout-info,
.wechat-export-content .wechat-callout-note {
  border-left-color: #576b95;
  background: rgba(87, 107, 149, 0.08);
}

.wechat-export-content .wechat-callout-tip,
.wechat-export-content .wechat-callout-success {
  border-left-color: #1f9d55;
  background: rgba(31, 157, 85, 0.08);
}

.wechat-export-content .wechat-callout-warning {
  border-left-color: #d28a00;
  background: rgba(210, 138, 0, 0.1);
}

.wechat-export-content .wechat-callout-danger {
  border-left-color: #d64545;
  background: rgba(214, 69, 69, 0.08);
}

.wechat-export-content .wechat-callout-conclusion {
  border-left-color: ${tokens.accentColor};
  background: ${tokens.quoteBackground};
}

.wechat-export-content .wechat-profile-card,
.wechat-export-content .wechat-qrcode-card {
  margin: 1.55em 0;
  padding: 1em;
  border: 1px solid ${tokens.lineColor};
  border-radius: 12px;
  background: ${tokens.panelBackground};
  color: ${tokens.articleBodyColor};
}

.wechat-export-content .wechat-profile-name,
.wechat-export-content .wechat-qrcode-title {
  margin: 0 0 0.5em;
  color: ${tokens.articleHeadingColor};
  font-size: 1em;
  font-weight: 700;
  line-height: 1.5;
}

.wechat-export-content .wechat-profile-body,
.wechat-export-content .wechat-qrcode-body {
  color: ${tokens.mutedColor};
  font-size: 0.92em;
  line-height: 1.72;
}

.wechat-export-content .wechat-profile-body > :first-child,
.wechat-export-content .wechat-qrcode-body > :first-child {
  margin-top: 0;
}

.wechat-export-content .wechat-profile-body > :last-child,
.wechat-export-content .wechat-qrcode-body > :last-child {
  margin-bottom: 0;
}

.wechat-export-content .wechat-badge-group {
  margin: 1.1em 0;
  line-height: 1.9;
}

.wechat-export-content .wechat-badge {
  display: inline-block;
  margin: 0 0.45em 0.55em 0;
  padding: 0.18em 0.7em;
  border: 1px solid ${tokens.lineColor};
  border-radius: 999px;
  background: ${tokens.panelBackground};
  color: ${tokens.accentColor};
  font-size: 0.82em;
  font-weight: 600;
  line-height: 1.55;
  letter-spacing: 0;
}

.wechat-export-content .wechat-info-grid {
  display: table;
  width: 100%;
  margin: 1.45em 0;
  border-collapse: separate;
  border-spacing: 0 8px;
}

.wechat-export-content .wechat-info-card {
  display: table-row;
}

.wechat-export-content .wechat-info-label,
.wechat-export-content .wechat-info-value {
  display: table-cell;
  padding: 0.72em 0.85em;
  border-top: 1px solid ${tokens.lineColor};
  border-bottom: 1px solid ${tokens.lineColor};
  background: ${tokens.panelBackground};
  vertical-align: top;
}

.wechat-export-content .wechat-info-label {
  width: 32%;
  border-left: 1px solid ${tokens.lineColor};
  border-radius: 10px 0 0 10px;
  color: ${tokens.articleHeadingColor};
  font-weight: 700;
}

.wechat-export-content .wechat-info-value {
  border-right: 1px solid ${tokens.lineColor};
  border-radius: 0 10px 10px 0;
  color: ${tokens.articleBodyColor};
}

.wechat-export-content table {
  width: 100%;
  max-width: 100%;
  margin: 1.4em 0;
  border-collapse: collapse;
  border-spacing: 0;
  color: inherit;
}

.wechat-export-content .wechat-table-scroll,
.wechat-export-content [data-wechat-table-scroll="true"] {
  display: block;
  width: 100%;
  max-width: 100%;
  margin: 1.4em 0;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
}

.wechat-export-content .wechat-table-scroll table,
.wechat-export-content [data-wechat-table-scroll="true"] table {
  margin: 0;
  max-width: none;
}

.wechat-export-content .wechat-table-scroll table.wechat-table-compact,
.wechat-export-content [data-wechat-table-scroll="true"] table.wechat-table-compact {
  width: 100%;
  table-layout: fixed;
}

.wechat-export-content .wechat-table-scroll table.wechat-table-wide,
.wechat-export-content [data-wechat-table-scroll="true"] table.wechat-table-wide {
  min-width: 100%;
  table-layout: auto;
}

.wechat-export-content table[data-wechat-table="true"] p,
.wechat-export-content table[data-wechat-table="true"] div {
  margin: 0;
}

.wechat-export-content table.wechat-image-grid {
  width: 100%;
  max-width: 100%;
  margin: 1.5em 0;
  border-collapse: collapse;
  border-spacing: 0;
  border: 0;
  background: transparent;
}

.wechat-export-content table.wechat-image-grid tr,
.wechat-export-content table.wechat-image-grid td {
  border: 0;
  background: transparent;
}

.wechat-export-content table.wechat-image-grid td {
  width: 50%;
  padding: 0 4px;
  vertical-align: top;
}

.wechat-export-content table.wechat-image-grid td:first-child {
  padding-left: 0;
}

.wechat-export-content table.wechat-image-grid td:last-child {
  padding-right: 0;
}

.wechat-export-content table.wechat-image-grid img {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  border-radius: 8px;
}

.wechat-export-content table th,
.wechat-export-content table td {
  padding: 0.25em 0.5em;
  border: 1px solid #dfdfdf;
  text-align: left;
  vertical-align: top;
  word-break: normal;
  overflow-wrap: anywhere;
  word-wrap: break-word;
}

.wechat-export-content table[data-wechat-table="true"].wechat-table-wide th,
.wechat-export-content table[data-wechat-table="true"].wechat-table-wide td {
  min-width: 6.5em;
}

.wechat-export-content table[data-wechat-table="true"][data-wechat-table-columns="2"] th:first-child,
.wechat-export-content table[data-wechat-table="true"][data-wechat-table-columns="2"] td:first-child {
  width: 32%;
}

.wechat-export-content table th {
  background: rgba(0, 0, 0, 0.05);
  color: inherit;
  font-weight: 600;
}

.wechat-export-content figure {
  margin: 1.5em 0;
}

.wechat-export-content .wechat-figure {
  margin: 1.55em 0;
}

.wechat-export-content .wechat-figure img {
  margin-bottom: 0;
}

.wechat-export-content figcaption {
  margin-top: 0.6em;
  color: #888888;
  font-size: 0.82em;
  text-align: center;
}

.wechat-export-content .wechat-figure-caption {
  color: ${tokens.mutedColor};
  font-size: 0.82em;
  line-height: 1.55;
  letter-spacing: 0.01em;
  text-align: center;
}

.wechat-export-content hr {
  border: 0;
  height: 1px;
  margin: 2em 0;
  background: linear-gradient(to right, transparent, ${tokens.lineColor}, transparent);
  opacity: 0.8;
}

.wechat-export-content code {
  font-size: 90%;
  color: #d14;
  background: rgba(27, 31, 35, 0.05);
  padding: 3px 5px;
  border: 0;
  border-radius: 4px;
  font-family: ${tokens.monoFontFamily};
  word-break: break-word;
}

.wechat-export-content pre.code__pre,
.wechat-export-content .hljs.code__pre,
.wechat-export-content pre {
  margin: 1.7em 0;
  font-size: 82%;
  overflow: hidden;
  padding: 0 !important;
  border: 1px solid #272727;
  border-radius: 8px;
  background: #242628;
  line-height: 1.5;
  box-shadow: none;
}

.wechat-export-content pre + pre,
.wechat-export-content pre + .code__pre,
.wechat-export-content .code__pre + pre,
.wechat-export-content .code__pre + .code__pre {
  margin-top: 1.25em;
}

.wechat-export-content pre.code__pre > .mac-sign,
.wechat-export-content .hljs.code__pre > .mac-sign,
.wechat-export-content pre > .mac-sign {
  display: block;
  padding: 10px 14px 0;
  background: #242628;
  font-size: 0;
  line-height: 1;
}

.wechat-export-content .mac-sign svg {
  display: inline-block;
  width: 45px;
  height: 13px;
  vertical-align: top;
}

.wechat-export-content pre.code__pre > code,
.wechat-export-content .hljs.code__pre > code,
.wechat-export-content pre > code {
  display: block;
  padding: 0;
  overflow: hidden;
  text-indent: 0;
  color: #f8f8f2;
  background: none;
  white-space: normal;
  margin: 0;
  font-family: ${tokens.monoFontFamily};
  font-size: inherit;
  line-height: 1.72;
}

.wechat-export-content .wechat-code-body {
  display: block;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.wechat-export-content .wechat-code-scroll {
  display: block;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  padding: 8px 14px 14px;
  box-sizing: border-box;
}

.wechat-export-content .wechat-code-lines {
  display: block;
  width: 100%;
  min-width: 0;
  color: #f8f8f2;
  white-space: normal;
  line-height: 1.72;
}

.wechat-export-content .wechat-code-row {
  display: flex;
  align-items: flex-start;
  width: 100%;
  max-width: 100%;
}

.wechat-export-content .wechat-code-line-number {
  display: block;
  flex: 0 0 2.4em;
  width: 2.4em;
  padding-right: 0.8em;
  color: #8f8f8f;
  font-size: 1em;
  line-height: 1.72;
  text-align: right;
  text-align-last: right;
  user-select: none;
  box-sizing: border-box;
}

.wechat-export-content .wechat-code-line {
  display: block;
  flex: 1 1 0;
  min-width: 0;
  min-height: 1.72em;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.wechat-export-content .pdf-media-placeholder {
  margin: 1.5em 0;
}

.wechat-export-content .mermaid-diagram,
.wechat-export-content .plantuml-diagram,
.wechat-export-content .infographic-diagram {
  display: block;
  margin: 1.5em 0;
  padding: 12px;
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  background: #ffffff;
  color: #333333;
  text-align: center;
  overflow-x: auto;
}

.wechat-export-content .mermaid-diagram svg,
.wechat-export-content .plantuml-diagram svg,
.wechat-export-content .plantuml-diagram img,
.wechat-export-content .infographic-diagram svg {
  display: inline-block;
  max-width: 100%;
  height: auto;
}

.wechat-export-content .math-inline-wrapper {
  display: inline;
  max-width: 100%;
  overflow-x: auto;
  vertical-align: baseline;
}

.wechat-export-content .math-block-wrapper,
.wechat-export-content .katex-display {
  display: block;
  max-width: 100%;
  margin: 1.2em 0;
  overflow-x: auto;
  text-align: center;
}

.wechat-export-content .math-svg-wrapper {
  max-width: 100%;
  overflow-x: auto;
  color: #333333;
}

.wechat-export-content .math-inline-wrapper.math-svg-wrapper {
  display: inline;
  vertical-align: baseline;
}

.wechat-export-content .math-block-wrapper.math-svg-wrapper {
  display: block;
  margin: 1.2em 0;
  text-align: center;
}

.wechat-export-content .math-svg-wrapper svg {
  display: inline-block;
  max-width: 100%;
  height: auto;
  vertical-align: -0.15em;
}

.wechat-export-content .math-block-wrapper.math-svg-wrapper svg {
  vertical-align: middle;
}

.wechat-export-content .katex {
  font: normal 1.12em "Times New Roman", serif;
  line-height: 1.2;
  position: relative;
  text-indent: 0;
  text-rendering: auto;
}

.wechat-export-content .katex * {
  border-color: currentColor;
}

.wechat-export-content .katex .katex-mathml {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
}

.wechat-export-content .katex .base,
.wechat-export-content .katex .strut {
  display: inline-block;
}

.wechat-export-content .katex .base {
  position: relative;
  white-space: nowrap;
  width: min-content;
}

.wechat-export-content .katex .textbf {
  font-weight: 700;
}

.wechat-export-content .katex .textit,
.wechat-export-content .katex .mathnormal {
  font-family: KaTeX_Math, "Times New Roman", serif;
  font-style: italic;
}

.wechat-export-content .katex .mathit {
  font-family: KaTeX_Main, "Times New Roman", serif;
  font-style: italic;
}

.wechat-export-content .katex .mathrm,
.wechat-export-content .katex .mainrm {
  font-style: normal;
}

.wechat-export-content .katex .mathbf {
  font-family: KaTeX_Main, "Times New Roman", serif;
  font-weight: 700;
}

.wechat-export-content .katex .boldsymbol {
  font-family: KaTeX_Math, "Times New Roman", serif;
  font-style: italic;
  font-weight: 700;
}

.wechat-export-content .katex .textrm {
  font-family: KaTeX_Main, "Times New Roman", serif;
}

.wechat-export-content .katex .textsf,
.wechat-export-content .katex .mathsf {
  font-family: KaTeX_SansSerif, Arial, sans-serif;
}

.wechat-export-content .katex .texttt,
.wechat-export-content .katex .mathtt {
  font-family: KaTeX_Typewriter, "SFMono-Regular", Consolas, monospace;
}

.wechat-export-content .katex .amsrm,
.wechat-export-content .katex .mathbb,
.wechat-export-content .katex .textbb {
  font-family: KaTeX_AMS, "Times New Roman", serif;
}

.wechat-export-content .katex .mathcal {
  font-family: KaTeX_Caligraphic, "Times New Roman", serif;
}

.wechat-export-content .katex .mathfrak,
.wechat-export-content .katex .textfrak {
  font-family: KaTeX_Fraktur, "Times New Roman", serif;
}

.wechat-export-content .katex .mathboldfrak,
.wechat-export-content .katex .textboldfrak {
  font-family: KaTeX_Fraktur, "Times New Roman", serif;
  font-weight: 700;
}

.wechat-export-content .katex .mathscr,
.wechat-export-content .katex .textscr {
  font-family: KaTeX_Script, "Times New Roman", serif;
}

.wechat-export-content .katex .mathboldsf,
.wechat-export-content .katex .textboldsf {
  font-family: KaTeX_SansSerif, Arial, sans-serif;
  font-weight: 700;
}

.wechat-export-content .katex .mathitsf,
.wechat-export-content .katex .mathsfit,
.wechat-export-content .katex .textitsf {
  font-family: KaTeX_SansSerif, Arial, sans-serif;
  font-style: italic;
}

.wechat-export-content .katex .vlist-t {
  display: inline-table;
  table-layout: fixed;
  border-collapse: collapse;
}

.wechat-export-content .katex .vlist-r {
  display: table-row;
}

.wechat-export-content .katex .vlist {
  display: table-cell;
  position: relative;
  vertical-align: bottom;
}

.wechat-export-content .katex .vlist > span {
  display: block;
  height: 0;
  position: relative;
}

.wechat-export-content .katex .vlist > span > span {
  display: inline-block;
}

.wechat-export-content .katex .vlist > span > .pstrut {
  overflow: hidden;
  width: 0;
}

.wechat-export-content .katex .vlist-t2 {
  margin-right: -2px;
}

.wechat-export-content .katex .vlist-s {
  display: table-cell;
  min-width: 2px;
  width: 2px;
  font-size: 1px;
  vertical-align: bottom;
}

.wechat-export-content .katex .vbox {
  display: inline-flex;
  flex-direction: column;
  align-items: baseline;
}

.wechat-export-content .katex .hbox,
.wechat-export-content .katex .thinbox {
  display: inline-flex;
  flex-direction: row;
}

.wechat-export-content .katex .hbox {
  width: 100%;
}

.wechat-export-content .katex .thinbox {
  max-width: 0;
  width: 0;
}

.wechat-export-content .katex .mspace,
.wechat-export-content .katex .mfrac .frac-line,
.wechat-export-content .katex .mtable .vertical-separator,
.wechat-export-content .katex .mtable .arraycolsep {
  display: inline-block;
}

.wechat-export-content .katex .mfrac .frac-line {
  min-height: 1px;
  width: 100%;
  border-bottom-style: solid;
}

.wechat-export-content .katex .msupsub {
  text-align: left;
}

.wechat-export-content .katex .mfrac > span > span,
.wechat-export-content .katex .mtable .col-align-c > .vlist-t,
.wechat-export-content .katex-display > .katex {
  text-align: center;
}

.wechat-export-content .katex .mtable .col-align-l > .vlist-t {
  text-align: left;
}

.wechat-export-content .katex .mtable .col-align-r > .vlist-t {
  text-align: right;
}

.wechat-export-content .katex-display > .katex {
  display: block;
  white-space: nowrap;
}

.wechat-export-content .katex-display > .katex > .katex-html {
  display: block;
  position: relative;
}

${buildKatexSizingCss()}

.wechat-export-content .katex .delimsizing.size1,
.wechat-export-content .katex .op-symbol.small-op {
  font-family: KaTeX_Size1, "Times New Roman", serif;
}

.wechat-export-content .katex .delimsizing.size2,
.wechat-export-content .katex .op-symbol.large-op {
  font-family: KaTeX_Size2, "Times New Roman", serif;
}

.wechat-export-content .katex .delimsizing.size3 {
  font-family: KaTeX_Size3, "Times New Roman", serif;
}

.wechat-export-content .katex .delimsizing.size4 {
  font-family: KaTeX_Size4, "Times New Roman", serif;
}

.wechat-export-content .katex .delimcenter,
.wechat-export-content .katex .op-symbol,
.wechat-export-content .katex .accent .accent-body {
  position: relative;
}

.wechat-export-content .katex .accent > .vlist-t,
.wechat-export-content .katex .op-limits > .vlist-t {
  text-align: center;
}

.wechat-export-content .pdf-media-placeholder__poster {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  border-radius: 14px;
  background: linear-gradient(180deg, #3a3a3a 0%, #232323 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.wechat-export-content .pdf-media-placeholder__play {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
  font-size: 28px;
  line-height: 1;
}

.wechat-export-content .pdf-media-placeholder__caption {
  margin-top: 0.8em;
}

.wechat-export-content .pdf-media-placeholder__title {
  display: block;
  margin: 0;
  color: ${tokens.articleHeadingColor};
  font-size: 0.98em;
}

.wechat-export-content .pdf-media-placeholder__description {
  margin: 0.45em 0 0;
  color: ${tokens.articleQuoteColor};
  font-size: 0.92em;
  letter-spacing: 0;
}

.wechat-export-content .pdf-media-placeholder__link {
  display: block;
  margin-top: 0.55em;
  font-size: 0.88em;
  word-break: break-all;
}

.wechat-export-content img,
.wechat-export-content video {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0.1em auto 0.5em;
  border-radius: 4px;
}

.wechat-export-content .wechat-image-slider {
  display: block;
  width: 100%;
  max-width: 100%;
  margin: 1.55em 0;
  overflow: hidden;
}

.wechat-export-content .wechat-image-slider-title {
  margin: 0 0 0.65em;
  color: ${tokens.articleHeadingColor};
  font-weight: 700;
}

.wechat-export-content .wechat-image-slider-track {
  display: block;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
}

.wechat-export-content .wechat-image-slider-item {
  display: inline-block;
  width: 82%;
  max-width: 82%;
  margin-right: 10px;
  vertical-align: top;
  white-space: normal;
}

.wechat-export-content .wechat-image-slider-item img {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
}

.wechat-export-content .wechat-image-slider-hint {
  margin: 0.55em 0 0;
  color: ${tokens.mutedColor};
  font-size: 0.8em;
  line-height: 1.4;
  letter-spacing: 0.02em;
  text-align: center;
}

.wechat-export-content .wechat-link-ref {
  margin-left: 0.12em;
  color: #576b95;
  font-size: 0.72em;
  line-height: 1;
  vertical-align: super;
}

.wechat-export-content .wechat-link-references {
  margin: 2em 0 0;
  padding-top: 0;
  border-top: 0;
  color: ${tokens.mutedColor};
  font-size: 0.9em;
  line-height: 1.65;
}

.wechat-export-content .wechat-link-references-title {
  margin: 0 0 0.55em;
  color: ${tokens.articleHeadingColor};
  font-weight: 700;
}

.wechat-export-content .wechat-link-reference-item {
  margin: 0.38em 0;
  letter-spacing: 0;
  word-break: break-all;
  overflow-wrap: anywhere;
}

.wechat-export-content .wechat-link-reference-number {
  display: inline-block;
  min-width: 2.2em;
  color: #576b95;
}

.wechat-export-content .wechat-link-reference-text {
  color: inherit;
  text-decoration: none;
  word-break: break-all;
  overflow-wrap: anywhere;
}

.wechat-export-content .wechat-inline-mark-highlight {
  padding: 0 0.18em;
  border-radius: 3px;
  background: rgba(255, 225, 100, 0.38);
  color: inherit;
}

.wechat-export-content .wechat-inline-mark-underline {
  padding-bottom: 0.04em;
  border-bottom: 2px solid ${tokens.accentColor};
  color: inherit;
}

.wechat-export-content .wechat-inline-mark-wavy {
  padding-bottom: 0.04em;
  text-decoration: underline wavy ${tokens.accentColor};
  text-underline-offset: 0.16em;
}

.wechat-export-content img + img,
.wechat-export-content img + video,
.wechat-export-content video + img,
.wechat-export-content video + video {
  margin-top: 12px;
}

.wechat-export-content img + p,
.wechat-export-content img + ul,
.wechat-export-content img + ol,
.wechat-export-content img + blockquote,
.wechat-export-content img + pre,
.wechat-export-content img + table,
.wechat-export-content img + .wechat-table-scroll,
.wechat-export-content video + p,
.wechat-export-content video + ul,
.wechat-export-content video + ol,
.wechat-export-content video + blockquote,
.wechat-export-content video + pre,
.wechat-export-content video + table,
.wechat-export-content video + .wechat-table-scroll {
  margin-top: 1.7em;
}

.wechat-export-content audio {
  display: block;
  width: 100%;
  max-width: 100%;
  margin: 1em 0;
}

.wechat-export-content ul[data-type="taskList"],
.wechat-export-content .wechat-list-block[data-wechat-list="task"] {
  list-style: none;
  padding-left: 0;
}

.wechat-export-content ul[data-type="taskList"] li,
.wechat-export-content .wechat-list-block[data-wechat-list="task"] .wechat-list-item {
  margin: 0.28em 0;
}

.wechat-export-content ul[data-type="taskList"] li > div {
  display: inline;
}

.wechat-export-content ul[data-type="taskList"] .wechat-list-marker,
.wechat-export-content .wechat-list-block[data-wechat-list="task"] .wechat-list-marker {
  min-width: 1.6em;
  margin-left: 0;
  color: ${tokens.accentColor};
}
`.trim()

  const themeCss = theme?.css?.trim()

  // 仅默认正文（无 theme css）追加：H 标题在 font-weight: 700 基础上叠加极轻描边增重。
  // 中文 CJK 字体没有 800/900 真实字重，-webkit-text-stroke 在 iOS / 微信 WebKit 中
  // 稳定可见且克制；paint-order 让描边画在字形下层，避免笔画内缩。
  // 显式主题（NVIDIA/Apple/Claude 等）自带标题处理，不注入此规则。
  const defaultOnlyCss = themeCss
    ? ''
    : `
.wechat-export-content h1,
.wechat-export-content h2,
.wechat-export-content h3,
.wechat-export-content h4,
.wechat-export-content h5,
.wechat-export-content h6 {
  -webkit-text-stroke: 0.3px currentColor;
  paint-order: stroke fill;
}
`.trim()

  const compatCss = `
.wechat-export-content p,
.wechat-export-content li,
.wechat-export-content blockquote p,
.wechat-export-content td,
.wechat-export-content th,
.wechat-export-content figcaption {
  color: inherit;
}

.wechat-export-content,
.wechat-export-content p,
.wechat-export-content li,
.wechat-export-content section,
.wechat-export-content .wechat-list-block,
.wechat-export-content .wechat-list-item,
.wechat-export-content .wechat-callout,
.wechat-export-content .wechat-callout-body,
.wechat-export-content .wechat-profile-card,
.wechat-export-content .wechat-profile-body,
.wechat-export-content .wechat-qrcode-card,
.wechat-export-content .wechat-qrcode-body,
.wechat-export-content .wechat-badge-group,
.wechat-export-content .wechat-info-grid,
.wechat-export-content .wechat-info-card,
.wechat-export-content .wechat-image-slider,
.wechat-export-content .wechat-image-slider-track,
.wechat-export-content .wechat-link-references,
.wechat-export-content blockquote,
.wechat-export-content figcaption {
  text-align: left !important;
  text-align-last: left !important;
  text-justify: none !important;
  word-spacing: normal !important;
  word-break: break-word !important;
  overflow-wrap: anywhere !important;
}

.wechat-export-content a {
  word-break: break-all !important;
  overflow-wrap: anywhere !important;
}

.wechat-export-content .wechat-table-scroll,
.wechat-export-content [data-wechat-table-scroll="true"] {
  display: block !important;
  width: 100% !important;
  max-width: 100% !important;
  overflow: auto !important;
  -webkit-overflow-scrolling: touch !important;
  box-sizing: border-box !important;
}

.wechat-export-content .wechat-table-scroll table,
.wechat-export-content [data-wechat-table-scroll="true"] table {
  margin: 0 !important;
  max-width: none !important;
}

.wechat-export-content .wechat-table-scroll table.wechat-table-compact,
.wechat-export-content [data-wechat-table-scroll="true"] table.wechat-table-compact {
  width: 100% !important;
  table-layout: fixed !important;
}

.wechat-export-content .wechat-table-scroll table.wechat-table-wide,
.wechat-export-content [data-wechat-table-scroll="true"] table.wechat-table-wide {
  min-width: 100% !important;
  table-layout: auto !important;
}

.wechat-export-content table[data-wechat-table="true"] th,
.wechat-export-content table[data-wechat-table="true"] td {
  word-break: normal !important;
  overflow-wrap: anywhere !important;
  word-wrap: break-word !important;
}

.wechat-export-content table[data-wechat-table="true"].wechat-table-wide th,
.wechat-export-content table[data-wechat-table="true"].wechat-table-wide td {
  min-width: 6.5em !important;
}

.wechat-export-content a span {
  color: inherit;
}

.wechat-export-content blockquote {
  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
}

.wechat-export-content blockquote p,
.wechat-export-content blockquote span {
  color: inherit;
}

.wechat-export-content blockquote blockquote {
  border-left-color: inherit;
}

.wechat-export-content ul,
.wechat-export-content ol,
.wechat-export-content .wechat-list-block {
  padding-left: 0.92em !important;
  list-style: none !important;
  list-style-type: none !important;
}

.wechat-export-content li,
.wechat-export-content .wechat-list-item {
  list-style: none !important;
  list-style-type: none !important;
}

.wechat-export-content .wechat-list-block[data-wechat-list="task"] {
  padding-left: 0 !important;
}

.wechat-export-content .wechat-list-marker {
  min-width: 0.72em !important;
  margin-left: -0.92em !important;
  padding-right: 0.16em !important;
  font-size: 1.12em !important;
  line-height: 1 !important;
}

.wechat-export-content .wechat-list-block[data-wechat-list="task"] .wechat-list-marker {
  min-width: 1.6em !important;
  margin-left: 0 !important;
}

.wechat-export-content .wechat-callout {
  display: block !important;
  margin: 1.45em 0 !important;
  padding: 0.9em 1em !important;
  border-left-width: 4px !important;
  border-left-style: solid !important;
  border-radius: 10px !important;
}

.wechat-export-content .wechat-callout-title,
.wechat-export-content .wechat-profile-name,
.wechat-export-content .wechat-qrcode-title,
.wechat-export-content .wechat-link-references-title {
  margin-top: 0 !important;
  font-weight: 700 !important;
}

.wechat-export-content .wechat-callout-body > :first-child,
.wechat-export-content .wechat-profile-body > :first-child,
.wechat-export-content .wechat-qrcode-body > :first-child {
  margin-top: 0 !important;
}

.wechat-export-content .wechat-callout-body > :last-child,
.wechat-export-content .wechat-profile-body > :last-child,
.wechat-export-content .wechat-qrcode-body > :last-child {
  margin-bottom: 0 !important;
}

.wechat-export-content .wechat-badge {
  display: inline-block !important;
  border-radius: 999px !important;
  line-height: 1.55 !important;
}

.wechat-export-content .wechat-info-grid {
  display: table !important;
  width: 100% !important;
}

.wechat-export-content .wechat-info-card {
  display: table-row !important;
}

.wechat-export-content .wechat-info-label,
.wechat-export-content .wechat-info-value {
  display: table-cell !important;
  vertical-align: top !important;
}

.wechat-export-content .wechat-image-slider-track {
  display: block !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  white-space: nowrap !important;
  -webkit-overflow-scrolling: touch !important;
}

.wechat-export-content .wechat-image-slider-item {
  display: inline-block !important;
  width: 82% !important;
  max-width: 82% !important;
  vertical-align: top !important;
  white-space: normal !important;
}

.wechat-export-content .wechat-image-slider-item img {
  width: 100% !important;
  max-width: 100% !important;
}

.wechat-export-content .wechat-link-ref {
  color: #576b95 !important;
  font-size: 0.72em !important;
  vertical-align: super !important;
}

.wechat-export-content .wechat-link-reference-item {
  word-break: break-all !important;
  overflow-wrap: anywhere !important;
}

.wechat-export-content .wechat-link-reference-text {
  color: inherit !important;
  text-decoration: none !important;
  word-break: break-all !important;
  overflow-wrap: anywhere !important;
}

.wechat-export-content pre.code__pre,
.wechat-export-content .hljs.code__pre,
.wechat-export-content pre {
  padding: 0 !important;
  border-color: #272727 !important;
  border-radius: 8px !important;
  background: #242628 !important;
  font-size: 82% !important;
  overflow: hidden !important;
}

.wechat-export-content pre.code__pre > .mac-sign,
.wechat-export-content .hljs.code__pre > .mac-sign,
.wechat-export-content pre > .mac-sign {
  padding: 10px 14px 0 !important;
  background: #242628 !important;
}

.wechat-export-content .mac-sign svg {
  display: inline-block !important;
  width: 45px !important;
  height: 13px !important;
  vertical-align: top !important;
}

.wechat-export-content pre.code__pre > code,
.wechat-export-content .hljs.code__pre > code,
.wechat-export-content pre > code {
  padding: 0 !important;
  color: #f8f8f2 !important;
  background: none !important;
}

.wechat-export-content .wechat-code-scroll {
  width: 100% !important;
  max-width: 100% !important;
  overflow: hidden !important;
  padding: 8px 14px 14px !important;
}

.wechat-export-content .wechat-code-row {
  display: flex !important;
  align-items: flex-start !important;
  width: 100% !important;
  max-width: 100% !important;
}

.wechat-export-content .wechat-code-line-number {
  display: block !important;
  flex: 0 0 2.4em !important;
  width: 2.4em !important;
  padding-right: 0.8em !important;
  text-align: right !important;
  text-align-last: right !important;
}

.wechat-export-content .wechat-code-line {
  display: block !important;
  flex: 1 1 0 !important;
  min-width: 0 !important;
  min-height: 1.72em !important;
  white-space: pre-wrap !important;
  word-break: break-word !important;
  overflow-wrap: anywhere !important;
}
`.trim()

  return themeCss
    ? `${baseCss}\n\n${themeCss}\n\n${compatCss}`
    : `${baseCss}\n\n${defaultOnlyCss}\n\n${compatCss}`
}
