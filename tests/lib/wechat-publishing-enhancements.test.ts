import { afterEach, describe, expect, it } from 'vitest'
import { DOMParser } from 'linkedom'
import {
  normalizeWechatExternalLinkFootnotes,
  normalizeWechatVideoPlaceholders,
} from '@/lib/wechat-publishing-enhancements'

const originalDocument = globalThis.Document
const originalNode = globalThis.Node

function parseBody(html: string) {
  const doc = new DOMParser().parseFromString(
    `<html><body>${html}</body></html>`,
    'text/html',
  )
  globalThis.Document = doc.defaultView.Document
  globalThis.Node = doc.defaultView.Node
  return doc.body
}

describe('wechat publishing enhancements', () => {
  afterEach(() => {
    if (originalDocument) {
      globalThis.Document = originalDocument
    } else {
      Reflect.deleteProperty(globalThis, 'Document')
    }

    if (originalNode) {
      globalThis.Node = originalNode
    } else {
      Reflect.deleteProperty(globalThis, 'Node')
    }
  })

  it('collects external links as plain reference URLs without inline markers', () => {
    const body = parseBody(`
      <p>正文<a href="https://example.com/a">示例文章</a>和<a href="https://blog.19981204.xyz/about">站内链接</a>。</p>
      <p>重复<a href="https://example.com/a">另一处</a>。</p>
      <figure><a href="https://example.com/image-source">图片来源</a></figure>
    `)

    normalizeWechatExternalLinkFootnotes(body, 'https://blog.19981204.xyz')

    expect(body.querySelectorAll('sup.wechat-link-ref')).toHaveLength(0)

    const items = Array.from(
      body.querySelectorAll('.wechat-link-reference-item'),
    )
    expect(items).toHaveLength(1)
    expect(
      items[0].querySelector('.wechat-link-reference-number')?.textContent,
    ).toBe('[1]')
    expect(
      items[0].querySelector('.wechat-link-reference-text')?.textContent,
    ).toBe('https://example.com/a')
    expect(items[0].textContent).not.toContain('示例文章')
    expect(items[0].querySelector('a')).toBeNull()
  })

  it('removes stale inline markers and old reference blocks before rebuilding references', () => {
    const body = parseBody(`
      <p>旧正文<a href="https://example.com/new">新链接</a><sup class="wechat-link-ref">[9]</sup></p>
      <section class="wechat-link-references"><p>[9] https://old.example.com</p></section>
    `)

    normalizeWechatExternalLinkFootnotes(body, 'https://blog.19981204.xyz')

    expect(body.querySelectorAll('sup.wechat-link-ref')).toHaveLength(0)
    expect(body.querySelectorAll('.wechat-link-references')).toHaveLength(1)
    expect(body.querySelector('.wechat-link-reference-text')?.textContent).toBe(
      'https://example.com/new',
    )
    expect(body.textContent).not.toContain('old.example.com')
  })

  it('replaces video nodes and escaped mp4 blocks with manual insertion markers', () => {
    const body = parseBody(`
      <video src="/api/images/video/fallback.mp4" title="德州.mp4"></video>
      <video src="https://cdn.example.com/CleanShot%202026-09-02.mp4?download=1"></video>
      <p>\\[德州\\.mp4\\]</p>
      <p>\\[CleanShot 2026\\-09\\-02 at 23\\.05\\.40\\.mp4\\]</p>
      <p>[演示.mov]</p>
      <p>[附件.pdf]</p>
      <pre><code>\\[代码示例\\.mp4\\]</code></pre>
    `)

    normalizeWechatVideoPlaceholders(body)

    expect(body.querySelector('video')).toBeNull()
    expect(
      Array.from(body.querySelectorAll('[data-wechat-video-placeholder]')).map(
        (node) => node.textContent,
      ),
    ).toEqual([
      '【插入视频：德州.mp4】',
      '【插入视频：CleanShot 2026-09-02.mp4】',
      '【插入视频：德州.mp4】',
      '【插入视频：CleanShot 2026-09-02 at 23.05.40.mp4】',
      '【插入视频：演示.mov】',
    ])
    expect(body.textContent).toContain('[附件.pdf]')
    expect(body.querySelector('code')?.textContent).toBe('\\[代码示例\\.mp4\\]')
  })
})
