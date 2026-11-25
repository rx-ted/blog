import { ensureSchema, type Database } from '@/lib/repositories/schema'
import type { MediaAssetRow } from '@/lib/repositories/types'

export type MediaAssetSource =
  | 'upload'
  | 'remote'
  | 'ai_chat'
  | 'image_modal'
  | 'cover_generator'
  | 'unsplash'
  | 'collage'

export type ArticleAssetRole = 'inline' | 'cover' | 'section' | 'unused'

export interface MediaAsset {
  id: number
  type: string
  source: string
  r2_key: string | null
  url: string
  variants: Record<string, string>
  mime_type: string | null
  size_bytes: number | null
  width: number | null
  height: number | null
  alt: string
  prompt: string
  revised_prompt: string
  model: string
  provider_name: string
  aspect_ratio: string
  resolution: string
  created_at: number
  updated_at: number
  link_count: number
  current_post_link_count: number
  last_linked_at: number | null
}

export interface UpsertMediaAssetInput {
  type?: string
  source: MediaAssetSource
  r2Key?: string | null
  url: string
  variants?: Record<string, string | undefined> | null
  mimeType?: string | null
  sizeBytes?: number | null
  width?: number | null
  height?: number | null
  alt?: string | null
  prompt?: string | null
  revisedPrompt?: string | null
  model?: string | null
  providerName?: string | null
  aspectRatio?: string | null
  resolution?: string | null
}

export interface LinkMediaAssetToArticleInput {
  assetId: number
  postId?: number | null
  slug?: string | null
  role?: ArticleAssetRole
  sectionTitle?: string | null
  sectionNumber?: number | null
  toolCallId?: string | null
  sessionId?: string | null
}

export interface ListMediaAssetsOptions {
  postId?: number | null
  slug?: string | null
  scope?: 'article' | 'all'
  source?: string | null
  query?: string | null
  limit?: number
  offset?: number
}

export interface RecordAiChatToolActionInput {
  toolCallId: string
  sessionId?: string | null
  postId?: number | null
  slug?: string | null
  actionType: string
  assetId?: number | null
  status?: 'success' | 'error'
  errorMessage?: string | null
}

function parseVariants(value: string | null) {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    )
  } catch {
    return {}
  }
}

function serializeVariants(value: UpsertMediaAssetInput['variants']) {
  if (!value) return null
  const variants = Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && entry[1].trim().length > 0,
    ),
  )
  return Object.keys(variants).length > 0 ? JSON.stringify(variants) : null
}

function normalizeInteger(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : null
}

function mapMediaAsset(row: MediaAssetRow): MediaAsset {
  return {
    id: row.id,
    type: row.type,
    source: row.source,
    r2_key: row.r2_key,
    url: row.url,
    variants: parseVariants(row.variants_json),
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    width: row.width,
    height: row.height,
    alt: row.alt || '',
    prompt: row.prompt || '',
    revised_prompt: row.revised_prompt || '',
    model: row.model || '',
    provider_name: row.provider_name || '',
    aspect_ratio: row.aspect_ratio || '',
    resolution: row.resolution || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
    link_count: row.link_count ?? 0,
    current_post_link_count: row.current_post_link_count ?? 0,
    last_linked_at: row.last_linked_at ?? null,
  }
}

export async function upsertMediaAsset(
  db: Database,
  input: UpsertMediaAssetInput,
): Promise<MediaAsset> {
  await ensureSchema(db)

  const url = input.url.trim()
  if (!url) throw new Error('媒体 URL 不能为空')

  await db
    .prepare(
      `INSERT INTO media_assets (
        type, source, r2_key, url, variants_json, mime_type, size_bytes, width, height,
        alt, prompt, revised_prompt, model, provider_name, aspect_ratio, resolution
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(url) DO UPDATE SET
        type = excluded.type,
        source = excluded.source,
        r2_key = COALESCE(excluded.r2_key, media_assets.r2_key),
        variants_json = COALESCE(excluded.variants_json, media_assets.variants_json),
        mime_type = COALESCE(excluded.mime_type, media_assets.mime_type),
        size_bytes = COALESCE(excluded.size_bytes, media_assets.size_bytes),
        width = COALESCE(excluded.width, media_assets.width),
        height = COALESCE(excluded.height, media_assets.height),
        alt = COALESCE(NULLIF(excluded.alt, ''), media_assets.alt),
        prompt = COALESCE(NULLIF(excluded.prompt, ''), media_assets.prompt),
        revised_prompt = COALESCE(NULLIF(excluded.revised_prompt, ''), media_assets.revised_prompt),
        model = COALESCE(NULLIF(excluded.model, ''), media_assets.model),
        provider_name = COALESCE(NULLIF(excluded.provider_name, ''), media_assets.provider_name),
        aspect_ratio = COALESCE(NULLIF(excluded.aspect_ratio, ''), media_assets.aspect_ratio),
        resolution = COALESCE(NULLIF(excluded.resolution, ''), media_assets.resolution),
        updated_at = strftime('%s', 'now')`,
    )
    .bind(
      input.type || 'image',
      input.source,
      input.r2Key || null,
      url,
      serializeVariants(input.variants),
      input.mimeType || null,
      normalizeInteger(input.sizeBytes),
      normalizeInteger(input.width),
      normalizeInteger(input.height),
      input.alt || null,
      input.prompt || null,
      input.revisedPrompt || null,
      input.model || null,
      input.providerName || null,
      input.aspectRatio || null,
      input.resolution || null,
    )
    .run()

  const asset = await getMediaAssetByUrl(db, url)
  if (!asset) throw new Error('媒体资产保存失败')
  return asset
}

export async function getMediaAssetByUrl(
  db: Database,
  url: string,
): Promise<MediaAsset | null> {
  await ensureSchema(db)
  const row = await db
    .prepare('SELECT * FROM media_assets WHERE url = ?')
    .bind(url)
    .first<MediaAssetRow>()

  return row ? mapMediaAsset(row) : null
}

export async function linkMediaAssetToArticle(
  db: Database,
  input: LinkMediaAssetToArticleInput,
): Promise<void> {
  await ensureSchema(db)
  const postId = normalizeInteger(input.postId)
  const slug = input.slug?.trim() || null

  if (!postId && !slug) return

  await db
    .prepare(
      `INSERT INTO article_asset_links (
        asset_id, post_id, slug, role, section_title, section_number, tool_call_id, session_id
      )
      SELECT ?, ?, ?, ?, ?, ?, ?, ?
      WHERE NOT EXISTS (
        SELECT 1
        FROM article_asset_links
        WHERE asset_id = ?
          AND COALESCE(post_id, 0) = COALESCE(?, 0)
          AND COALESCE(slug, '') = COALESCE(?, '')
          AND role = ?
          AND COALESCE(tool_call_id, '') = COALESCE(?, '')
      )`,
    )
    .bind(
      input.assetId,
      postId,
      slug,
      input.role || 'inline',
      input.sectionTitle || null,
      normalizeInteger(input.sectionNumber),
      input.toolCallId || null,
      input.sessionId || null,
      input.assetId,
      postId,
      slug,
      input.role || 'inline',
      input.toolCallId || null,
    )
    .run()
}

export async function listMediaAssets(
  db: Database,
  options: ListMediaAssetsOptions = {},
): Promise<MediaAsset[]> {
  await ensureSchema(db)

  const limit = Math.min(Math.max(options.limit ?? 48, 1), 100)
  const offset = Math.max(options.offset ?? 0, 0)
  const postId = normalizeInteger(options.postId)
  const slug = options.slug?.trim() || null
  const source = options.source?.trim() || null
  const query = options.query?.trim() || null
  const scope = options.scope || 'all'
  const filters: string[] = ["media_assets.type = 'image'"]
  const values: unknown[] = []
  const articleMatchConditions: string[] = []
  const articleMatchValues: unknown[] = []

  if (postId) {
    articleMatchConditions.push('post_id = ?')
    articleMatchValues.push(postId)
  }
  if (slug) {
    articleMatchConditions.push('slug = ?')
    articleMatchValues.push(slug)
  }
  const hasArticleMatch = articleMatchConditions.length > 0

  if (source) {
    filters.push('media_assets.source = ?')
    values.push(source)
  }

  if (query) {
    const pattern = `%${query}%`
    filters.push(`(
      media_assets.alt LIKE ?
      OR media_assets.prompt LIKE ?
      OR media_assets.revised_prompt LIKE ?
      OR media_assets.model LIKE ?
      OR media_assets.provider_name LIKE ?
      OR media_assets.source LIKE ?
    )`)
    values.push(pattern, pattern, pattern, pattern, pattern, pattern)
  }

  if (scope === 'article' && hasArticleMatch) {
    filters.push(`EXISTS (
      SELECT 1
      FROM article_asset_links scoped_links
      WHERE scoped_links.asset_id = media_assets.id
        AND (${articleMatchConditions.map((condition) => `scoped_links.${condition}`).join(' OR ')})
    )`)
    values.push(...articleMatchValues)
  }

  const currentPostMatch = hasArticleMatch
    ? `SUM(CASE WHEN ${articleMatchConditions.map((condition) => `article_asset_links.${condition}`).join(' OR ')} THEN 1 ELSE 0 END)`
    : '0'
  const currentPostValues = [...articleMatchValues]

  const { results } = await db
    .prepare(
      `SELECT
        media_assets.*,
        COUNT(article_asset_links.id) AS link_count,
        ${currentPostMatch} AS current_post_link_count,
        MAX(article_asset_links.inserted_at) AS last_linked_at
      FROM media_assets
      LEFT JOIN article_asset_links ON article_asset_links.asset_id = media_assets.id
      WHERE ${filters.join(' AND ')}
      GROUP BY media_assets.id
      ORDER BY media_assets.created_at DESC, media_assets.id DESC
      LIMIT ? OFFSET ?`,
    )
    .bind(...currentPostValues, ...values, limit, offset)
    .all<MediaAssetRow>()

  return results.map(mapMediaAsset)
}

export async function recordAiChatToolAction(
  db: Database,
  input: RecordAiChatToolActionInput,
): Promise<void> {
  await ensureSchema(db)
  const toolCallId = input.toolCallId.trim()
  if (!toolCallId) return

  await db
    .prepare(
      `INSERT INTO ai_chat_tool_actions (
        tool_call_id, session_id, post_id, slug, action_type, asset_id, status, error_message
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tool_call_id) DO UPDATE SET
        session_id = COALESCE(excluded.session_id, ai_chat_tool_actions.session_id),
        post_id = COALESCE(excluded.post_id, ai_chat_tool_actions.post_id),
        slug = COALESCE(excluded.slug, ai_chat_tool_actions.slug),
        action_type = excluded.action_type,
        asset_id = COALESCE(excluded.asset_id, ai_chat_tool_actions.asset_id),
        status = excluded.status,
        error_message = excluded.error_message,
        updated_at = strftime('%s', 'now')`,
    )
    .bind(
      toolCallId,
      input.sessionId || null,
      normalizeInteger(input.postId),
      input.slug || null,
      input.actionType,
      normalizeInteger(input.assetId),
      input.status || 'success',
      input.errorMessage || null,
    )
    .run()
}
