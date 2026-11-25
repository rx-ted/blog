import { describe, expect, it, vi } from 'vitest'

function createSchemaDb() {
  const runs: string[] = []
  const db = {
    prepare: vi.fn((sql: string) => {
      const statement = {
        run: vi.fn(async () => {
          await new Promise((resolve) => setTimeout(resolve, 1))
          runs.push(sql)
          return {}
        }),
      }
      return statement
    }),
  }

  return { db: db as never, runs }
}

describe('ensureSchema', () => {
  it('shares one schema initialization across concurrent callers', async () => {
    vi.resetModules()
    const { ensureSchema } = await import('@/lib/repositories/schema')
    const { db, runs } = createSchemaDb()

    await Promise.all([ensureSchema(db), ensureSchema(db), ensureSchema(db)])

    const passwordColumnRuns = () =>
      runs.filter((sql) => sql === 'ALTER TABLE posts ADD COLUMN password TEXT')
    expect(passwordColumnRuns()).toHaveLength(1)

    await ensureSchema(db)
    expect(passwordColumnRuns()).toHaveLength(1)
  })
})
