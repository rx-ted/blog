import { describe, expect, it, vi } from 'vitest'

import {
  detectTranscriptPlatform,
  fetchTranscript,
  isSupportedTranscriptUrl,
} from '@/lib/ai-transcript-research'

describe('ai transcript research helpers', () => {
  it('detects supported transcript platforms', () => {
    expect(
      detectTranscriptPlatform('https://www.xiaoyuzhoufm.com/episode/abc'),
    ).toBe('xiaoyuzhou')
    expect(detectTranscriptPlatform('https://youtu.be/video-id')).toBe(
      'youtube',
    )
    expect(
      detectTranscriptPlatform('https://www.bilibili.com/video/BV123'),
    ).toBe('bilibili')
    expect(detectTranscriptPlatform('https://example.com/post')).toBe('unknown')
    expect(
      isSupportedTranscriptUrl('https://www.youtube.com/watch?v=abc'),
    ).toBe(true)
    expect(isSupportedTranscriptUrl('https://example.com/post')).toBe(false)
  })

  it('returns a clear error when transcript research is disabled', async () => {
    const fetcher = vi.fn()

    const result = await fetchTranscript({
      url: 'https://youtu.be/video-id',
      env: {},
      fetcher: fetcher as unknown as typeof fetch,
    })

    expect(result).toEqual({
      status: 'error',
      url: 'https://youtu.be/video-id',
      platform: 'youtube',
      error: '音视频文字稿能力未开启',
    })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('creates a GetNote link note and reads the full web transcript', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              tasks: [{ task_id: 'task-1' }],
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              status: 'success',
              note_id: 'note-1',
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              note: {
                title: '官方总结标题',
                content: 'Get笔记官方总结',
                web_page: {
                  url: 'https://www.xiaoyuzhoufm.com/episode/abc',
                  content: '[00:00:01] OpenAPI 转写',
                },
              },
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            h: { c: 0 },
            c: {
              title: 'AI 生成标题',
              web_title: '原始节目标题',
              url: 'https://www.xiaoyuzhoufm.com/episode/abc',
              content: '[00:00:01] 开场内容\n\n[00:00:08] 深入讨论',
            },
          }),
        ),
      )

    const result = await fetchTranscript({
      url: 'https://www.xiaoyuzhoufm.com/episode/abc',
      maxChars: 5000,
      maxWaitSeconds: 1,
      pollIntervalMs: 0,
      env: {
        ENABLE_AI_TRANSCRIPT_RESEARCH: 'true',
        GETNOTE_API_KEY: 'gk_live_test.secret',
        GETNOTE_CLIENT_ID: 'cli_test',
        GETNOTE_WEB_TOKEN: 'jwt-token',
      },
      fetcher: fetcher as unknown as typeof fetch,
    })

    expect(fetcher).toHaveBeenCalledTimes(4)
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      'https://openapi.biji.com/open/api/v1/resource/note/save',
    )
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'gk_live_test.secret',
        'X-Client-ID': 'cli_test',
      }),
      body: JSON.stringify({
        note_type: 'link',
        link_url: 'https://www.xiaoyuzhoufm.com/episode/abc',
      }),
    })
    expect(String(fetcher.mock.calls[1]?.[0])).toBe(
      'https://openapi.biji.com/open/api/v1/resource/note/task/progress',
    )
    expect(String(fetcher.mock.calls[2]?.[0])).toBe(
      'https://openapi.biji.com/open/api/v1/resource/note/detail?id=note-1',
    )
    expect(String(fetcher.mock.calls[3]?.[0])).toBe(
      'https://get-notes.luojilab.com/voicenotes/web/notes/note-1/links/detail',
    )
    expect(result).toEqual(
      expect.objectContaining({
        status: 'success',
        url: 'https://www.xiaoyuzhoufm.com/episode/abc',
        noteId: 'note-1',
        taskId: 'task-1',
        title: 'AI 生成标题',
        originalTitle: '原始节目标题',
        platform: 'xiaoyuzhou',
        summary: 'Get笔记官方总结',
        transcript: '[00:00:01] 开场内容\n\n[00:00:08] 深入讨论',
        source: 'getnote-web',
        truncated: false,
      }),
    )
  })

  it('uses noteId from a processing task to fetch summary and transcript immediately', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              tasks: [{ task_id: 'task-processing' }],
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              status: 'processing',
              note_id: 'note-processing',
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              note: {
                title: '理想汽车范皓宇深度访谈',
                content: '### 官方总结\n\n产品哲学与组织进化。',
                web_page: {
                  url: 'https://www.xiaoyuzhoufm.com/episode/68e8a8fd525f51df3895a239',
                  content: '[00:00:00]完整转写第一段',
                },
              },
            },
          }),
        ),
      )

    const result = await fetchTranscript({
      url: 'https://www.xiaoyuzhoufm.com/episode/68e8a8fd525f51df3895a239',
      maxWaitSeconds: 1,
      pollIntervalMs: 0,
      env: {
        ENABLE_AI_TRANSCRIPT_RESEARCH: 'true',
        GETNOTE_API_KEY: 'gk_live_test.secret',
        GETNOTE_CLIENT_ID: 'cli_test',
      },
      fetcher: fetcher as unknown as typeof fetch,
    })

    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(String(fetcher.mock.calls[1]?.[0])).toBe(
      'https://openapi.biji.com/open/api/v1/resource/note/task/progress',
    )
    expect(String(fetcher.mock.calls[2]?.[0])).toBe(
      'https://openapi.biji.com/open/api/v1/resource/note/detail?id=note-processing',
    )
    expect(result).toEqual(
      expect.objectContaining({
        status: 'success',
        noteId: 'note-processing',
        taskId: 'task-processing',
        title: '理想汽车范皓宇深度访谈',
        summary: '### 官方总结\n\n产品哲学与组织进化。',
        transcript: '[00:00:00]完整转写第一段',
        source: 'getnote-openapi',
      }),
    )
  })

  it('uses finalUrl from note detail when continuing with noteId only', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            note: {
              title: 'YouTube Summary',
              content: '官方摘要',
              web_page: {
                url: 'https://www.youtube.com/watch?v=abc123',
                content: '完整转写',
              },
            },
          },
        }),
      ),
    )

    const result = await fetchTranscript({
      noteId: 'note-only',
      env: {
        ENABLE_AI_TRANSCRIPT_RESEARCH: 'true',
        GETNOTE_API_KEY: 'gk_live_test.secret',
        GETNOTE_CLIENT_ID: 'cli_test',
      },
      fetcher: fetcher as unknown as typeof fetch,
    })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(result).toEqual(
      expect.objectContaining({
        status: 'success',
        url: 'https://www.youtube.com/watch?v=abc123',
        noteId: 'note-only',
        platform: 'youtube',
        summary: '官方摘要',
        transcript: '完整转写',
      }),
    )
  })

  it('falls back to OpenAPI note detail when web transcript token is unavailable', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              id: 'note-2',
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              note: {
                title: 'YouTube 笔记',
                audio: {
                  transcript: '字幕正文',
                },
              },
            },
          }),
        ),
      )

    const result = await fetchTranscript({
      url: 'https://www.youtube.com/watch?v=abc',
      env: {
        ENABLE_AI_TRANSCRIPT_RESEARCH: 'true',
        GETNOTE_API_KEY: 'gk_live_test.secret',
        GETNOTE_CLIENT_ID: 'cli_test',
      },
      fetcher: fetcher as unknown as typeof fetch,
    })

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(String(fetcher.mock.calls[1]?.[0])).toBe(
      'https://openapi.biji.com/open/api/v1/resource/note/detail?id=note-2',
    )
    expect(result).toEqual(
      expect.objectContaining({
        status: 'success',
        title: 'YouTube 笔记',
        platform: 'youtube',
        transcript: '字幕正文',
        source: 'getnote-openapi',
      }),
    )
  })

  it('returns OpenAPI summary when GetNote web token refresh fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              id: 'note-refresh-failed',
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              note: {
                title: '官方笔记标题',
                content: 'Get笔记官方总结正文',
                web_page: {
                  url: 'https://www.xiaoyuzhoufm.com/episode/refresh-failed',
                  content: 'OpenAPI 可用正文',
                },
              },
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            h: { c: 401, m: 'Get笔记 Web token 刷新失败' },
          }),
        ),
      )

    const result = await fetchTranscript({
      url: 'https://www.xiaoyuzhoufm.com/episode/refresh-failed',
      env: {
        ENABLE_AI_TRANSCRIPT_RESEARCH: 'true',
        GETNOTE_API_KEY: 'gk_live_test.secret',
        GETNOTE_CLIENT_ID: 'cli_test',
        GETNOTE_WEB_REFRESH_TOKEN: 'expired-refresh-token',
      },
      fetcher: fetcher as unknown as typeof fetch,
    })

    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(String(fetcher.mock.calls[2]?.[0])).toBe(
      'https://notes-api.biji.com/account/v2/web/user/auth/refresh',
    )
    expect(warnSpy).toHaveBeenCalledWith(
      'GetNote web transcript unavailable:',
      'Get笔记 Web token 刷新失败',
    )
    expect(result).toEqual(
      expect.objectContaining({
        status: 'success',
        title: '官方笔记标题',
        summary: 'Get笔记官方总结正文',
        transcript: 'OpenAPI 可用正文',
        source: 'getnote-openapi',
      }),
    )

    warnSpy.mockRestore()
  })

  it('returns processing when GetNote has not finished within the wait window', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            tasks: [{ task_id: 'task-3' }],
          },
        }),
      ),
    )

    const result = await fetchTranscript({
      url: 'https://www.bilibili.com/video/BV123',
      maxWaitSeconds: 0,
      env: {
        ENABLE_AI_TRANSCRIPT_RESEARCH: 'true',
        GETNOTE_API_KEY: 'gk_live_test.secret',
        GETNOTE_CLIENT_ID: 'cli_test',
      },
      fetcher: fetcher as unknown as typeof fetch,
    })

    expect(result).toEqual({
      status: 'processing',
      url: 'https://www.bilibili.com/video/BV123',
      taskId: 'task-3',
      platform: 'bilibili',
      message:
        'Get笔记已开始处理音视频文字稿，请稍后再次让 AI 获取该链接内容。',
    })
  })

  it('polls task progress immediately before waiting', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              tasks: [{ task_id: 'task-immediate-poll' }],
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              status: 'processing',
              note_id: 'note-immediate-poll',
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              note: {
                title: '立即返回的官方总结',
                content: '官方总结正文',
                web_page: {
                  url: 'https://www.xiaoyuzhoufm.com/episode/68e8a8fd525f51df3895a239',
                  content: '完整转写正文',
                },
              },
            },
          }),
        ),
      )

    const result = await fetchTranscript({
      url: 'https://www.xiaoyuzhoufm.com/episode/68e8a8fd525f51df3895a239',
      maxWaitSeconds: 1,
      pollIntervalMs: 10_000,
      env: {
        ENABLE_AI_TRANSCRIPT_RESEARCH: 'true',
        GETNOTE_API_KEY: 'gk_live_test.secret',
        GETNOTE_CLIENT_ID: 'cli_test',
      },
      fetcher: fetcher as unknown as typeof fetch,
    })

    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(String(fetcher.mock.calls[1]?.[0])).toBe(
      'https://openapi.biji.com/open/api/v1/resource/note/task/progress',
    )
    expect(result).toEqual(
      expect.objectContaining({
        status: 'success',
        taskId: 'task-immediate-poll',
        noteId: 'note-immediate-poll',
        summary: '官方总结正文',
      }),
    )
  })
})
