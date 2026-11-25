import { describe, expect, it } from 'vitest'
import {
  hasEditorMarkdownMath,
  renderMarkdownToEditorHtml,
  renderMarkdownToHtml,
} from '@/lib/editor-markdown'

describe('editor markdown helpers', () => {
  it('renders common markdown blocks for AI chat output', () => {
    const html = renderMarkdownToHtml('## 标题\n\n- 要点一\n- 要点二\n\n`code`')

    expect(html).toContain('<h2>标题</h2>')
    expect(html).toContain('<li>要点一</li>')
    expect(html).toContain('<code>code</code>')
  })

  it('does not pass raw html through AI chat markdown rendering', () => {
    const html = renderMarkdownToHtml('<img src=x onerror=alert(1)>')

    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('renders explicit inline latex as editor math markup', () => {
    const html = renderMarkdownToEditorHtml(String.raw`\(5 \times 10^{26}\)`)

    expect(html).toContain(String.raw`data-math-latex="5 \times 10^{26}"`)
    expect(html).toContain('data-display-mode="false"')
    expect(html).toContain('math-inline-wrapper')
  })

  it('renders common AI parenthesized exponent formulas as editor math markup', () => {
    const html = renderMarkdownToEditorHtml(
      '大约需要 (10^{30}) FLOPs 的计算量。',
    )

    expect(html).toContain('大约需要 ')
    expect(html).toContain('data-math-latex="10^{30}"')
    expect(html).toContain(' FLOPs 的计算量。')
  })

  it('does not treat ordinary explanatory parentheses as math', () => {
    const markdown =
      '目前前沿模型的预训练算力估计在 (5 \\times 10^{26}) FLOPs 左右（来自 xAI 的 Grok 4 数据）。'
    const html = renderMarkdownToEditorHtml(markdown)

    expect(html).toContain(String.raw`data-math-latex="5 \times 10^{26}"`)
    expect(html).toContain('（来自 xAI 的 Grok 4 数据）')
    expect(html).not.toContain('data-math-latex="来自 xAI 的 Grok 4 数据"')
  })

  it('keeps ordinary ASCII parentheses without stalling markdown paste parsing', () => {
    const markdown = [
      '| A | B |',
      '| --- | --- |',
      '| 1 | 2 |',
      '',
      '普通说明 (API) 不是公式。',
    ].join('\n')

    const html = renderMarkdownToEditorHtml(markdown)

    expect(html).toContain('<table>')
    expect(html).toContain('普通说明 (API) 不是公式。')
    expect(html).not.toContain('data-math-latex="API"')
  })

  it('renders display latex blocks as editor math markup', () => {
    const html = renderMarkdownToEditorHtml(String.raw`\[10^{30}\]`)

    expect(html).toContain('data-math-latex="10^{30}"')
    expect(html).toContain('data-display-mode="true"')
    expect(html).toContain('math-block-wrapper')
  })

  it('does not render latex-like text inside code blocks', () => {
    const markdown = [
      '代码：',
      '',
      '```',
      String.raw`\(5 \times 10^{26}\)`,
      '```',
    ].join('\n')
    const html = renderMarkdownToEditorHtml(markdown)

    expect(html).not.toContain('data-math-latex')
    expect(html).toContain(String.raw`\(5 \times 10^{26}\)`)
  })

  it('detects math markdown before the editor takes over paste handling', () => {
    expect(hasEditorMarkdownMath(String.raw`\(5 \times 10^{26}\)`)).toBe(true)
    expect(hasEditorMarkdownMath('大约需要 (10^{30}) FLOPs 的计算量。')).toBe(
      true,
    )
    expect(hasEditorMarkdownMath('普通说明（来自 xAI 的 Grok 4 数据）。')).toBe(
      false,
    )
  })
})
