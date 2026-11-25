import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'

/**
 * Server-side markdown -> HTML renderer for stored/public post content.
 * Keeps GFM behavior (tables, strikethrough, task lists, autolinks).
 * Intentionally separate from editor markdown rendering to avoid changing
 * public content output.
 */
export async function renderMarkdownToPublicHtml(content: string) {
  return (
    await remark()
      .use(remarkGfm)
      .use(remarkHtml, { sanitize: false })
      .process(content)
  ).toString()
}
