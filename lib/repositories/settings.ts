import { ensureSchema, type Database } from '@/lib/repositories/schema'

type SettingValueRow = {
  key: string
  value: string | null
}

// ── 站点设置 ──
export async function getSetting(
  db: Database,
  key: string,
): Promise<string | null> {
  const settings = await getSettings(db, [key])
  return settings[key] ?? null
}

export async function getSettings(
  db: Database,
  keys: string[],
): Promise<Record<string, string | null>> {
  await ensureSchema(db)
  const uniqueKeys = Array.from(
    new Set(keys.map((key) => key.trim()).filter(Boolean)),
  )
  const values = Object.fromEntries(
    uniqueKeys.map((settingKey) => [settingKey, null]),
  ) as Record<string, string | null>

  if (uniqueKeys.length === 0) return values

  try {
    const placeholders = uniqueKeys.map(() => '?').join(', ')
    const { results } = await db
      .prepare(
        `SELECT key, value FROM site_settings WHERE key IN (${placeholders})`,
      )
      .bind(...uniqueKeys)
      .all<SettingValueRow>()

    for (const row of results) {
      values[row.key] = row.value ?? null
    }
  } catch {
    return values
  }

  return values
}

export async function setSetting(
  db: Database,
  key: string,
  value: string,
): Promise<void> {
  await ensureSchema(db)
  await db
    .prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)')
    .bind(key, value)
    .run()
}
