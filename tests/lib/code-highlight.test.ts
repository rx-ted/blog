import { describe, expect, it } from 'vitest'
import {
  buildPlainCodeLinesHtml,
  isInfographicLanguage,
  isPlantUmlLanguage,
  isVisualDiagramLanguage,
} from '@/lib/code-highlight'

describe('code highlight helpers', () => {
  it('recognizes visual diagram languages that are rendered outside code highlighting', () => {
    expect(isPlantUmlLanguage('plantuml')).toBe(true)
    expect(isPlantUmlLanguage('puml')).toBe(true)
    expect(isInfographicLanguage('infographic')).toBe(true)
    expect(isVisualDiagramLanguage('mermaid')).toBe(true)
    expect(isVisualDiagramLanguage('plantuml')).toBe(true)
    expect(isVisualDiagramLanguage('infographic')).toBe(true)
    expect(isVisualDiagramLanguage('typescript')).toBe(false)
  })

  it('builds plain single-color code lines without hljs syntax spans', () => {
    const html = buildPlainCodeLinesHtml(
      'const a = 1\nif (a < 2) {\n  console.log("a & b")\n}',
    )

    expect(html).not.toContain('hljs-')
    expect(html).not.toContain('<span class="hljs')
    expect((html.match(/class="wechat-code-row"/g) || []).length).toBe(4)
    expect((html.match(/class="wechat-code-line-number"/g) || []).length).toBe(
      4,
    )
    expect((html.match(/class="wechat-code-line"/g) || []).length).toBe(4)
    expect(html).toContain('aria-hidden="true">1</span>')
    expect(html).toContain('const a = 1')
    expect(html).toContain('if (a &lt; 2) {')
    expect(html).toContain('console.log(&quot;a &amp; b&quot;)')
  })

  it('keeps empty lines and line count for line numbers', () => {
    const html = buildPlainCodeLinesHtml('第一行\n\n第三行')

    expect((html.match(/class="wechat-code-row"/g) || []).length).toBe(3)
    expect((html.match(/class="wechat-code-line"/g) || []).length).toBe(3)
    expect(html).toContain('<span class="wechat-code-line">&nbsp;</span>')
  })

  it('does not mark diff lines with red/green emphasis classes', () => {
    const html = buildPlainCodeLinesHtml('+ added line\n- removed line')

    expect(html).not.toContain('wechat-code-line-add')
    expect(html).not.toContain('wechat-code-line-remove')
    expect(html).toContain('+ added line')
    expect(html).toContain('- removed line')
  })
})
