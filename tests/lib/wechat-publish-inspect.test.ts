import { describe, expect, it } from 'vitest'
import {
  getBlockingWechatPublishChecks,
  inspectWechatPublishInput,
} from '@/lib/wechat-publish-inspect'

describe('wechat publish inspect', () => {
  it('returns machine-readable checks and readiness', () => {
    const inspect = inspectWechatPublishInput({
      accountId: '',
      title: '题'.repeat(65),
      normalizedTitle: '题'.repeat(64),
      author: '作'.repeat(20),
      normalizedAuthor: '作'.repeat(16),
      digest: '摘'.repeat(140),
      normalizedDigest: '摘'.repeat(40),
      contentHtml: '<h1>题题</h1><ul><li>Item</li></ul>',
      coverImageUrl: '',
      resolvedCoverImageUrl:
        'https://blog.19981204.xyz/default-covers/qm-cover-1.jpg',
    })

    expect(inspect.checks.map((check) => check.code)).toEqual(
      expect.arrayContaining([
        'MISSING_ACCOUNT',
        'TITLE_TOO_LONG',
        'AUTHOR_TOO_LONG',
        'DIGEST_TOO_LONG',
        'LIST_MARKERS_MISSING',
        'COVER_FALLBACK_DEFAULT',
      ]),
    )
    expect(
      inspect.checks.find((check) => check.code === 'TITLE_TOO_LONG'),
    ).toMatchObject({
      level: 'error',
      message: expect.stringContaining('微信草稿 API'),
    })
    expect(inspect.readiness.draft_ready).toBe(false)
    expect(inspect.readiness.preview_fidelity).toBe('degraded')
  })

  it('blocks inline data URL images', () => {
    const inspect = inspectWechatPublishInput({
      accountId: 'main',
      title: 'Title',
      normalizedTitle: 'Title',
      contentHtml: '<p>Hello</p><img src="data:image/png;base64,abc">',
      resolvedCoverImageUrl: 'https://example.com/cover.jpg',
    })

    expect(inspect.checks.map((check) => check.code)).toContain(
      'DATA_URL_IMAGE',
    )
    expect(
      getBlockingWechatPublishChecks(inspect.checks).map((check) => check.code),
    ).toEqual(['DATA_URL_IMAGE'])
    expect(inspect.readiness.upload_ready).toBe(false)
  })

  it('warns when many images may make WeChat upload slow', () => {
    const contentHtml = Array.from(
      { length: 12 },
      (_, index) => `<img src="https://example.com/${index}.jpg">`,
    ).join('')

    const inspect = inspectWechatPublishInput({
      accountId: 'main',
      title: 'Title',
      normalizedTitle: 'Title',
      contentHtml,
      resolvedCoverImageUrl: 'https://example.com/cover.jpg',
    })

    expect(inspect.summary.image_count).toBe(12)
    expect(inspect.checks.map((check) => check.code)).toContain(
      'IMAGE_TIMEOUT_RISK',
    )
    expect(inspect.readiness.draft_ready).toBe(true)
  })

  it('does not count stylesheet marker selectors as rendered list markers', () => {
    const inspect = inspectWechatPublishInput({
      accountId: 'main',
      title: 'Title',
      normalizedTitle: 'Title',
      contentHtml:
        '<style>.wechat-list-marker{display:inline}</style><ul><li>Item</li></ul>',
      resolvedCoverImageUrl: 'https://example.com/cover.jpg',
    })

    expect(inspect.checks.map((check) => check.code)).toContain(
      'LIST_MARKERS_MISSING',
    )
  })
})
