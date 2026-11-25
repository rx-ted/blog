import MarkdownIt from 'markdown-it'
import { markdownMathPlugin } from './math'

const markdownParser = MarkdownIt({
  html: false,
  linkify: true,
})

const editorMarkdownParser = MarkdownIt({
  html: false,
  linkify: true,
}).use(markdownMathPlugin)

export function renderMarkdownToHtml(markdown: string) {
  return markdownParser.render(markdown.trim())
}

export function renderMarkdownToEditorHtml(markdown: string) {
  return editorMarkdownParser.render(markdown.trim())
}
