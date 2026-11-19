import { describe, expect, it } from 'vitest'
import { rewriteWechatExportImageUrl } from '@/lib/wechat-export-images'

describe('wechat export image helpers', () => {
  it('rewrites stored article images to WeChat-friendly JPEG variants', () => {
    expect(rewriteWechatExportImageUrl('/api/images/image/a.webp?foo=1', 'https://blog.19981204.xyz', 'content'))
      .toBe('https://blog.19981204.xyz/api/images/image/a.webp?foo=1&w=1280&q=82&format=jpeg')
  })

  it('rewrites cover images to cropped JPEG variants', () => {
    expect(rewriteWechatExportImageUrl('/api/images/image/a.webp', 'https://blog.19981204.xyz', 'cover'))
      .toBe('https://blog.19981204.xyz/api/images/image/a.webp?w=1280&h=720&fit=cover&q=92&format=jpeg')
  })

  it('leaves external image URLs unchanged except for URL normalization', () => {
    expect(rewriteWechatExportImageUrl('https://example.com/a.png', 'https://blog.19981204.xyz', 'content'))
      .toBe('https://example.com/a.png')
  })
})
