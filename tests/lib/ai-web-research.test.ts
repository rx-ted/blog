import { describe, expect, it, vi } from 'vitest'

import { fetchPageMarkdown, searchWeb } from '@/lib/ai-web-research'

describe('ai web research helpers', () => {
  it('returns a clear error when web research is disabled', async () => {
    const fetcher = vi.fn()

    const result = await searchWeb({
      query: 'agent skills',
      env: {},
      fetcher: fetcher as unknown as typeof fetch,
    })

    expect(result).toEqual({
      status: 'error',
      query: 'agent skills',
      results: [],
      error: '网页研究能力未开启',
    })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('normalizes PipeLLM search results and clamps limit', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            organic: [
              {
                title: 'One',
                link: 'https://example.com/one',
                snippet: 'First',
              },
              {
                title: 'Two',
                url: 'https://example.com/two',
                description: 'Second',
              },
            ],
          },
        }),
      ),
    )

    const result = await searchWeb({
      query: '  OpenAI skills  ',
      limit: 50,
      env: {
        ENABLE_AI_WEB_RESEARCH: 'true',
        PIPELLM_API_KEY: 'pipe-test-key',
      },
      fetcher: fetcher as unknown as typeof fetch,
    })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(String(fetcher.mock.calls[0]?.[0])).toContain('limit=10')
    expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer pipe-test-key',
    })
    expect(result).toEqual({
      status: 'success',
      query: 'OpenAI skills',
      results: [
        { title: 'One', url: 'https://example.com/one', snippet: 'First' },
        { title: 'Two', url: 'https://example.com/two', snippet: 'Second' },
      ],
    })
  })

  it('rejects private URLs before fetching markdown', async () => {
    const fetcher = vi.fn()

    const result = await fetchPageMarkdown({
      url: 'http://127.0.0.1/dashboard',
      env: { ENABLE_AI_WEB_RESEARCH: 'true' },
      fetcher: fetcher as unknown as typeof fetch,
    })

    expect(result).toEqual({
      status: 'error',
      url: 'http://127.0.0.1/dashboard',
      error: '不允许抓取内网地址',
    })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('uses Jina markdown when the first proxy succeeds', async () => {
    const markdown = [
      '# Test Article',
      '',
      'This is a useful article.',
      '',
      'It has enough lines.',
      'Line six.',
      'Line seven.',
      'Line eight.',
    ].join('\n')
    const fetcher = vi.fn().mockResolvedValue(new Response(markdown))

    const result = await fetchPageMarkdown({
      url: 'https://example.com/article',
      maxChars: 5000,
      env: { ENABLE_AI_WEB_RESEARCH: 'true' },
      fetcher: fetcher as unknown as typeof fetch,
    })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      'https://r.jina.ai/https://example.com/article',
    )
    expect(result).toMatchObject({
      status: 'success',
      url: 'https://example.com/article',
      title: 'Test Article',
      markdown,
      source: 'jina',
      truncated: false,
    })
  })

  it('falls back to Defuddle and truncates long markdown', async () => {
    const longMarkdown = `# Defuddle Article\n\n${'素材内容\n'.repeat(2000)}`
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response('Access Denied'))
      .mockResolvedValueOnce(new Response(longMarkdown))

    const result = await fetchPageMarkdown({
      url: 'https://example.com/article',
      maxChars: 1200,
      env: { ENABLE_AI_WEB_RESEARCH: 'true' },
      fetcher: fetcher as unknown as typeof fetch,
    })

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(String(fetcher.mock.calls[1]?.[0])).toBe(
      'https://defuddle.md/https://example.com/article',
    )
    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.source).toBe('defuddle')
      expect(result.markdown.length).toBeLessThanOrEqual(1200)
      expect(result.truncated).toBe(true)
    }
  })

  it('falls back to curl.md when earlier markdown proxies fail', async () => {
    const curlMarkdown = [
      '---',
      'title: The Shape of the Essay Field',
      'url: https://www.paulgraham.com/field.html',
      'site: Paul Graham',
      '---',
      '',
      '# The Shape of the Essay Field',
      '',
      'This is a readable article body from curl.md.',
      '',
      'It has enough substance to use as writing material.',
    ].join('\n')
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response('Access Denied'))
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockResolvedValueOnce(new Response(curlMarkdown))

    const result = await fetchPageMarkdown({
      url: 'https://www.paulgraham.com/field.html',
      env: { ENABLE_AI_WEB_RESEARCH: 'true' },
      fetcher: fetcher as unknown as typeof fetch,
    })

    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      'https://r.jina.ai/https://www.paulgraham.com/field.html',
    )
    expect(String(fetcher.mock.calls[1]?.[0])).toBe(
      'https://defuddle.md/https://www.paulgraham.com/field.html',
    )
    expect(String(fetcher.mock.calls[2]?.[0])).toBe(
      'https://curl.md/https://www.paulgraham.com/field.html',
    )
    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.source).toBe('curlmd')
      expect(result.title).toBe('The Shape of the Essay Field')
      expect(result.markdown).toBe(curlMarkdown)
    }
  })

  it('uses FXTwitter first for X status URLs', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: 200,
          tweet: {
            url: 'https://x.com/yangyi/status/2048212793116201138',
            text: 'https://t.co/KXR0QAH2UD',
            author: {
              name: 'Yangyi',
              screen_name: 'yangyi',
            },
            raw_text: {
              text: '完整推文文本 https://t.co/KXR0QAH2UD',
            },
            likes: 136,
            retweets: 23,
            replies: 20,
            bookmarks: 296,
            views: 49958,
            created_at: 'Sun Apr 26 01:29:18 +0000 2026',
            article: {
              title: 'Agent IM与Agent OS | AI时代的流量入口',
              preview_text: 'Agent IM的思考起源',
              content: {
                blocks: [
                  { type: 'header-one', text: 'Agent IM的思考起源' },
                  {
                    type: 'unstyled',
                    text: '从25年4月我就一直在思考一个以task来驱动的人与Agent进行通讯的IM形态',
                  },
                  { type: 'unstyled', text: '这个形态类似Telegram' },
                  {
                    type: 'unstyled',
                    text: '在这个Telegram中，人和人，人和Agent，Agent和Agent，都应该可以进行相互通讯',
                  },
                ],
              },
            },
          },
        }),
      ),
    )

    const result = await fetchPageMarkdown({
      url: 'https://x.com/yangyi/status/2048212793116201138',
      env: { ENABLE_AI_WEB_RESEARCH: 'true' },
      fetcher: fetcher as unknown as typeof fetch,
    })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      'https://api.fxtwitter.com/yangyi/status/2048212793116201138',
    )
    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.source).toBe('fxtwitter')
      expect(result.title).toBe('Agent IM与Agent OS | AI时代的流量入口')
      expect(result.markdown).toContain('## Tweet')
      expect(result.markdown).toContain('完整推文文本 https://t.co/KXR0QAH2UD')
      expect(result.markdown).toContain('## Article Content')
      expect(result.markdown).toContain('# Agent IM的思考起源')
      expect(result.markdown).toContain('Stats: views: 49958')
    }
  })

  it('falls back to markdown proxies when X-specific APIs fail', async () => {
    const defuddleMarkdown = [
      '---',
      'title: "Post by @vista8 on X"',
      'author: "@vista8"',
      'site: "X (Twitter)"',
      '---',
      '',
      '昨晚上偶然测了 @Ethan_Yang_AI 团队开发的knowly。',
      '',
      '试着解读Youtube视频和arXiv论文，效果惊艳。',
    ].join('\n')
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response('not found', { status: 404 }))
      .mockResolvedValueOnce(new Response('not found', { status: 404 }))
      .mockResolvedValueOnce(
        new Response(
          'Don’t miss what’s happening\n\nPeople on X are the first to know.',
        ),
      )
      .mockResolvedValueOnce(new Response(defuddleMarkdown))

    const result = await fetchPageMarkdown({
      url: 'https://x.com/vista8/status/2054593456547438613',
      env: { ENABLE_AI_WEB_RESEARCH: 'true' },
      fetcher: fetcher as unknown as typeof fetch,
    })

    expect(fetcher).toHaveBeenCalledTimes(4)
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      'https://api.fxtwitter.com/vista8/status/2054593456547438613',
    )
    expect(String(fetcher.mock.calls[1]?.[0])).toBe(
      'https://api.vxtwitter.com/vista8/status/2054593456547438613',
    )
    expect(String(fetcher.mock.calls[2]?.[0])).toBe(
      'https://r.jina.ai/https://x.com/vista8/status/2054593456547438613',
    )
    expect(String(fetcher.mock.calls[3]?.[0])).toBe(
      'https://defuddle.md/https://x.com/vista8/status/2054593456547438613',
    )
    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.source).toBe('defuddle')
      expect(result.markdown).toContain('knowly')
    }
  })
})
