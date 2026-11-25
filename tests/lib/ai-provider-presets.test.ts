import { describe, expect, it } from 'vitest'

import { AI_PROVIDER_MAP } from '@/lib/ai-provider-presets'

describe('AI provider presets', () => {
  it('keeps the official DeepSeek preset locked to V4 Flash', () => {
    expect(AI_PROVIDER_MAP.deepseek).toMatchObject({
      baseUrl: 'https://api.deepseek.com/v1',
      defaultModel: 'deepseek-v4-flash',
      quickModels: ['deepseek-v4-flash'],
    })
  })

  it('keeps caller-owned aggregator DeepSeek models unchanged', () => {
    expect(AI_PROVIDER_MAP.openrouter.quickModels).toContain(
      'deepseek/deepseek-chat',
    )
    expect(AI_PROVIDER_MAP.together.defaultModel).toBe(
      'deepseek-ai/DeepSeek-R1-0528',
    )
    expect(AI_PROVIDER_MAP.siliconflow.quickModels).toContain(
      'deepseek-ai/DeepSeek-V3',
    )
  })
})
