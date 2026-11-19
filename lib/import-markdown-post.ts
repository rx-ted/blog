import matter from 'gray-matter'

export type ParsedImportedMarkdownPost = {
  body: string
  title?: string
  slug?: string
  description?: string
  tags?: string[]
  coverImage?: string
  category?: string
}

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function pickFirstString(data: Record<string, unknown>, keys: string[]): { provided: boolean; value?: string } {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue
    const raw = data[key]
    if (Array.isArray(raw)) {
      for (const item of raw) {
        const value = asTrimmedString(item)
        if (value) return { provided: true, value }
      }
      return { provided: true, value: undefined }
    }
    const value = asTrimmedString(raw)
    return { provided: true, value }
  }
  return { provided: false }
}

function normalizeTags(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined

  const items: string[] = []
  const pushParts = (text: string) => {
    for (const part of text.split(/[,\n，、]+/)) {
      const trimmed = part.trim()
      if (trimmed) items.push(trimmed)
    }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') pushParts(item)
      else if (item != null) pushParts(String(item))
    }
  } else if (typeof value === 'string') {
    pushParts(value)
  } else {
    pushParts(String(value))
  }

  const deduped: string[] = []
  const seen = new Set<string>()
  for (const item of items) {
    if (seen.has(item)) continue
    seen.add(item)
    deduped.push(item)
  }
  return deduped
}

export function extractFirstMarkdownH1(markdown: string): { title: string; body: string } | null {
  const normalized = markdown.replace(/\r\n?/g, '\n')
  const match = normalized.match(/^#\s+(.+?)\s*#*\s*$/m)
  if (!match || match.index === undefined) return null

  const title = match[1]?.trim()
  if (!title) return null

  const before = normalized.slice(0, match.index)
  const after = normalized.slice(match.index + match[0].length)
  // Only strip if the heading appears at the start of the content (ignoring leading blank lines)
  if (before.trim() === '') {
    return {
      title,
      body: after.replace(/^\n+/, ''),
    }
  }

  return { title, body: normalized }
}

export function parseImportedMarkdown(markdownSource: string): ParsedImportedMarkdownPost {
  const source = stripBom(markdownSource || '')
  let data: Record<string, unknown> = {}
  let body = source

  try {
    const parsed = matter(source)
    const hasFrontmatter = typeof parsed.matter === 'string' && parsed.matter.trim().length > 0
    if (hasFrontmatter) {
      data = (parsed.data || {}) as Record<string, unknown>
      body = parsed.content || ''
    } else {
      // gray-matter may parse empty/frontmatter-like edge cases; treat as no frontmatter
      data = {}
      body = source
    }
  } catch {
    data = {}
    body = source
  }

  body = body.replace(/\r\n?/g, '\n')

  const result: ParsedImportedMarkdownPost = { body }

  // title: frontmatter.title -> first H1 in body
  const frontmatterTitle = pickFirstString(data, ['title'])
  if (frontmatterTitle.provided && frontmatterTitle.value) {
    result.title = frontmatterTitle.value
  } else {
    const h1 = extractFirstMarkdownH1(body)
    if (h1) {
      result.title = h1.title
      result.body = h1.body
    }
  }

  const slug = pickFirstString(data, ['slug'])
  if (slug.provided && slug.value) {
    result.slug = slug.value
  }

  const description = pickFirstString(data, ['description', 'desc', 'summary', 'excerpt'])
  if (description.provided && description.value) {
    result.description = description.value
  }

  if (Object.prototype.hasOwnProperty.call(data, 'tags') || Object.prototype.hasOwnProperty.call(data, 'tag')) {
    const raw = Object.prototype.hasOwnProperty.call(data, 'tags') ? data.tags : data.tag
    const tags = normalizeTags(raw)
    if (tags) {
      result.tags = tags
    }
  }

  const cover = pickFirstString(data, ['cover', 'cover_image', 'coverImage', 'image', 'banner'])
  if (cover.provided && cover.value) {
    result.coverImage = cover.value
  }

  const category = pickFirstString(data, ['category', 'categories'])
  if (category.provided && category.value) {
    result.category = category.value
  }

  return result
}
