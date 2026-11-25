import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getFailedEditorChunk,
  recoverEditorChunk,
  resetEditorChunkRecovery,
} from '@/lib/editor-chunk-recovery'

const path = '/_next/static/chunks/editor-core.js'
const chunkError = Object.assign(
  new Error(`Failed to load chunk ${path} from module 745773`),
  {
    name: 'ChunkLoadError',
  },
)
const scriptResponse = () =>
  new Response('/* complete script */', {
    headers: { 'content-type': 'text/javascript' },
  })

beforeEach(() => {
  const values = new Map<string, string>()
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('editor startup chunk recovery', () => {
  it('only accepts same-site compiled scripts from chunk errors', () => {
    expect(getFailedEditorChunk(chunkError)).toBe(path)
    expect(
      getFailedEditorChunk(new Error(`Failed to load chunk ${path}`)),
    ).toBeNull()
    for (const target of [
      'https://evil.example/a.js',
      '/api/posts',
      '/_next/static/chunks/../api.js',
      '/_next/static/chunks/x.js?url=external',
    ]) {
      const error = Object.assign(
        new Error(`Failed to load chunk ${target} from module 1`),
        {
          name: 'ChunkLoadError',
        },
      )
      expect(getFailedEditorChunk(error)).toBeNull()
    }
  })
  it('retries an interrupted body rather than treating HTTP 200 as success', async () => {
    const interrupted = scriptResponse()
    vi.spyOn(interrupted, 'arrayBuffer').mockRejectedValue(
      new Error('connection interrupted'),
    )
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(interrupted)
      .mockResolvedValueOnce(scriptResponse())
    vi.stubGlobal('fetch', fetchMock)
    expect(await recoverEditorChunk(chunkError)).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenCalledWith(
      path,
      expect.objectContaining({ cache: 'reload' }),
    )
  })
  it.each([
    new Response('', { headers: { 'content-type': 'text/javascript' } }),
    new Response('<html>error</html>', {
      headers: { 'content-type': 'text/html' },
    }),
    new Response('missing', { status: 404 }),
  ])('does not reload after an invalid asset response', async (response) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
    expect(await recoverEditorChunk(chunkError)).toBe(false)
  })
  it('caps automatic recoveries across reloads and allows an explicit reset', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => scriptResponse())
    vi.stubGlobal('fetch', fetchMock)
    expect(await recoverEditorChunk(chunkError)).toBe(true)
    expect(await recoverEditorChunk(chunkError)).toBe(true)
    expect(await recoverEditorChunk(chunkError)).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    resetEditorChunkRecovery()
    expect(await recoverEditorChunk(chunkError)).toBe(true)
  })
  it('does not automatically reload when storage is unavailable', async () => {
    vi.stubGlobal('sessionStorage', {
      getItem() {
        throw new Error('blocked')
      },
    })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await recoverEditorChunk(chunkError)).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
