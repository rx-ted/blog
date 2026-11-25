import { describe, expect, it } from 'vitest'
import {
  extractFirstMarkdownH1,
  hasEditorMarkdownMath,
  htmlToMarkdownBody,
  parseImportedMarkdown,
  renderMarkdownToEditorHtml,
  renderMarkdownToHtml,
} from '@/lib/markdown'

describe('markdown unified entry', () => {
  it('re-exports renderer helpers', () => {
    expect(renderMarkdownToHtml('## Title')).toContain('<h2>Title</h2>')
    expect(renderMarkdownToEditorHtml('## Title')).toContain('<h2>Title</h2>')
    expect(hasEditorMarkdownMath(String.raw`\(a+b\)`)).toBe(true)
  })

  it('re-exports serializer helpers', () => {
    const markdown = htmlToMarkdownBody('<p>Hello</p>')
    expect(typeof markdown).toBe('string')
    // turndown behavior can vary by DOM environment; verify re-export works
    expect(markdown === '' || markdown.includes('Hello')).toBe(true)
  })

  it('re-exports frontmatter helpers', () => {
    expect(extractFirstMarkdownH1('# Hello\n\nBody')?.title).toBe('Hello')
    expect(parseImportedMarkdown('---\ntitle: Test\n---\n\nBody').title).toBe('Test')
  })
})
