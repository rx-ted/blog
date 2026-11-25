import { describe, expect, it, vi } from 'vitest'
import {
  linkMediaAssetToArticle,
  listMediaAssets,
  recordAiChatToolAction,
  upsertMediaAsset,
} from '@/lib/db'

function createRecordingDb(
  options: {
    assetRow?: Record<string, unknown> | null
    listRows?: Array<Record<string, unknown>>
  } = {},
) {
  const runs: Array<{ sql: string; values: unknown[] }> = []
  const preparedSqls: string[] = []

  const db = {
    prepare: vi.fn((sql: string) => {
      preparedSqls.push(sql)
      let values: unknown[] = []
      const statement = {
        bind: vi.fn((...nextValues: unknown[]) => {
          values = nextValues
          return statement
        }),
        run: vi.fn(async () => {
          runs.push({ sql, values })
          return { meta: { last_row_id: 1 } }
        }),
        first: vi.fn(async () => {
          if (sql.includes('SELECT * FROM media_assets WHERE url = ?')) {
            return options.assetRow ?? null
          }
          return null
        }),
        all: vi.fn(async () => {
          if (sql.includes('FROM media_assets')) {
            return { results: options.listRows || [] }
          }
          return { results: [] }
        }),
      }
      return statement
    }),
  }

  return { db: db as never, runs, preparedSqls }
}

const baseAssetRow = {
  id: 1,
  type: 'image',
  source: 'ai_chat',
  r2_key: 'image/2026/05/ai.webp',
  url: '/api/images/image%2F2026%2F05%2Fai.webp',
  variants_json: JSON.stringify({ thumb: '/thumb.webp' }),
  mime_type: 'image/webp',
  size_bytes: 1234,
  width: null,
  height: null,
  alt: '配图',
  prompt: 'prompt',
  revised_prompt: 'revised',
  model: 'image-model',
  provider_name: 'profile',
  aspect_ratio: '16:9',
  resolution: '2k',
  created_at: 1710000000,
  updated_at: 1710000001,
  link_count: 2,
  current_post_link_count: 1,
  last_linked_at: 1710000002,
}

describe('media asset repository', () => {
  it('upserts image metadata and parses stored variants', async () => {
    const { db, runs } = createRecordingDb({ assetRow: baseAssetRow })

    const asset = await upsertMediaAsset(db, {
      source: 'ai_chat',
      r2Key: 'image/2026/05/ai.webp',
      url: '/api/images/image%2F2026%2F05%2Fai.webp',
      variants: { thumb: '/thumb.webp', raw: undefined },
      mimeType: 'image/webp',
      sizeBytes: 1234,
      alt: '配图',
      prompt: 'prompt',
      revisedPrompt: 'revised',
      model: 'image-model',
      providerName: 'profile',
      aspectRatio: '16:9',
      resolution: '2k',
    })

    expect(
      runs.some((item) => item.sql.includes('INSERT INTO media_assets')),
    ).toBe(true)
    expect(asset.variants).toEqual({ thumb: '/thumb.webp' })
    expect(asset.current_post_link_count).toBe(1)
  })

  it('links assets to the current article without requiring both id and slug', async () => {
    const { db, runs } = createRecordingDb()

    await linkMediaAssetToArticle(db, {
      assetId: 1,
      postId: 42,
      role: 'section',
      sectionNumber: 2,
      toolCallId: 'tool-1',
      sessionId: 'session-1',
    })

    const linkRun = runs.find((item) =>
      item.sql.includes('INSERT INTO article_asset_links'),
    )
    expect(linkRun?.values).toContain(42)
    expect(linkRun?.values).toContain('section')
    expect(linkRun?.values).toContain('tool-1')
  })

  it('builds article scoped library queries', async () => {
    const { db, preparedSqls } = createRecordingDb({ listRows: [baseAssetRow] })

    const results = await listMediaAssets(db, {
      scope: 'article',
      postId: 42,
      slug: 'hello',
    })

    expect(preparedSqls.join('\n')).toContain('EXISTS')
    expect(preparedSqls.join('\n')).toContain('article_asset_links')
    expect(results[0]?.link_count).toBe(2)
  })

  it('builds valid article scoped queries when only the post id is known', async () => {
    const { db, preparedSqls } = createRecordingDb({ listRows: [baseAssetRow] })

    await listMediaAssets(db, {
      scope: 'article',
      postId: 42,
    })

    const sql = preparedSqls.join('\n')
    expect(sql).toContain('scoped_links.post_id = ?')
    expect(sql).not.toContain('OR\n          0')
    expect(sql).not.toContain('0 THEN')
  })

  it('records AI chat tool actions idempotently by tool call id', async () => {
    const { db, runs } = createRecordingDb()

    await recordAiChatToolAction(db, {
      toolCallId: 'call-1',
      sessionId: 'session-1',
      postId: 42,
      actionType: 'insert_image',
      assetId: 1,
      status: 'success',
    })

    const actionRun = runs.find((item) =>
      item.sql.includes('INSERT INTO ai_chat_tool_actions'),
    )
    expect(actionRun?.sql).toContain('ON CONFLICT(tool_call_id)')
    expect(actionRun?.values).toContain('call-1')
    expect(actionRun?.values).toContain('insert_image')
  })
})
