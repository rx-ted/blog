import { ensureSchema, type Database } from '@/lib/repositories/schema'
import type {
  AiResearchJobRow,
  AiResearchResourceRow,
} from '@/lib/repositories/types'

export type AiResearchResourceStatus =
  | 'pending'
  | 'processing'
  | 'ready'
  | 'failed'
export type AiResearchJobStatus = 'pending' | 'processing' | 'ready' | 'failed'
export type AiResearchSourceType =
  | 'webpage'
  | 'transcript'
  | 'x_post'
  | 'search_result'
export type AiResearchLinkRole = 'source' | 'cited' | 'inserted'

export type AiResearchResource = AiResearchResourceRow
export type AiResearchJob = AiResearchJobRow

export interface UpsertAiResearchResourceInput {
  sourceType: AiResearchSourceType | string
  url: string
  canonicalUrl?: string | null
  platform?: string | null
  provider?: string | null
  status?: AiResearchResourceStatus
  title?: string | null
  summary?: string | null
  excerpt?: string | null
  contentText?: string | null
  contentR2Key?: string | null
  contentHash?: string | null
  errorMessage?: string | null
}

export interface UpsertAiResearchJobInput {
  resourceId: number
  provider: string
  providerTaskId?: string | null
  providerNoteId?: string | null
  status?: AiResearchJobStatus
  rawStatus?: string | null
  errorMessage?: string | null
  lastPolledAt?: number | null
  nextPollAt?: number | null
}

export interface LinkAiResearchResourceInput {
  resourceId: number
  sessionId?: string | null
  postId?: number | null
  slug?: string | null
  role?: AiResearchLinkRole
}

function normalizeText(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeNullableText(value: string | null | undefined) {
  const normalized = normalizeText(value)
  return normalized || null
}

function normalizeInteger(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : null
}

export function normalizeResearchUrl(input: string) {
  const url = new URL(input.trim())
  url.hash = ''
  if (url.protocol === 'https:' && url.port === '443') url.port = ''
  if (url.protocol === 'http:' && url.port === '80') url.port = ''
  url.hostname = url.hostname.toLowerCase()
  return url.toString()
}

export async function getAiResearchResourceByCanonicalUrl(
  db: Database,
  canonicalUrl: string,
): Promise<AiResearchResource | null> {
  await ensureSchema(db)
  const normalized = normalizeResearchUrl(canonicalUrl)
  return db
    .prepare('SELECT * FROM ai_research_resources WHERE canonical_url = ?')
    .bind(normalized)
    .first<AiResearchResourceRow>()
}

export async function getAiResearchResourceById(
  db: Database,
  id: number,
): Promise<AiResearchResource | null> {
  await ensureSchema(db)
  return db
    .prepare('SELECT * FROM ai_research_resources WHERE id = ?')
    .bind(id)
    .first<AiResearchResourceRow>()
}

export async function upsertAiResearchResource(
  db: Database,
  input: UpsertAiResearchResourceInput,
): Promise<AiResearchResource> {
  await ensureSchema(db)

  const url = input.url.trim()
  if (!url) throw new Error('资源 URL 不能为空')

  const canonicalUrl = normalizeResearchUrl(input.canonicalUrl || url)
  await db
    .prepare(
      `INSERT INTO ai_research_resources (
        source_type, url, canonical_url, platform, provider, status, title, summary,
        excerpt, content_text, content_r2_key, content_hash, error_message
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(canonical_url) DO UPDATE SET
        source_type = excluded.source_type,
        url = excluded.url,
        platform = COALESCE(NULLIF(excluded.platform, ''), ai_research_resources.platform),
        provider = COALESCE(NULLIF(excluded.provider, ''), ai_research_resources.provider),
        status = excluded.status,
        title = COALESCE(NULLIF(excluded.title, ''), ai_research_resources.title),
        summary = COALESCE(NULLIF(excluded.summary, ''), ai_research_resources.summary),
        excerpt = COALESCE(NULLIF(excluded.excerpt, ''), ai_research_resources.excerpt),
        content_text = COALESCE(NULLIF(excluded.content_text, ''), ai_research_resources.content_text),
        content_r2_key = COALESCE(excluded.content_r2_key, ai_research_resources.content_r2_key),
        content_hash = COALESCE(NULLIF(excluded.content_hash, ''), ai_research_resources.content_hash),
        error_message = excluded.error_message,
        updated_at = strftime('%s', 'now')`,
    )
    .bind(
      input.sourceType,
      url,
      canonicalUrl,
      normalizeText(input.platform),
      normalizeText(input.provider),
      input.status || 'pending',
      normalizeText(input.title),
      normalizeText(input.summary),
      normalizeText(input.excerpt),
      normalizeText(input.contentText),
      normalizeNullableText(input.contentR2Key),
      normalizeText(input.contentHash),
      normalizeText(input.errorMessage),
    )
    .run()

  const resource = await getAiResearchResourceByCanonicalUrl(db, canonicalUrl)
  if (!resource) throw new Error('素材资源保存失败')
  return resource
}

export async function getAiResearchJobByTaskId(
  db: Database,
  provider: string,
  taskId: string,
): Promise<AiResearchJob | null> {
  await ensureSchema(db)
  return db
    .prepare(
      'SELECT * FROM ai_research_jobs WHERE provider = ? AND provider_task_id = ?',
    )
    .bind(provider, taskId.trim())
    .first<AiResearchJobRow>()
}

export async function getAiResearchJobByNoteId(
  db: Database,
  provider: string,
  noteId: string,
): Promise<AiResearchJob | null> {
  await ensureSchema(db)
  return db
    .prepare(
      'SELECT * FROM ai_research_jobs WHERE provider = ? AND provider_note_id = ?',
    )
    .bind(provider, noteId.trim())
    .first<AiResearchJobRow>()
}

export async function getLatestAiResearchJobForResource(
  db: Database,
  resourceId: number,
  provider?: string,
): Promise<AiResearchJob | null> {
  await ensureSchema(db)
  const normalizedProvider = provider?.trim()
  if (normalizedProvider) {
    return db
      .prepare(
        'SELECT * FROM ai_research_jobs WHERE resource_id = ? AND provider = ? ORDER BY updated_at DESC, id DESC LIMIT 1',
      )
      .bind(resourceId, normalizedProvider)
      .first<AiResearchJobRow>()
  }
  return db
    .prepare(
      'SELECT * FROM ai_research_jobs WHERE resource_id = ? ORDER BY updated_at DESC, id DESC LIMIT 1',
    )
    .bind(resourceId)
    .first<AiResearchJobRow>()
}

export async function upsertAiResearchJob(
  db: Database,
  input: UpsertAiResearchJobInput,
): Promise<AiResearchJob> {
  await ensureSchema(db)

  const provider = input.provider.trim()
  if (!provider) throw new Error('任务 provider 不能为空')
  const taskId = normalizeNullableText(input.providerTaskId)
  const noteId = normalizeNullableText(input.providerNoteId)
  const existing = taskId
    ? await getAiResearchJobByTaskId(db, provider, taskId)
    : noteId
      ? await getAiResearchJobByNoteId(db, provider, noteId)
      : null

  if (existing) {
    await db
      .prepare(
        `UPDATE ai_research_jobs
        SET resource_id = ?,
            provider_note_id = COALESCE(?, provider_note_id),
            status = ?,
            raw_status = ?,
            error_message = ?,
            last_polled_at = COALESCE(?, last_polled_at),
            next_poll_at = ?,
            updated_at = strftime('%s', 'now')
        WHERE id = ?`,
      )
      .bind(
        input.resourceId,
        noteId,
        input.status || existing.status,
        normalizeText(input.rawStatus) || existing.raw_status,
        normalizeText(input.errorMessage),
        normalizeInteger(input.lastPolledAt),
        normalizeInteger(input.nextPollAt),
        existing.id,
      )
      .run()
    const updated = taskId
      ? await getAiResearchJobByTaskId(db, provider, taskId)
      : noteId
        ? await getAiResearchJobByNoteId(db, provider, noteId)
        : null
    if (!updated) throw new Error('素材任务更新失败')
    return updated
  }

  await db
    .prepare(
      `INSERT INTO ai_research_jobs (
        resource_id, provider, provider_task_id, provider_note_id, status, raw_status,
        error_message, last_polled_at, next_poll_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.resourceId,
      provider,
      taskId,
      noteId,
      input.status || 'pending',
      normalizeText(input.rawStatus),
      normalizeText(input.errorMessage),
      normalizeInteger(input.lastPolledAt),
      normalizeInteger(input.nextPollAt),
    )
    .run()

  const created = taskId
    ? await getAiResearchJobByTaskId(db, provider, taskId)
    : noteId
      ? await getAiResearchJobByNoteId(db, provider, noteId)
      : await getLatestAiResearchJobForResource(db, input.resourceId, provider)
  if (!created) throw new Error('素材任务保存失败')
  return created
}

export async function linkAiResearchResource(
  db: Database,
  input: LinkAiResearchResourceInput,
): Promise<void> {
  await ensureSchema(db)

  const sessionId = normalizeNullableText(input.sessionId)
  const postId = normalizeInteger(input.postId)
  const slug = normalizeNullableText(input.slug)
  if (!sessionId && !postId && !slug) return

  await db
    .prepare(
      `INSERT OR IGNORE INTO ai_research_links (
        resource_id, session_id, post_id, slug, role
      )
      VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(input.resourceId, sessionId, postId, slug, input.role || 'source')
    .run()
}
