export const EDITOR_AI_CHAT_SESSIONS_STORAGE_PREFIX =
  'qmblog:editor-ai-chat-sessions:v2'
export const LEGACY_EDITOR_AI_CHAT_SESSIONS_STORAGE_KEY =
  'qmblog:editor-ai-chat-sessions:v1'

const FALLBACK_DOCUMENT_KEY = 'draft:unknown'
const SIDE_EFFECT_TOOL_TYPES = new Set([
  'tool-setArticleTitle',
  'tool-setArticleDescription',
  'tool-setArticleTags',
  'tool-insertMarkdownIntoArticle',
  'tool-editArticleContent',
  'tool-generateArticleImage',
])

type StoredMessageLike = {
  parts?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function hasOutputState(part: Record<string, unknown>) {
  return part.state === 'output-available' || part.state === 'output-error'
}

function hasImageInsertTarget(part: Record<string, unknown>) {
  if (part.state === 'output-error') return true
  if (part.state !== 'output-available') return false
  const output = part.output
  if (!isRecord(output)) return false
  return output.status === 'success' && isRecord(output.insertTarget)
}

function getAppliedImageResultToolCallId(part: Record<string, unknown>) {
  if (part.type !== 'data-imageResult') return ''
  const data = part.data
  if (!isRecord(data)) return ''
  const toolCallId =
    typeof data.toolCallId === 'string' ? data.toolCallId.trim() : ''
  if (!toolCallId) return ''
  const output = data.output
  if (!isRecord(output)) return ''
  return output.status === 'success' && isRecord(output.insertTarget)
    ? toolCallId
    : ''
}

export function normalizeEditorAiDocumentKey(value: unknown) {
  if (typeof value !== 'string') return FALLBACK_DOCUMENT_KEY
  const key = value.trim()
  return key || FALLBACK_DOCUMENT_KEY
}

export function isDraftEditorAiDocumentKey(value: unknown) {
  return normalizeEditorAiDocumentKey(value).startsWith('draft:')
}

export function buildEditorAiChatStorageKey(documentKey: unknown) {
  return `${EDITOR_AI_CHAT_SESSIONS_STORAGE_PREFIX}:${encodeURIComponent(normalizeEditorAiDocumentKey(documentKey))}`
}

export function mergeToolCallIds(
  ...groups: Array<Iterable<unknown> | null | undefined>
) {
  const ids: string[] = []
  const seen = new Set<string>()

  for (const group of groups) {
    if (!group) continue
    for (const value of group) {
      if (typeof value !== 'string') continue
      const id = value.trim()
      if (!id || seen.has(id)) continue
      seen.add(id)
      ids.push(id)
    }
  }

  return ids
}

export function collectAppliedToolCallIdsFromMessages(messages: unknown) {
  if (!Array.isArray(messages)) return []

  const ids: string[] = []

  for (const message of messages as StoredMessageLike[]) {
    if (!message || !Array.isArray(message.parts)) continue

    for (const rawPart of message.parts) {
      if (!isRecord(rawPart)) continue
      const type = typeof rawPart.type === 'string' ? rawPart.type : ''
      const imageResultToolCallId = getAppliedImageResultToolCallId(rawPart)
      if (imageResultToolCallId) {
        ids.push(imageResultToolCallId)
        continue
      }

      const toolCallId =
        typeof rawPart.toolCallId === 'string' ? rawPart.toolCallId.trim() : ''
      if (!toolCallId || !SIDE_EFFECT_TOOL_TYPES.has(type)) continue

      if (type === 'tool-generateArticleImage') {
        if (hasImageInsertTarget(rawPart)) ids.push(toolCallId)
        continue
      }

      if (hasOutputState(rawPart)) ids.push(toolCallId)
    }
  }

  return mergeToolCallIds(ids)
}
