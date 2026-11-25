const ANTHROPIC_VERSION = '2023-06-01'

export interface AnthropicCompatibleIdentity {
  providerType?: string | null
  provider?: string | null
  providerName?: string | null
}

export interface AnthropicCompatibleMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface RunAnthropicCompatibleTextInput
  extends AnthropicCompatibleIdentity {
  apiKey: string
  baseURL: string
  model: string
  messages: AnthropicCompatibleMessage[]
  temperature?: number
  maxTokens: number
  signal?: AbortSignal
}

function normalizeBaseUrl(input: string): string {
  return input.trim().replace(/\/+$/, '')
}

function toStringSafe(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return String(value)
}

export function isAnthropicCompatibleConfig(
  input: AnthropicCompatibleIdentity,
): boolean {
  const providerType = (input.providerType || '').trim().toLowerCase()
  const provider = (input.provider || '').trim().toLowerCase()
  const providerName = (input.providerName || '').trim().toLowerCase()

  return (
    providerType === 'anthropic_compatible' ||
    provider === 'anthropic' ||
    provider === 'aigocode_anthropic' ||
    providerName.includes('anthropic') ||
    providerName.includes('claude')
  )
}

export function buildAnthropicMessagesUrl(baseURL: string): string {
  const normalized = normalizeBaseUrl(baseURL)
  if (/\/messages$/i.test(normalized)) return normalized
  if (/\/v\d+(?:beta)?$/i.test(normalized)) return `${normalized}/messages`
  return `${normalized}/v1/messages`
}

function buildAnthropicBody(
  input: RunAnthropicCompatibleTextInput,
): Record<string, unknown> {
  const system = input.messages
    .filter((message) => message.role === 'system' && message.content.trim())
    .map((message) => message.content.trim())
    .join('\n\n')
  const messages = input.messages
    .filter((message) => message.role !== 'system' && message.content.trim())
    .map((message) => ({
      role: message.role,
      content: message.content,
    }))

  return {
    model: input.model,
    max_tokens: input.maxTokens,
    ...(system ? { system } : {}),
    messages:
      messages.length > 0 ? messages : [{ role: 'user', content: 'Say "OK"' }],
  }
}

export function extractAnthropicText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const response = payload as {
    content?: unknown
    completion?: unknown
    message?: { content?: unknown } | unknown
  }

  if (typeof response.completion === 'string') return response.completion

  const content = Array.isArray(response.content)
    ? response.content
    : response.message && typeof response.message === 'object'
      ? (response.message as { content?: unknown }).content
      : null

  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''

  return content
    .map((item) => {
      if (typeof item === 'string') return item
      if (!item || typeof item !== 'object') return ''
      const block = item as {
        type?: unknown
        text?: unknown
        content?: unknown
      }
      return toStringSafe(block.text || block.content)
    })
    .filter(Boolean)
    .join('\n')
}

export function extractAnthropicReasoning(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const response = payload as { content?: unknown }
  if (!Array.isArray(response.content)) return ''

  return response.content
    .map((item) => {
      if (!item || typeof item !== 'object') return ''
      const block = item as { thinking?: unknown; reasoning?: unknown }
      return toStringSafe(block.thinking || block.reasoning)
    })
    .filter(Boolean)
    .join('\n')
}

export function buildAnthropicErrorMessage(
  status: number,
  statusText: string,
  rawBody: string,
): string {
  let parsed: unknown
  try {
    parsed = rawBody ? JSON.parse(rawBody) : null
  } catch {
    parsed = null
  }

  if (parsed && typeof parsed === 'object') {
    const payload = parsed as {
      error?: { message?: unknown; type?: unknown } | string
      message?: unknown
      detail?: unknown
    }

    if (payload.error && typeof payload.error === 'object') {
      const message = toStringSafe(payload.error.message)
      const type = toStringSafe(payload.error.type)
      return [
        message || 'Anthropic compatible provider returned error',
        type ? `Type: ${type}` : '',
      ]
        .filter(Boolean)
        .join(' · ')
    }

    const message =
      toStringSafe(payload.error) ||
      toStringSafe(payload.message) ||
      toStringSafe(payload.detail)
    if (message.trim()) return message.trim()
  }

  const raw = rawBody.trim()
  if (raw) return raw.slice(0, 500)
  return `HTTP ${status}: ${statusText}`
}

export async function runAnthropicCompatibleText(
  input: RunAnthropicCompatibleTextInput,
): Promise<{ text: string; reasoningText: string; raw: unknown }> {
  const response = await fetch(buildAnthropicMessagesUrl(input.baseURL), {
    method: 'POST',
    signal: input.signal,
    headers: {
      'x-api-key': input.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildAnthropicBody(input)),
  })

  const rawBody = await response.text().catch(() => '')
  if (!response.ok) {
    throw new Error(
      buildAnthropicErrorMessage(response.status, response.statusText, rawBody),
    )
  }

  const raw = rawBody ? JSON.parse(rawBody) : null
  return {
    text: extractAnthropicText(raw),
    reasoningText: extractAnthropicReasoning(raw),
    raw,
  }
}
