import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { JSONContent } from 'novel'
import type { ArticleTocItem } from '@/lib/article-toc'

export type SaveFeedback =
  | { type: 'success' | 'error'; message: string; slug?: string; published?: boolean; canStartNew?: boolean }
  | null

export type PublishStatus = 'public' | 'draft' | 'encrypted' | 'unlisted'
export type SaveState = 'saved' | 'dirty' | 'saving' | 'error'
export type SidebarTab = 'properties' | 'ai'
export type EditorViewMode = 'source' | 'preview' | 'wysiwyg'

export type EditorAiToolInsertTarget = {
  mode: 'cursor' | 'section'
  sectionNumber?: number
  sectionTitle?: string
}

export type EditorAiToolOutput = {
  status: 'success' | 'error'
  message: string
}

export type EditorAiReadArticleContentOutput = {
  status: 'success' | 'error'
  message: string
  scope: 'all' | 'selection'
  content: string
  charCount: number
  truncated: boolean
  title: string
  sectionToc: string
  currentSection: string
  selectedText: string
}

export type EditorAiEditArticleContentInput = {
  action: 'replace' | 'delete'
  target: {
    mode: 'selection' | 'exactText' | 'all'
    exactText?: string
    occurrence?: number
    useLastMatch?: boolean
  }
  replacementMarkdown?: string
  expectedText?: string
}

export type DraftMetaState = {
  postId: number | null
  editSlug: string | null
  slug: string
  category: string
  tags: string[]
  description: string
  coverImage: string
}

export type MetaGenerationTarget = 'summary' | 'tags' | 'slug' | 'cover'

export const SIDEBAR_KEY = 'qmblog:sidebar-open'
export const TOC_COLLAPSED_KEY = 'qmblog:editor-toc-collapsed'
export const AUTOSAVE_DEBOUNCE_MS = 5 * 60 * 1000
export const AUTOSAVE_MAX_RETRY_DELAY_MS = 10000
export const IMPORT_MARKDOWN_STORAGE_KEY = 'qmblog:pending-editor-import-markdown'

export const EMPTY_DOCUMENT = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
} satisfies JSONContent

export function calcReadTime(chars: number): string {
  const minutes = Math.max(1, Math.ceil(chars / 400))
  return `约${minutes}分钟阅读`
}

export function createEditorDraftDocumentKey() {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
  return `draft:${Date.now()}-${random}`
}

export function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  return `${Math.floor(diff / 3600)}小时前`
}

export function normalizeSectionTitle(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function findSectionInsertPosition(doc: ProseMirrorNode, target?: EditorAiToolInsertTarget) {
  if (!target || target.mode !== 'section') return null

  const sectionTitle = target.sectionTitle ? normalizeSectionTitle(target.sectionTitle) : ''
  const sectionNumber = Number.isInteger(target.sectionNumber) && Number(target.sectionNumber) > 0
    ? Number(target.sectionNumber)
    : null
  let matchedPos: number | null = null
  let seenSections = 0

  doc.descendants((node, pos) => {
    if (matchedPos !== null) return false
    if (node.type.name !== 'heading') return true
    const level = Number(node.attrs.level)
    if (level !== 2 && level !== 3) return true

    seenSections += 1
    const title = normalizeSectionTitle(node.textContent || '')
    const matchesNumber = sectionNumber !== null && seenSections === sectionNumber
    const matchesTitle = Boolean(sectionTitle) && title.includes(sectionTitle)

    if (matchesNumber || matchesTitle) {
      matchedPos = pos + node.nodeSize
      return false
    }

    return true
  })

  return matchedPos
}

export function syncEditorHeadingAnchors(root: HTMLElement | null, tocItems: ArticleTocItem[]) {
  if (!root || tocItems.length === 0) return

  const headings = Array.from(root.querySelectorAll<HTMLElement>('h1, h2, h3'))
  for (const [index, item] of tocItems.entries()) {
    const heading = headings[index]
    if (!heading) continue
    heading.id = item.id
  }
}
