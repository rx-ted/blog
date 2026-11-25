import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Cloudflare static asset cache headers', () => {
  it('caches content-hashed assets without caching editor documents or APIs', () => {
    const headers = readFileSync('public/_headers', 'utf8')
    const rules = headers
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('/'))
    expect(rules).toEqual(['/_next/static/*'])
    expect(headers).toMatch(
      /Cache-Control: public, max-age=31536000, immutable/,
    )
    for (const path of [
      '/editor',
      '/dashboard',
      '/api/posts',
      '/manifest.json',
      '/images/post.png',
    ]) {
      expect(rules.some((rule) => path.startsWith(rule.slice(0, -1)))).toBe(
        false,
      )
    }
  })
})
