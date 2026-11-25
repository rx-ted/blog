import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getAppCloudflareEnv: vi.fn(),
  decryptApiKey: vi.fn(),
  ensureAiConfigInfrastructure: vi.fn(),
  resolveAiConfigSecret: vi.fn(),
}))

vi.mock('@/lib/admin-auth', () => ({
  authenticateRequest: mocks.authenticateRequest,
}))

vi.mock('@/lib/cloudflare', () => ({
  getAppCloudflareEnv: mocks.getAppCloudflareEnv,
}))

vi.mock('@/lib/ai-provider-profiles', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/ai-provider-profiles')
  >('@/lib/ai-provider-profiles')
  return {
    ...actual,
    decryptApiKey: mocks.decryptApiKey,
    ensureAiConfigInfrastructure: mocks.ensureAiConfigInfrastructure,
    resolveAiConfigSecret: mocks.resolveAiConfigSecret,
  }
})

import { POST } from '@/app/api/admin/ai-provider/test/route'

describe('/api/admin/ai-provider/test route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authenticateRequest.mockResolvedValue(true)
    mocks.getAppCloudflareEnv.mockResolvedValue({ DB: {} })
    mocks.resolveAiConfigSecret.mockReturnValue('test-secret')
    mocks.ensureAiConfigInfrastructure.mockResolvedValue(undefined)
    globalThis.fetch = vi.fn()
  })

  it('tests Anthropic compatible providers through the Messages API', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ type: 'text', text: 'OK' }],
        }),
      ),
    )

    const response = await POST(
      new Request('http://test.local/api/admin/ai-provider/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'aigocode_anthropic',
          provider_name: 'AIGoCode (Anthropic)',
          provider_type: 'anthropic_compatible',
          base_url: 'https://api.aigocode.app/v1',
          api_key: 'test-key',
          model: 'claude-sonnet-4-6',
          temperature: 0.3,
          max_tokens: 128,
        }),
      }) as never,
    )

    await expect(response.json()).resolves.toMatchObject({
      success: true,
      model: 'claude-sonnet-4-6',
    })
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)

    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0]
    expect(url).toBe('https://api.aigocode.app/v1/messages')
    expect(init).toMatchObject({
      method: 'POST',
      headers: {
        'x-api-key': 'test-key',
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
    })
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: 'claude-sonnet-4-6',
      max_tokens: 128,
      messages: [{ role: 'user', content: 'Say "OK"' }],
    })
    expect(JSON.parse(String(init?.body))).not.toHaveProperty('temperature')
  })

  it('keeps OpenAI compatible providers on chat completions', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'OK' } }],
        }),
      ),
    )

    const response = await POST(
      new Request('http://test.local/api/admin/ai-provider/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'custom',
          provider_name: 'Custom',
          provider_type: 'openai_compatible',
          base_url: 'https://api.example.test/v1',
          api_key: 'test-key',
          model: 'chat-model',
          temperature: 0.7,
          max_tokens: 64,
        }),
      }) as never,
    )

    await expect(response.json()).resolves.toMatchObject({
      success: true,
      model: 'chat-model',
    })

    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0]
    expect(url).toBe('https://api.example.test/v1/chat/completions')
    expect(init).toMatchObject({
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      },
    })
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: 'chat-model',
      messages: [{ role: 'user', content: 'Say "OK"' }],
    })
  })
})
