export type ArticleTocLevel = 1 | 2 | 3

export type ArticleTocItem = {
  id: string
  title: string
  level: ArticleTocLevel
  pos?: number
  sectionNumber?: number
}

type TiptapHeadingNode = {
  type: {
    name: string
  }
  attrs?: {
    level?: unknown
  }
  textContent?: string
}

type TiptapDocLike = {
  descendants: (
    callback: (node: TiptapHeadingNode, pos: number) => boolean | undefined,
  ) => void
}

const SECTION_LEVELS = new Set<ArticleTocLevel>([2, 3])

export function normalizeTocTitle(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function createTocAnchorId(title: string, index: number) {
  const normalized = normalizeTocTitle(title)
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z0-9#]+;/gi, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return `section-${normalized || 'heading'}-${index + 1}`
}

export function extractTocFromTiptapDoc(
  doc: TiptapDocLike | null | undefined,
): ArticleTocItem[] {
  if (!doc) return []

  const items: ArticleTocItem[] = []
  let sectionNumber = 0

  doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') return true
    const level = Number(node.attrs?.level)
    if (level !== 1 && level !== 2 && level !== 3) return true

    const title = normalizeTocTitle(node.textContent || '')
    if (!title) return true

    if (SECTION_LEVELS.has(level)) {
      sectionNumber += 1
    }

    items.push({
      id: createTocAnchorId(title, items.length),
      title,
      level,
      pos,
      sectionNumber: SECTION_LEVELS.has(level) ? sectionNumber : undefined,
    })

    return true
  })

  return items
}

export function getAiSectionToc(items: ArticleTocItem[]) {
  return items.filter((item) => SECTION_LEVELS.has(item.level))
}

export function formatTocItemForAi(item: ArticleTocItem | null | undefined) {
  if (!item) return ''

  const sectionPrefix = Number.isInteger(item.sectionNumber)
    ? `${item.sectionNumber}. `
    : ''
  return `${sectionPrefix}H${item.level} ${item.title}`
}

export function formatTocForAi(items: ArticleTocItem[]) {
  const sections = getAiSectionToc(items)
  if (sections.length === 0) return ''

  return sections.map(formatTocItemForAi).join('\n')
}
