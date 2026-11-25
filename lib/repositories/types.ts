export interface Post {
  id: number
  slug: string
  title: string
  content: string
  html: string
  description: string | null
  category: string | null
  tags: string | null
  status: 'draft' | 'published' | 'deleted'
  password: string | null
  is_pinned: number
  is_hidden: number
  cover_image: string | null
  deleted_at: number | null
  published_at: number
  updated_at: number
  view_count: number
}

export interface PostWithTags extends Omit<Post, 'tags'> {
  tags: string[]
}

export interface CountRow {
  count: number
}

export interface StatsRow {
  total_posts: number
  total_views: number
}

export interface CategoryRow {
  name: string
  slug: string
  post_count: number
}

export interface SettingRow {
  value: string
}

export interface PostCategoryRow {
  id?: number
  slug?: string
  category: string | null
  deleted_at?: number | null
}

export interface PostAiSnapshotRow {
  id: number
  title: string
  content: string
  category: string | null
  description: string | null
  tags: string | null
  deleted_at: number | null
}

export interface MediaAssetRow {
  id: number
  type: string
  source: string
  r2_key: string | null
  url: string
  variants_json: string | null
  mime_type: string | null
  size_bytes: number | null
  width: number | null
  height: number | null
  alt: string | null
  prompt: string | null
  revised_prompt: string | null
  model: string | null
  provider_name: string | null
  aspect_ratio: string | null
  resolution: string | null
  created_at: number
  updated_at: number
  link_count?: number
  current_post_link_count?: number
  last_linked_at?: number | null
}

export interface AiResearchResourceRow {
  id: number
  source_type: string
  url: string
  canonical_url: string
  platform: string
  provider: string
  status: string
  title: string
  summary: string
  excerpt: string
  content_text: string
  content_r2_key: string | null
  content_hash: string
  error_message: string
  created_at: number
  updated_at: number
}

export interface AiResearchJobRow {
  id: number
  resource_id: number
  provider: string
  provider_task_id: string | null
  provider_note_id: string | null
  status: string
  raw_status: string
  error_message: string
  last_polled_at: number | null
  next_poll_at: number | null
  created_at: number
  updated_at: number
}

export function isPubliclyAccessiblePost(
  post: Pick<Post, 'status' | 'deleted_at'> | null | undefined,
): boolean {
  return Boolean(post && post.status === 'published' && post.deleted_at == null)
}

export function isSearchIndexablePost(
  post:
    | Pick<Post, 'status' | 'password' | 'is_hidden' | 'deleted_at'>
    | null
    | undefined,
): boolean {
  return Boolean(
    post &&
      post.status === 'published' &&
      post.password == null &&
      post.is_hidden === 0 &&
      post.deleted_at == null,
  )
}
