import type { Post, PostWithTags } from '@/lib/repositories/types'

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export function parsePostTags(value: string | null): string[] {
  if (!value) return []

  try {
    return normalizeTags(JSON.parse(value))
  } catch {
    return []
  }
}

export function normalizePostStatus(
  post: Pick<Post, 'status' | 'deleted_at'>,
): Post['status'] {
  return post.deleted_at ? 'deleted' : post.status || 'published'
}

export function mapPostWithTags(post: Post): PostWithTags {
  return {
    ...post,
    status: normalizePostStatus(post),
    tags: parsePostTags(post.tags),
  }
}
