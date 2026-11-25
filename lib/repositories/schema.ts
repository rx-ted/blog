export type Database = D1Database

// 获取数据库实例（从 Cloudflare Workers 环境）
export function getDB(env: CloudflareEnv) {
  return env.DB
}

// 自动迁移：确保所有表和列存在
// 注意：在 Cloudflare Workers 无状态环境中，进程级标志无效
// 最佳实践：通过 wrangler d1 migrations 管理 schema
// 使用全局标志避免重复执行
let schemaInitialized = false
let schemaInitializationPromise: Promise<void> | null = null

export async function ensureSchema(db: Database) {
  if (schemaInitialized) return
  if (schemaInitializationPromise) {
    await schemaInitializationPromise
    return
  }

  schemaInitializationPromise = runSchemaMigrations(db).finally(() => {
    schemaInitializationPromise = null
  })

  await schemaInitializationPromise
}

async function runSchemaMigrations(db: Database) {
  try {
    // 安全地添加新列（ALTER TABLE ADD COLUMN 在列已存在时会报错，所以需要 try/catch）
    const columnMigrations = [
      'ALTER TABLE posts ADD COLUMN password TEXT',
      'ALTER TABLE posts ADD COLUMN is_pinned INTEGER DEFAULT 0',
      'ALTER TABLE posts ADD COLUMN is_hidden INTEGER DEFAULT 0',
      'ALTER TABLE posts ADD COLUMN deleted_at INTEGER',
      'ALTER TABLE posts ADD COLUMN cover_image TEXT',
    ]
    for (const sql of columnMigrations) {
      try {
        await db.prepare(sql).run()
      } catch {
        // column already exists
      }
    }
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS post_slug_aliases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          alias_slug TEXT UNIQUE NOT NULL,
          post_id INTEGER NOT NULL,
          canonical_slug TEXT NOT NULL,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        )`,
      )
      .run()
    await db
      .prepare(
        'CREATE INDEX IF NOT EXISTS idx_post_slug_aliases_post_id ON post_slug_aliases(post_id)',
      )
      .run()
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS media_assets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL DEFAULT 'image',
          source TEXT NOT NULL DEFAULT 'upload',
          r2_key TEXT,
          url TEXT NOT NULL UNIQUE,
          variants_json TEXT,
          mime_type TEXT,
          size_bytes INTEGER,
          width INTEGER,
          height INTEGER,
          alt TEXT,
          prompt TEXT,
          revised_prompt TEXT,
          model TEXT,
          provider_name TEXT,
          aspect_ratio TEXT,
          resolution TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        )`,
      )
      .run()
    await db
      .prepare(
        'CREATE INDEX IF NOT EXISTS idx_media_assets_type_created ON media_assets(type, created_at DESC)',
      )
      .run()
    await db
      .prepare(
        'CREATE INDEX IF NOT EXISTS idx_media_assets_source_created ON media_assets(source, created_at DESC)',
      )
      .run()
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS article_asset_links (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          asset_id INTEGER NOT NULL,
          post_id INTEGER,
          slug TEXT,
          role TEXT NOT NULL DEFAULT 'inline',
          section_title TEXT,
          section_number INTEGER,
          inserted_at INTEGER DEFAULT (strftime('%s', 'now')),
          tool_call_id TEXT,
          session_id TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY (asset_id) REFERENCES media_assets(id) ON DELETE CASCADE,
          FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL
        )`,
      )
      .run()
    await db
      .prepare(
        'CREATE INDEX IF NOT EXISTS idx_article_asset_links_asset_id ON article_asset_links(asset_id)',
      )
      .run()
    await db
      .prepare(
        'CREATE INDEX IF NOT EXISTS idx_article_asset_links_post_id ON article_asset_links(post_id, inserted_at DESC)',
      )
      .run()
    await db
      .prepare(
        'CREATE INDEX IF NOT EXISTS idx_article_asset_links_slug ON article_asset_links(slug, inserted_at DESC)',
      )
      .run()
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS ai_chat_tool_actions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tool_call_id TEXT NOT NULL UNIQUE,
          session_id TEXT,
          post_id INTEGER,
          slug TEXT,
          action_type TEXT NOT NULL,
          asset_id INTEGER,
          status TEXT NOT NULL DEFAULT 'success',
          error_message TEXT,
          applied_at INTEGER DEFAULT (strftime('%s', 'now')),
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY (asset_id) REFERENCES media_assets(id) ON DELETE SET NULL,
          FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL
        )`,
      )
      .run()
    await db
      .prepare(
        'CREATE INDEX IF NOT EXISTS idx_ai_chat_tool_actions_session ON ai_chat_tool_actions(session_id, applied_at DESC)',
      )
      .run()
    await db
      .prepare(
        'CREATE INDEX IF NOT EXISTS idx_ai_chat_tool_actions_post_id ON ai_chat_tool_actions(post_id, applied_at DESC)',
      )
      .run()
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS ai_research_resources (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_type TEXT NOT NULL,
          url TEXT NOT NULL,
          canonical_url TEXT NOT NULL UNIQUE,
          platform TEXT NOT NULL DEFAULT '',
          provider TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'pending',
          title TEXT NOT NULL DEFAULT '',
          summary TEXT NOT NULL DEFAULT '',
          excerpt TEXT NOT NULL DEFAULT '',
          content_text TEXT NOT NULL DEFAULT '',
          content_r2_key TEXT,
          content_hash TEXT NOT NULL DEFAULT '',
          error_message TEXT NOT NULL DEFAULT '',
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        )`,
      )
      .run()
    await db
      .prepare(
        'CREATE INDEX IF NOT EXISTS idx_ai_research_resources_type_status ON ai_research_resources(source_type, status, updated_at DESC)',
      )
      .run()
    await db
      .prepare(
        'CREATE INDEX IF NOT EXISTS idx_ai_research_resources_platform ON ai_research_resources(platform, updated_at DESC)',
      )
      .run()
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS ai_research_jobs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          resource_id INTEGER NOT NULL,
          provider TEXT NOT NULL,
          provider_task_id TEXT,
          provider_note_id TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          raw_status TEXT NOT NULL DEFAULT '',
          error_message TEXT NOT NULL DEFAULT '',
          last_polled_at INTEGER,
          next_poll_at INTEGER,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY (resource_id) REFERENCES ai_research_resources(id) ON DELETE CASCADE
        )`,
      )
      .run()
    await db
      .prepare(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_research_jobs_provider_task ON ai_research_jobs(provider, provider_task_id) WHERE provider_task_id IS NOT NULL',
      )
      .run()
    await db
      .prepare(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_research_jobs_provider_note ON ai_research_jobs(provider, provider_note_id) WHERE provider_note_id IS NOT NULL',
      )
      .run()
    await db
      .prepare(
        'CREATE INDEX IF NOT EXISTS idx_ai_research_jobs_resource ON ai_research_jobs(resource_id, updated_at DESC)',
      )
      .run()
    await db
      .prepare(
        'CREATE INDEX IF NOT EXISTS idx_ai_research_jobs_status_poll ON ai_research_jobs(status, next_poll_at)',
      )
      .run()
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS ai_research_links (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          resource_id INTEGER NOT NULL,
          session_id TEXT,
          post_id INTEGER,
          slug TEXT,
          role TEXT NOT NULL DEFAULT 'source',
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY (resource_id) REFERENCES ai_research_resources(id) ON DELETE CASCADE,
          FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL
        )`,
      )
      .run()
    await db
      .prepare(
        'CREATE INDEX IF NOT EXISTS idx_ai_research_links_session ON ai_research_links(session_id, created_at DESC)',
      )
      .run()
    await db
      .prepare(
        'CREATE INDEX IF NOT EXISTS idx_ai_research_links_post ON ai_research_links(post_id, created_at DESC)',
      )
      .run()
    await db
      .prepare(
        'CREATE INDEX IF NOT EXISTS idx_ai_research_links_slug ON ai_research_links(slug, created_at DESC)',
      )
      .run()
    await db
      .prepare(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_research_links_unique ON ai_research_links(
          resource_id,
          COALESCE(session_id, ''),
          COALESCE(post_id, 0),
          COALESCE(slug, ''),
          role
        )`,
      )
      .run()
    schemaInitialized = true
  } catch (error: unknown) {
    console.error('Schema migration failed:', error)
  }
}
