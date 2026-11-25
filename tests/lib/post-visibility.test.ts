import { describe, expect, it, vi } from 'vitest'

import {
  getPostBySlug,
  isPubliclyAccessiblePost,
  isSearchIndexablePost,
  parsePostTags,
  updatePost,
  updatePostBySlug,
} from '@/lib/db'
import type { Post } from '@/lib/repositories/types'

const basePost: Post = {
  id: 1,
  slug: 'public-post',
  title: 'Public post',
  content: 'body',
  html: '<p>body</p>',
  description: 'desc',
  category: 'AI',
  tags: JSON.stringify(['AI']),
  status: 'published',
  password: null,
  is_pinned: 0,
  is_hidden: 0,
  cover_image: null,
  deleted_at: null,
  published_at: 1710000000,
  updated_at: 1710000000,
  view_count: 0,
}

function createDbReturningPost(post: Post) {
  return {
    prepare: vi.fn((sql: string) => {
      const statement = {
        bind: vi.fn(() => statement),
        run: vi.fn(async () => ({ meta: { last_row_id: post.id } })),
        first: vi.fn(async () =>
          sql.includes('SELECT * FROM posts WHERE slug = ?') ? post : null,
        ),
        all: vi.fn(async () => ({ results: [] })),
      }
      return statement
    }),
  } as never
}

function createKvReturning(value: unknown) {
  return {
    get: vi.fn(async (key: string) => {
      if (key === 'cache:version') return '1'
      if (key === 'post:public-post:v1') return value
      return null
    }),
    put: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
  }
}

function createDbWithCanonicalSlugPost(post: Post) {
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
          return { meta: { last_row_id: post.id } }
        }),
        first: vi.fn(async () => {
          if (sql.includes('WHERE slug = ?') && values[0] === post.slug) {
            if (sql.includes('SELECT id, slug, category')) {
              return { id: post.id, slug: post.slug, category: post.category }
            }
            return post
          }
          return null
        }),
        all: vi.fn(async () => {
          if (
            sql.includes('lower(slug) = lower(?)') &&
            String(values[0]).toLowerCase() === post.slug.toLowerCase()
          ) {
            if (sql.includes('SELECT id, slug, category')) {
              return {
                results: [
                  { id: post.id, slug: post.slug, category: post.category },
                ],
              }
            }
            return { results: [post] }
          }
          return { results: [] }
        }),
      }
      return statement
    }),
  }

  return { db: db as never, preparedSqls, runs }
}

function createDbWithSlugAlias(post: Post, aliasSlug: string) {
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
        run: vi.fn(async () => ({ meta: { last_row_id: post.id } })),
        first: vi.fn(async () => null),
        all: vi.fn(async () => {
          if (
            sql.includes('JOIN post_slug_aliases') &&
            String(values[0]).toLowerCase() === aliasSlug.toLowerCase()
          ) {
            return { results: [post] }
          }
          return { results: [] }
        }),
      }
      return statement
    }),
  }

  return { db: db as never, preparedSqls }
}

function createDbTrackingSlugRename(post: Post) {
  const runs: Array<{ sql: string; values: unknown[] }> = []

  const db = {
    prepare: vi.fn((sql: string) => {
      let values: unknown[] = []
      const statement = {
        bind: vi.fn((...nextValues: unknown[]) => {
          values = nextValues
          return statement
        }),
        run: vi.fn(async () => {
          runs.push({ sql, values })
          return { meta: { last_row_id: post.id } }
        }),
        first: vi.fn(async () => {
          if (
            sql.includes(
              'SELECT slug, category, deleted_at FROM posts WHERE id = ?',
            )
          ) {
            return {
              slug: post.slug,
              category: post.category,
              deleted_at: post.deleted_at,
            }
          }
          return null
        }),
        all: vi.fn(async () => ({ results: [] })),
      }
      return statement
    }),
  }

  return { db: db as never, runs }
}

describe('post visibility rules', () => {
  it('allows published unlisted posts to be opened by direct link', () => {
    expect(
      isPubliclyAccessiblePost({
        status: 'published',
        deleted_at: null,
      }),
    ).toBe(true)
  })

  it('rejects drafts and deleted posts from the public route', () => {
    expect(
      isPubliclyAccessiblePost({
        status: 'draft',
        deleted_at: null,
      }),
    ).toBe(false)

    expect(
      isPubliclyAccessiblePost({
        status: 'published',
        deleted_at: 1710000000,
      }),
    ).toBe(false)
  })

  it('keeps unlisted and encrypted posts out of search indexing', () => {
    expect(
      isSearchIndexablePost({
        status: 'published',
        password: null,
        is_hidden: 1,
        deleted_at: null,
      }),
    ).toBe(false)

    expect(
      isSearchIndexablePost({
        status: 'published',
        password: 'secret',
        is_hidden: 0,
        deleted_at: null,
      }),
    ).toBe(false)

    expect(
      isSearchIndexablePost({
        status: 'published',
        password: null,
        is_hidden: 0,
        deleted_at: null,
      }),
    ).toBe(true)
  })

  it('tolerates malformed tag JSON from legacy rows', () => {
    expect(parsePostTags('["AI"," 写作 ",""]')).toEqual(['AI', '写作'])
    expect(parsePostTags('not-json')).toEqual([])
    expect(parsePostTags('{"tag":"AI"}')).toEqual([])
  })

  it('does not trust private entries from the public KV post cache', async () => {
    const kv = createKvReturning({
      ...basePost,
      title: 'Cached private post',
      password: 'secret',
      tags: ['AI'],
    })
    const db = createDbReturningPost({
      ...basePost,
      title: 'Fresh public post',
    })

    const post = await getPostBySlug(db, 'public-post', kv as never)

    expect(post?.title).toBe('Fresh public post')
  })

  it('does not write password-protected posts into the public KV post cache', async () => {
    const kv = createKvReturning(null)
    const db = createDbReturningPost({
      ...basePost,
      password: 'secret',
    })

    const post = await getPostBySlug(db, 'public-post', kv as never)

    expect(post?.password).toBe('secret')
    expect(kv.put).not.toHaveBeenCalled()
  })

  it('finds canonical slugs when callers still use an older mixed-case slug', async () => {
    const { db, preparedSqls } = createDbWithCanonicalSlugPost({
      ...basePost,
      slug: '2026-05-02-ez83cg',
    })

    const post = await getPostBySlug(db, '2026-05-02-EZ83Cg')

    expect(post?.slug).toBe('2026-05-02-ez83cg')
    expect(preparedSqls).toContain(
      'SELECT * FROM posts WHERE lower(slug) = lower(?) LIMIT 2',
    )
  })

  it('autosaves through the canonical post row when current_slug casing is stale', async () => {
    const { db, runs } = createDbWithCanonicalSlugPost({
      ...basePost,
      id: 99,
      slug: '2026-05-02-ez83cg',
    })

    await updatePostBySlug(db, '2026-05-02-EZ83Cg', { title: '更新后的标题' })

    expect(runs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sql: expect.stringContaining('UPDATE posts SET title = ?'),
          values: ['更新后的标题', 99],
        }),
      ]),
    )
  })

  it('finds a post through a remembered slug alias', async () => {
    const { db, preparedSqls } = createDbWithSlugAlias(
      {
        ...basePost,
        id: 100,
        slug: 'why-effort-isnt-enough',
      },
      '2026-05-02-dh5wth',
    )

    const post = await getPostBySlug(db, '2026-05-02-dh5wth')

    expect(post?.slug).toBe('why-effort-isnt-enough')
    expect(
      preparedSqls.some((sql) => sql.includes('JOIN post_slug_aliases')),
    ).toBe(true)
  })

  it('records the old slug as an alias when a post slug is renamed by id', async () => {
    const { db, runs } = createDbTrackingSlugRename({
      ...basePost,
      id: 100,
      slug: '2026-05-02-dh5wth',
    })

    await updatePost(db, 100, { slug: 'why-effort-isnt-enough' })

    expect(runs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sql: expect.stringContaining('INSERT INTO post_slug_aliases'),
          values: ['2026-05-02-dh5wth', 100, 'why-effort-isnt-enough'],
        }),
      ]),
    )
  })
})
