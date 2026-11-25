'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from 'ai'
import {
  Copy,
  FileText,
  History,
  ImageIcon,
  Loader2,
  MessageSquareText,
  Plus,
  RotateCcw,
  Send,
  Settings2,
  Square,
  TextCursorInput,
  Trash2,
  WandSparkles,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import {
  LOCAL_HISTORY_UPDATED_EVENT,
  readStoredHistory,
  writeStoredHistory,
} from '@/lib/client-background-task'
import {
  buildEditorAiChatStorageKey,
  collectAppliedToolCallIdsFromMessages,
  isDraftEditorAiDocumentKey,
  mergeToolCallIds,
  normalizeEditorAiDocumentKey,
} from '@/lib/editor-ai-chat-sessions'
import { renderMarkdownToHtml } from '@/lib/editor-markdown'

export type EditorAiChatContext = {
  documentKey: string
  postId: number | null
  title: string
  documentText: string
  sectionToc: string
  currentSection: string
  selectedText: string
  description: string
  category: string
  tags: string[]
  slug: string
}

type EditorChatStatusData = {
  label: string
  stage: 'preparing' | 'connecting' | 'thinking' | 'image' | 'done'
}

type GeneratedArticleImageOutput =
  | {
      status: 'success'
      url: string
      variants: {
        raw: string
        content: string
        thumb: string
        cover: string
      }
      alt: string
      prompt: string
      revisedPrompt: string
      aspectRatio: string
      resolution: string
      actionLabel: string
      placement: 'inline' | 'cover' | 'section'
      insertTarget?: EditorAiToolInsertTarget
      model: string
      profileName: string
      assetId?: number
    }
  | {
      status: 'error'
      error: string
      prompt: string
      aspectRatio: string
      resolution: string
      placement: 'inline' | 'cover' | 'section'
      insertTarget?: EditorAiToolInsertTarget
    }

type EditorAiToolOutput = {
  status: 'success' | 'error'
  message: string
}

type EditorAiReadArticleContentOutput = {
  status: 'success' | 'error'
  message: string
  scope: 'all' | 'selection'
  content: string
  charCount: number
  truncated: boolean
  title: string
  sectionToc: string
  currentSection: string
  selectedText: string
}

type EditorAiToolInsertTarget = {
  mode: 'cursor' | 'section'
  sectionNumber?: number
  sectionTitle?: string
}

type EditorAiChatTools = {
  readArticleContent: {
    input: {
      scope?: 'all' | 'selection'
      maxChars?: number
    }
    output: EditorAiReadArticleContentOutput
  }
  setArticleTitle: {
    input: {
      title: string
    }
    output: EditorAiToolOutput
  }
  setArticleDescription: {
    input: {
      description: string
    }
    output: EditorAiToolOutput
  }
  setArticleTags: {
    input: {
      tags: string[]
    }
    output: EditorAiToolOutput
  }
  insertMarkdownIntoArticle: {
    input: {
      markdown: string
      target?: EditorAiToolInsertTarget
    }
    output: EditorAiToolOutput
  }
  editArticleContent: {
    input: {
      action: 'replace' | 'delete'
      target: {
        mode: 'selection' | 'exactText' | 'all'
        exactText?: string
        occurrence?: number
        useLastMatch?: boolean
      }
      replacementMarkdown?: string
      expectedText?: string
    }
    output: EditorAiToolOutput
  }
  generateArticleImage: {
    input: {
      prompt: string
      aspectRatio?: string
      resolution?: string
      placement?: 'inline' | 'cover' | 'section'
      insertTarget?: EditorAiToolInsertTarget
      alt?: string
    }
    output: GeneratedArticleImageOutput
  }
}

type EditorAiChatDataParts = {
  status: EditorChatStatusData
  imageResult: {
    toolCallId: string
    output: GeneratedArticleImageOutput
  }
}

type EditorAiChatMessage = UIMessage<
  never,
  EditorAiChatDataParts,
  EditorAiChatTools
>
type EditorAiImageToolPart = Extract<
  EditorAiChatMessage['parts'][number],
  { type: 'tool-generateArticleImage' }
>
type EditorAiClientToolName = Exclude<
  keyof EditorAiChatTools,
  'generateArticleImage'
>
type EditorAiImageResultDataPart = {
  type: 'data-imageResult'
  data: {
    toolCallId: string
    output: GeneratedArticleImageOutput
  }
}

function isImageResultDataPart(
  part: EditorAiChatMessage['parts'][number],
): part is EditorAiImageResultDataPart {
  return part.type === 'data-imageResult'
}

interface EditorAiChatPanelProps {
  getContext: () => EditorAiChatContext
  onInsertText: (text: string) => void
  onSetTitle: (title: string) => EditorAiToolOutput
  onSetDescription: (description: string) => EditorAiToolOutput
  onSetTags: (tags: string[]) => EditorAiToolOutput
  onReadArticleContent: (
    scope?: 'all' | 'selection',
    maxChars?: number,
  ) => EditorAiReadArticleContentOutput
  onInsertMarkdown: (
    markdown: string,
    target?: EditorAiToolInsertTarget,
  ) => EditorAiToolOutput
  onEditArticleContent: (
    input: EditorAiChatTools['editArticleContent']['input'],
  ) => EditorAiToolOutput
  onInsertImage: (
    imageUrl: string,
    alt: string,
    target?: EditorAiToolInsertTarget,
  ) => EditorAiToolOutput
}

type EditorAiChatSession = {
  id: string
  documentKey: string
  title: string
  documentTitle: string
  messages: EditorAiChatMessage[]
  appliedToolCallIds: string[]
  contextSnapshot: EditorAiChatContextSnapshot
  createdAt: number
  updatedAt: number
}

type EditorAiChatContextSnapshot = {
  documentKey: string
  postId: number | null
  title: string
  slug: string
  description: string
  category: string
  tags: string[]
  sectionToc: string
  currentSection: string
  documentPreview: string
  updatedAt: number
}

type AiProfileItem = {
  id: number
  name: string
  model: string
  is_default: number
}

const QUICK_PROMPTS = [
  '帮我指出这篇文章最需要改进的三个地方。',
  '基于当前文章，给我 5 个更有吸引力但不标题党的标题。',
  '为当前文章生成一段自然、有信息量的中文摘要。',
  '根据当前文章生成一张适合正文的配图。',
]

const CLIENT_TOOL_NAMES = new Set<string>([
  'readArticleContent',
  'setArticleTitle',
  'setArticleDescription',
  'setArticleTags',
  'insertMarkdownIntoArticle',
  'editArticleContent',
])
const MAX_SESSIONS = 20
const MAX_STORED_MESSAGES = 80
const MAX_STORED_TEXT_CHARS = 12000
const MAX_CONTEXT_SNAPSHOT_CHARS = 4000
const CHAT_TEXT_PROFILE_KEY = 'qmblog:editor-ai-chat:text-profile-id'
const CHAT_IMAGE_PROFILE_KEY = 'qmblog:editor-ai-chat:image-profile-id'

function createLocalId(prefix = 'chat') {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  return `${prefix}-${Date.now()}-${random}`
}

function getMessageText(message: EditorAiChatMessage) {
  return message.parts
    .filter(
      (part): part is Extract<typeof part, { type: 'text' }> =>
        part.type === 'text',
    )
    .map((part) => part.text)
    .join('')
}

function getMessageLabel(message: EditorAiChatMessage) {
  return message.role === 'user' ? '你' : 'AI'
}

function getClientToolStatusLabel(toolName: string) {
  switch (toolName) {
    case 'readArticleContent':
      return '正在读取正文'
    case 'setArticleTitle':
      return '正在更新标题'
    case 'setArticleDescription':
      return '正在更新摘要'
    case 'setArticleTags':
      return '正在更新标签'
    case 'insertMarkdownIntoArticle':
      return '正在插入正文'
    case 'editArticleContent':
      return '正在编辑正文'
    default:
      return ''
  }
}

function formatSessionTime(value: number) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getContextTitle(context: EditorAiChatContext) {
  return context.title.trim() || context.slug.trim() || '未命名文章'
}

function buildContextSnapshot(
  context: EditorAiChatContext,
): EditorAiChatContextSnapshot {
  return {
    documentKey: normalizeEditorAiDocumentKey(context.documentKey),
    postId: context.postId,
    title: context.title.trim(),
    slug: context.slug.trim(),
    description: context.description.trim(),
    category: context.category.trim(),
    tags: context.tags.slice(0, 12),
    sectionToc: trimStoredText(context.sectionToc).slice(
      0,
      MAX_CONTEXT_SNAPSHOT_CHARS,
    ),
    currentSection: trimStoredText(context.currentSection).slice(0, 300),
    documentPreview: trimStoredText(context.documentText).slice(
      0,
      MAX_CONTEXT_SNAPSHOT_CHARS,
    ),
    updatedAt: Date.now(),
  }
}

function createSession(
  context: EditorAiChatContext,
  messages: EditorAiChatMessage[] = [],
  appliedToolCallIds: string[] = [],
): EditorAiChatSession {
  const now = Date.now()
  const documentKey = normalizeEditorAiDocumentKey(context.documentKey)
  return {
    id: createLocalId(),
    documentKey,
    title: getSessionTitle(messages) || '新对话',
    documentTitle: getContextTitle(context),
    messages,
    appliedToolCallIds: mergeToolCallIds(
      appliedToolCallIds,
      collectAppliedToolCallIdsFromMessages(messages),
    ),
    contextSnapshot: buildContextSnapshot({ ...context, documentKey }),
    createdAt: now,
    updatedAt: now,
  }
}

function getSessionTitle(messages: EditorAiChatMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === 'user')
  const text = firstUserMessage
    ? getMessageText(firstUserMessage).replace(/\s+/g, ' ').trim()
    : ''
  if (!text) return ''
  return text.length > 28 ? `${text.slice(0, 28)}...` : text
}

function trimStoredText(text: string) {
  return text.length > MAX_STORED_TEXT_CHARS
    ? `${text.slice(0, MAX_STORED_TEXT_CHARS)}...`
    : text
}

function sanitizeMessagesForStorage(
  messages: EditorAiChatMessage[],
): EditorAiChatMessage[] {
  return sanitizeMessagesForTransport(messages)
    .slice(-MAX_STORED_MESSAGES)
    .map((message) => ({
      ...message,
      parts: message.parts.map((part) => {
        if (part.type === 'text') {
          return { ...part, text: trimStoredText(part.text) }
        }
        return part
      }),
    }))
}

function hasSendableMessageParts(message: Pick<EditorAiChatMessage, 'parts'>) {
  return Array.isArray(message.parts) && message.parts.length > 0
}

function sanitizeMessagesForTransport(
  messages: EditorAiChatMessage[],
): EditorAiChatMessage[] {
  return messages.filter(hasSendableMessageParts)
}

function normalizeStoredMessages(value: unknown): EditorAiChatMessage[] {
  if (!Array.isArray(value)) return []

  return value.filter((message): message is EditorAiChatMessage => {
    if (!message || typeof message !== 'object') return false
    const candidate = message as Partial<EditorAiChatMessage>
    return (
      typeof candidate.id === 'string' &&
      (candidate.role === 'user' ||
        candidate.role === 'assistant' ||
        candidate.role === 'system') &&
      Array.isArray(candidate.parts) &&
      candidate.parts.length > 0
    )
  })
}

function normalizeStoredSessions(
  value: unknown,
  context: EditorAiChatContext,
): EditorAiChatSession[] {
  if (!Array.isArray(value)) return []
  const documentKey = normalizeEditorAiDocumentKey(context.documentKey)
  const fallbackSnapshot = buildContextSnapshot({ ...context, documentKey })

  return value
    .map((item): EditorAiChatSession | null => {
      if (!item || typeof item !== 'object') return null
      const candidate = item as Partial<EditorAiChatSession>
      if (typeof candidate.id !== 'string') return null
      const messages = normalizeStoredMessages(candidate.messages)
      const updatedAt =
        typeof candidate.updatedAt === 'number'
          ? candidate.updatedAt
          : Date.now()
      const inferredToolCallIds =
        collectAppliedToolCallIdsFromMessages(messages)
      const storedToolCallIds = Array.isArray(candidate.appliedToolCallIds)
        ? candidate.appliedToolCallIds
        : []
      const contextSnapshot =
        candidate.contextSnapshot &&
        typeof candidate.contextSnapshot === 'object'
          ? {
              ...fallbackSnapshot,
              ...candidate.contextSnapshot,
              documentKey,
            }
          : fallbackSnapshot

      return {
        id: candidate.id,
        documentKey,
        title:
          typeof candidate.title === 'string' && candidate.title.trim()
            ? candidate.title.trim()
            : getSessionTitle(messages) || '新对话',
        documentTitle:
          typeof candidate.documentTitle === 'string' &&
          candidate.documentTitle.trim()
            ? candidate.documentTitle.trim()
            : '未命名文章',
        messages,
        appliedToolCallIds: mergeToolCallIds(
          storedToolCallIds,
          inferredToolCallIds,
        ),
        contextSnapshot,
        createdAt:
          typeof candidate.createdAt === 'number'
            ? candidate.createdAt
            : updatedAt,
        updatedAt,
      }
    })
    .filter((item): item is EditorAiChatSession => Boolean(item))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_SESSIONS)
}

function hasVisibleMessageContent(message: EditorAiChatMessage) {
  return message.parts.some((part) => {
    if (part.type === 'text') {
      return part.text.trim().length > 0
    }

    return (
      part.type === 'tool-generateArticleImage' || isImageResultDataPart(part)
    )
  })
}

function getObjectInput(value: unknown) {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {}
}

function isEditorAiClientToolName(
  value: string,
): value is EditorAiClientToolName {
  return CLIENT_TOOL_NAMES.has(value)
}

function normalizeClientToolTarget(
  value: unknown,
): EditorAiToolInsertTarget | undefined {
  if (!value || typeof value !== 'object') return undefined
  const input = value as Record<string, unknown>
  const mode = input.mode === 'section' ? 'section' : 'cursor'
  const rawSectionNumber = Number(input.sectionNumber)
  const sectionNumber =
    Number.isInteger(rawSectionNumber) && rawSectionNumber > 0
      ? rawSectionNumber
      : undefined
  const sectionTitle =
    typeof input.sectionTitle === 'string' && input.sectionTitle.trim()
      ? input.sectionTitle.trim()
      : undefined

  return { mode, sectionNumber, sectionTitle }
}

function MessageMarkdown({
  markdown,
  isAssistant,
}: {
  markdown: string
  isAssistant: boolean
}) {
  const html = useMemo(() => renderMarkdownToHtml(markdown), [markdown])
  const wrapperClassName = `rounded-lg px-3 py-2 text-sm leading-6 ${
    isAssistant
      ? 'border border-[var(--editor-line)] bg-[var(--editor-panel)] text-[var(--editor-ink)]'
      : 'bg-[var(--editor-accent)]/10 text-[var(--editor-ink)]'
  }`

  if (!isAssistant) {
    return (
      <div className={wrapperClassName}>
        <div className="whitespace-pre-wrap break-words">{markdown}</div>
      </div>
    )
  }

  return (
    <div className={wrapperClassName}>
      <div
        className="editor-ai-chat-markdown"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

function MessageActions({
  text,
  onCopy,
  onInsert,
}: {
  text: string
  onCopy: () => void
  onInsert: () => void
}) {
  if (!text.trim()) return null

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-[var(--editor-muted)] transition hover:border-[var(--editor-line)] hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)]"
        title="复制"
        aria-label="复制"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onInsert}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-[var(--editor-muted)] transition hover:border-[var(--editor-line)] hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)]"
        title="插入到正文"
        aria-label="插入到正文"
      >
        <TextCursorInput className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function readInitialChatState(getContext: () => EditorAiChatContext) {
  const rawContext = getContext()
  const context = {
    ...rawContext,
    documentKey: normalizeEditorAiDocumentKey(rawContext.documentKey),
  }
  const storageKey = buildEditorAiChatStorageKey(context.documentKey)
  const stored = normalizeStoredSessions(
    readStoredHistory<EditorAiChatSession>(storageKey),
    context,
  )
  const sessions = stored.length > 0 ? stored : [createSession(context)]
  const activeSession = sessions[0]

  return {
    documentKey: context.documentKey,
    storageKey,
    sessions,
    activeSessionId: activeSession.id,
    messages: activeSession.messages,
  }
}

function Composer({
  busy,
  input,
  textProfiles,
  imageProfiles,
  selectedTextProfileId,
  selectedImageProfileId,
  onTextProfileChange,
  onImageProfileChange,
  onInputChange,
  onSend,
  onStop,
}: {
  busy: boolean
  input: string
  textProfiles: AiProfileItem[]
  imageProfiles: AiProfileItem[]
  selectedTextProfileId: number | null
  selectedImageProfileId: number | null
  onTextProfileChange: (value: number | null) => void
  onImageProfileChange: (value: number | null) => void
  onInputChange: (value: string) => void
  onSend: () => void
  onStop: () => void
}) {
  const composerRef = useRef<HTMLDivElement | null>(null)
  const composingRef = useRef(false)
  const selectedTextProfile =
    textProfiles.find((profile) => profile.id === selectedTextProfileId) ||
    textProfiles.find((profile) => profile.is_default === 1) ||
    textProfiles[0]
  const selectedImageProfile =
    imageProfiles.find((profile) => profile.id === selectedImageProfileId) ||
    imageProfiles.find((profile) => profile.is_default === 1) ||
    imageProfiles[0]

  useEffect(() => {
    const node = composerRef.current
    if (!node) return
    if (document.activeElement === node && input) return
    if (node.innerText !== input) {
      node.innerText = input
    }
  }, [input])

  const syncInput = useCallback(() => {
    onInputChange(composerRef.current?.innerText.replace(/\u00a0/g, ' ') || '')
  }, [onInputChange])

  return (
    <form
      className="shrink-0 border-t border-[var(--editor-line)] p-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (busy) {
          onStop()
        } else {
          onSend()
        }
      }}
    >
      <div className="rounded-lg border border-[var(--editor-line)] bg-[var(--editor-panel)] shadow-[0_8px_28px_-24px_rgba(15,23,42,0.45)] transition focus-within:border-[var(--editor-accent)] focus-within:ring-2 focus-within:ring-[var(--editor-accent)]/15">
        <div className="relative">
          {!input.trim() ? (
            <div className="pointer-events-none absolute left-3 top-3 text-sm text-[var(--stone-gray)]">
              问当前文章，或让 AI 生成配图
            </div>
          ) : null}
          <div
            ref={composerRef}
            role="textbox"
            aria-label="AI 对话输入"
            aria-multiline="true"
            contentEditable={!busy}
            suppressContentEditableWarning
            spellCheck={false}
            onCompositionStart={() => {
              composingRef.current = true
            }}
            onCompositionEnd={() => {
              composingRef.current = false
              syncInput()
            }}
            onInput={syncInput}
            onPaste={(event) => {
              event.preventDefault()
              const text = event.clipboardData.getData('text/plain')
              document.execCommand('insertText', false, text)
              syncInput()
            }}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !composingRef.current
              ) {
                event.preventDefault()
                if (busy) {
                  onStop()
                } else {
                  onSend()
                }
              }
            }}
            className="max-h-40 min-h-24 overflow-y-auto whitespace-pre-wrap break-words px-3 py-3 pr-12 text-sm leading-6 text-[var(--editor-ink)] outline-none"
          />
          <button
            type="submit"
            disabled={!busy && !input.trim()}
            className={`absolute bottom-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-lg transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${
              busy
                ? 'border border-[var(--editor-line)] bg-[var(--editor-panel)] text-[var(--editor-muted)] hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)]'
                : 'bg-[var(--editor-accent)] text-white hover:brightness-105'
            }`}
            title={busy ? '停止生成' : '发送'}
            aria-label={busy ? '停止生成' : '发送'}
          >
            {busy ? (
              <Square className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-1 border-t border-[var(--editor-line)] px-2 py-1.5">
          <label className="relative inline-flex items-center">
            <MessageSquareText className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-[var(--editor-muted)]" />
            <select
              value={selectedTextProfileId ?? ''}
              onChange={(event) =>
                onTextProfileChange(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              disabled={busy || textProfiles.length === 0}
              className="h-8 max-w-[9rem] appearance-none rounded-md border border-transparent bg-transparent pl-7 pr-7 text-xs text-[var(--editor-muted)] outline-none transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)] disabled:opacity-40"
              title={
                selectedTextProfile
                  ? `文本模型：${selectedTextProfile.name} · ${selectedTextProfile.model}`
                  : '文本模型'
              }
              aria-label="切换文本模型"
            >
              {textProfiles.length === 0 ? (
                <option value="">文本模型</option>
              ) : null}
              {textProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
          <label className="relative inline-flex items-center">
            <ImageIcon className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-[var(--editor-muted)]" />
            <select
              value={selectedImageProfileId ?? ''}
              onChange={(event) =>
                onImageProfileChange(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              disabled={busy || imageProfiles.length === 0}
              className="h-8 max-w-[9rem] appearance-none rounded-md border border-transparent bg-transparent pl-7 pr-7 text-xs text-[var(--editor-muted)] outline-none transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)] disabled:opacity-40"
              title={
                selectedImageProfile
                  ? `图片模型：${selectedImageProfile.name} · ${selectedImageProfile.model}`
                  : '图片模型'
              }
              aria-label="切换图片模型"
            >
              {imageProfiles.length === 0 ? (
                <option value="">图片模型</option>
              ) : null}
              {imageProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
          <Settings2
            className="ml-auto h-3.5 w-3.5 text-[var(--editor-muted)]"
            aria-hidden
          />
        </div>
      </div>
    </form>
  )
}

function ImageResultCard({
  toolCallId,
  output,
  pendingPrompt,
  onInsertImage,
  onCopy,
}: {
  toolCallId: string
  output: GeneratedArticleImageOutput | null
  pendingPrompt?: string
  onInsertImage: (
    url: string,
    alt: string,
    target?: EditorAiToolInsertTarget,
  ) => EditorAiToolOutput
  onCopy: (text: string) => void
}) {
  if (!output) {
    return (
      <div className="rounded-lg border border-[var(--editor-line)] bg-[var(--editor-soft)] px-3 py-2 text-xs text-[var(--editor-muted)]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          正在生成图片
        </div>
        {pendingPrompt ? (
          <div className="mt-1 line-clamp-2 text-[var(--editor-ink)]">
            {pendingPrompt}
          </div>
        ) : null}
      </div>
    )
  }

  if (output.status === 'error') {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
        {output.error}
      </div>
    )
  }

  const imageUrl = output.variants.thumb || output.url
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--editor-line)] bg-[var(--editor-panel)]">
      <div className="aspect-[16/9] w-full bg-[var(--editor-soft)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={output.alt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="space-y-2 px-3 py-2">
        <div className="flex items-center justify-between gap-2 text-xs text-[var(--editor-muted)]">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{output.actionLabel}</span>
          </span>
          <span className="shrink-0">{output.aspectRatio}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const result = onInsertImage(
                output.url,
                output.alt,
                output.insertTarget,
              )
              if (result.status === 'error') return
            }}
            className="rounded-md border border-[var(--editor-line)] px-2 py-1 text-xs text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)]"
            data-tool-call-id={toolCallId}
          >
            插入图片
          </button>
          <button
            type="button"
            onClick={() => onCopy(output.url)}
            className="rounded-md border border-[var(--editor-line)] px-2 py-1 text-xs text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)]"
          >
            复制链接
          </button>
        </div>
      </div>
    </div>
  )
}

function getImageToolOutput(
  part: EditorAiImageToolPart,
): GeneratedArticleImageOutput | null {
  if (part.state === 'output-available') return part.output
  if (part.state === 'output-error') {
    return {
      status: 'error',
      error: part.errorText || '图片生成失败',
      prompt: typeof part.input?.prompt === 'string' ? part.input.prompt : '',
      aspectRatio:
        typeof part.input?.aspectRatio === 'string'
          ? part.input.aspectRatio
          : 'auto',
      resolution:
        typeof part.input?.resolution === 'string'
          ? part.input.resolution
          : 'auto',
      placement: part.input?.placement || 'inline',
      insertTarget: part.input?.insertTarget,
    }
  }
  return null
}

function ImageToolCard({
  part,
  output,
  onInsertImage,
  onCopy,
}: {
  part: EditorAiImageToolPart
  output?: GeneratedArticleImageOutput
  onInsertImage: (
    url: string,
    alt: string,
    target?: EditorAiToolInsertTarget,
  ) => EditorAiToolOutput
  onCopy: (text: string) => void
}) {
  const inputPrompt =
    typeof part.input?.prompt === 'string' ? part.input.prompt : ''
  const resolvedOutput = output || getImageToolOutput(part)

  if (part.state === 'output-error' && !resolvedOutput) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
        {part.errorText || '图片生成失败'}
      </div>
    )
  }

  return (
    <ImageResultCard
      toolCallId={part.toolCallId}
      output={resolvedOutput}
      pendingPrompt={inputPrompt}
      onInsertImage={onInsertImage}
      onCopy={onCopy}
    />
  )
}

export function EditorAiChatPanel({
  getContext,
  onInsertText,
  onSetTitle,
  onSetDescription,
  onSetTags,
  onReadArticleContent,
  onInsertMarkdown,
  onEditArticleContent,
  onInsertImage,
}: EditorAiChatPanelProps) {
  const toast = useToast()
  const [initialChatState] = useState(() => readInitialChatState(getContext))
  const [input, setInput] = useState('')
  const [sessions, setSessions] = useState<EditorAiChatSession[]>(
    initialChatState.sessions,
  )
  const [activeSessionId, setActiveSessionId] = useState(
    initialChatState.activeSessionId,
  )
  const [historyOpen, setHistoryOpen] = useState(false)
  const [streamStatus, setStreamStatus] = useState<EditorChatStatusData | null>(
    null,
  )
  const [streamImageResults, setStreamImageResults] = useState<
    Record<string, GeneratedArticleImageOutput>
  >({})
  const [textProfiles, setTextProfiles] = useState<AiProfileItem[]>([])
  const [imageProfiles, setImageProfiles] = useState<AiProfileItem[]>([])
  const [selectedTextProfileId, setSelectedTextProfileId] = useState<
    number | null
  >(null)
  const [selectedImageProfileId, setSelectedImageProfileId] = useState<
    number | null
  >(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const hydratedRef = useRef(true)
  const switchingSessionRef = useRef(false)
  const getContextRef = useRef(getContext)
  const documentKeyRef = useRef(initialChatState.documentKey)
  const chatStorageKeyRef = useRef(initialChatState.storageKey)
  const sessionsRef = useRef(initialChatState.sessions)
  const activeSessionIdRef = useRef(initialChatState.activeSessionId)
  const appliedToolCallIdsRef = useRef(
    new Set(
      initialChatState.sessions.find(
        (session) => session.id === initialChatState.activeSessionId,
      )?.appliedToolCallIds || [],
    ),
  )
  const selectedTextProfileIdRef = useRef<number | null>(null)
  const selectedImageProfileIdRef = useRef<number | null>(null)

  useEffect(() => {
    getContextRef.current = getContext
  }, [getContext])

  useEffect(() => {
    sessionsRef.current = sessions
  }, [sessions])

  useEffect(() => {
    let cancelled = false
    async function loadProfiles() {
      const [textRes, imageRes] = await Promise.all([
        fetch('/api/admin/ai-provider', { credentials: 'include' }),
        fetch('/api/admin/ai-image-provider', { credentials: 'include' }),
      ])
      const [textData, imageData] = (await Promise.all([
        textRes.json().catch(() => ({})),
        imageRes.json().catch(() => ({})),
      ])) as [
        { profiles?: AiProfileItem[]; default_profile_id?: number | null },
        { profiles?: AiProfileItem[]; default_profile_id?: number | null },
      ]
      if (cancelled) return

      const nextTextProfiles = Array.isArray(textData.profiles)
        ? textData.profiles
        : []
      const nextImageProfiles = Array.isArray(imageData.profiles)
        ? imageData.profiles
        : []
      const storedTextId = Number(
        window.localStorage.getItem(CHAT_TEXT_PROFILE_KEY) || '',
      )
      const storedImageId = Number(
        window.localStorage.getItem(CHAT_IMAGE_PROFILE_KEY) || '',
      )
      const nextTextId = nextTextProfiles.some(
        (profile) => profile.id === storedTextId,
      )
        ? storedTextId
        : (textData.default_profile_id ?? nextTextProfiles[0]?.id ?? null)
      const nextImageId = nextImageProfiles.some(
        (profile) => profile.id === storedImageId,
      )
        ? storedImageId
        : (imageData.default_profile_id ?? nextImageProfiles[0]?.id ?? null)

      setTextProfiles(nextTextProfiles)
      setImageProfiles(nextImageProfiles)
      setSelectedTextProfileId(nextTextId)
      setSelectedImageProfileId(nextImageId)
      selectedTextProfileIdRef.current = nextTextId
      selectedImageProfileIdRef.current = nextImageId
    }

    void loadProfiles().catch(() => {
      if (!cancelled) {
        setTextProfiles([])
        setImageProfiles([])
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  const handleTextProfileChange = useCallback((value: number | null) => {
    selectedTextProfileIdRef.current = value
    setSelectedTextProfileId(value)
    if (value) window.localStorage.setItem(CHAT_TEXT_PROFILE_KEY, String(value))
    else window.localStorage.removeItem(CHAT_TEXT_PROFILE_KEY)
  }, [])

  const handleImageProfileChange = useCallback((value: number | null) => {
    selectedImageProfileIdRef.current = value
    setSelectedImageProfileId(value)
    if (value)
      window.localStorage.setItem(CHAT_IMAGE_PROFILE_KEY, String(value))
    else window.localStorage.removeItem(CHAT_IMAGE_PROFILE_KEY)
  }, [])

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId
    const activeSession = sessionsRef.current.find(
      (session) => session.id === activeSessionId,
    )
    appliedToolCallIdsRef.current = new Set(
      activeSession?.appliedToolCallIds || [],
    )
  }, [activeSessionId, sessions])

  const transport = useMemo(
    () =>
      new DefaultChatTransport<EditorAiChatMessage>({
        api: '/api/editor/ai-chat',
        credentials: 'same-origin',
        prepareSendMessagesRequest({
          id,
          messages: nextMessages,
          body,
          trigger,
          messageId,
        }) {
          return {
            body: {
              ...body,
              id,
              messages: sanitizeMessagesForTransport(nextMessages),
              trigger,
              messageId,
            },
          }
        },
      }),
    [],
  )

  const persistSessions = useCallback(
    (updater: (current: EditorAiChatSession[]) => EditorAiChatSession[]) => {
      setSessions((current) => {
        const next = updater(current)
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, MAX_SESSIONS)
        sessionsRef.current = next
        writeStoredHistory(chatStorageKeyRef.current, next)
        return next
      })
    },
    [],
  )

  const markToolCallApplied = useCallback(
    (toolCallId: string) => {
      const id = toolCallId.trim()
      if (!id) return

      appliedToolCallIdsRef.current.add(id)
      const sessionId = activeSessionIdRef.current
      persistSessions((current) =>
        current.map((session) => {
          if (session.id !== sessionId) return session
          return {
            ...session,
            appliedToolCallIds: mergeToolCallIds(session.appliedToolCallIds, [
              id,
            ]),
            updatedAt: Date.now(),
          }
        }),
      )
    },
    [persistSessions],
  )

  const {
    messages,
    sendMessage,
    status,
    stop,
    regenerate,
    setMessages,
    addToolOutput,
    error,
    clearError,
  } = useChat<EditorAiChatMessage>({
    transport,
    messages: initialChatState.messages,
    experimental_throttle: 80,
    sendAutomaticallyWhen({ messages: nextMessages }) {
      return lastAssistantMessageIsCompleteWithToolCalls({
        messages: nextMessages,
      })
    },
    onToolCall({ toolCall }) {
      let output: EditorAiToolOutput | EditorAiReadArticleContentOutput | null =
        null
      const input = getObjectInput(toolCall.input)
      const toolCallId = toolCall.toolCallId.trim()

      if (!toolCallId) return

      if (!isEditorAiClientToolName(toolCall.toolName)) return

      const toolStatusLabel = getClientToolStatusLabel(toolCall.toolName)
      if (toolStatusLabel) {
        setStreamStatus({ label: toolStatusLabel, stage: 'thinking' })
      }

      if (appliedToolCallIdsRef.current.has(toolCallId)) {
        void addToolOutput({
          tool: toolCall.toolName,
          toolCallId,
          output: {
            status: 'success',
            message: '该操作已执行过',
          },
          options: {
            body: {
              context: getContextRef.current(),
              sessionId: activeSessionIdRef.current,
            },
          },
        })
        return
      }

      if (toolCall.toolName === 'readArticleContent') {
        const scope = input.scope === 'selection' ? 'selection' : 'all'
        const maxChars =
          typeof input.maxChars === 'number'
            ? input.maxChars
            : typeof input.maxChars === 'string'
              ? Number.parseInt(input.maxChars, 10)
              : undefined
        output = onReadArticleContent(scope, maxChars)
      } else if (toolCall.toolName === 'setArticleTitle') {
        const title = typeof input.title === 'string' ? input.title : ''
        output = onSetTitle(title)
      } else if (toolCall.toolName === 'setArticleDescription') {
        const description =
          typeof input.description === 'string' ? input.description : ''
        output = onSetDescription(description)
      } else if (toolCall.toolName === 'setArticleTags') {
        output = onSetTags(
          Array.isArray(input.tags) ? input.tags.map(String) : [],
        )
      } else if (toolCall.toolName === 'insertMarkdownIntoArticle') {
        const markdown =
          typeof input.markdown === 'string' ? input.markdown : ''
        output = onInsertMarkdown(
          markdown,
          normalizeClientToolTarget(input.target),
        )
      } else if (toolCall.toolName === 'editArticleContent') {
        const editTarget =
          input.target && typeof input.target === 'object'
            ? (input.target as Record<string, unknown>)
            : {}
        const editTargetMode =
          editTarget.mode === 'all'
            ? 'all'
            : editTarget.mode === 'exactText'
              ? 'exactText'
              : 'selection'
        output = onEditArticleContent({
          action: input.action === 'delete' ? 'delete' : 'replace',
          target: {
            mode: editTargetMode,
            exactText:
              typeof editTarget.exactText === 'string'
                ? editTarget.exactText
                : undefined,
            occurrence:
              typeof editTarget.occurrence === 'number'
                ? editTarget.occurrence
                : undefined,
            useLastMatch: editTarget.useLastMatch === true ? true : undefined,
          },
          replacementMarkdown:
            typeof input.replacementMarkdown === 'string'
              ? input.replacementMarkdown
              : undefined,
          expectedText:
            typeof input.expectedText === 'string'
              ? input.expectedText
              : undefined,
        })
      }

      if (!output) return
      if (toolCall.toolName !== 'readArticleContent')
        markToolCallApplied(toolCallId)

      void addToolOutput({
        tool: toolCall.toolName,
        toolCallId,
        ...(output.status === 'success'
          ? { output }
          : { state: 'output-error' as const, errorText: output.message }),
        options: {
          body: {
            context: getContextRef.current(),
            sessionId: activeSessionIdRef.current,
          },
        },
      })
    },
    onData(dataPart) {
      if (dataPart.type === 'data-status') {
        setStreamStatus(dataPart.data)
        return
      }
      if (dataPart.type === 'data-imageResult') {
        setStreamImageResults((current) => ({
          ...current,
          [dataPart.data.toolCallId]: dataPart.data.output,
        }))
      }
    },
    onError(nextError) {
      toast.error(nextError.message || 'AI 对话失败')
    },
    onFinish({ messages: nextMessages }) {
      setStreamStatus(null)
      persistSessions((current) =>
        updateSessionMessages(
          current,
          activeSessionIdRef.current,
          nextMessages,
          getContextRef.current(),
        ),
      )
    },
  })

  const busy = status === 'submitted' || status === 'streaming'
  const visibleMessages = useMemo(
    () => messages.filter(hasVisibleMessageContent),
    [messages],
  )
  const _lastMessage = messages[messages.length - 1]
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant')
  const lastAssistantText = lastAssistantMessage
    ? getMessageText(lastAssistantMessage).trim()
    : ''

  const setComposerInput = useCallback((value: string) => {
    setInput(value)
  }, [])

  const persistActiveMessages = useCallback(
    (nextMessages: EditorAiChatMessage[]) => {
      if (!activeSessionId) return
      persistSessions((current) =>
        updateSessionMessages(
          current,
          activeSessionId,
          nextMessages,
          getContextRef.current(),
        ),
      )
    },
    [activeSessionId, persistSessions],
  )

  useEffect(() => {
    const rawContext = getContext()
    const nextDocumentKey = normalizeEditorAiDocumentKey(rawContext.documentKey)
    if (nextDocumentKey === documentKeyRef.current) return
    if (busy) return

    const previousDocumentKey = documentKeyRef.current
    const previousSessions = sessionsRef.current
    const previousMessages = messages
    const previousSessionId = activeSessionIdRef.current
    const previousSessionsForStorage = updateSessionMessages(
      previousSessions,
      previousSessionId,
      previousMessages,
      { ...rawContext, documentKey: previousDocumentKey },
    )
    const nextContext = {
      ...rawContext,
      documentKey: nextDocumentKey,
    }
    const nextStorageKey = buildEditorAiChatStorageKey(nextDocumentKey)
    const storedNextSessions = normalizeStoredSessions(
      readStoredHistory<EditorAiChatSession>(nextStorageKey),
      nextContext,
    )
    const shouldMigrateUnsavedSessions =
      isDraftEditorAiDocumentKey(previousDocumentKey) ||
      (nextDocumentKey.startsWith('post:') &&
        !previousDocumentKey.startsWith('post:'))
    const shouldMigrateSessions =
      shouldMigrateUnsavedSessions &&
      storedNextSessions.length === 0 &&
      previousSessionsForStorage.some((session) => session.messages.length > 0)
    const nextSessions = shouldMigrateSessions
      ? previousSessionsForStorage.map((session) => ({
          ...session,
          documentKey: nextDocumentKey,
          documentTitle: getContextTitle(nextContext),
          contextSnapshot: buildContextSnapshot(nextContext),
        }))
      : storedNextSessions.length > 0
        ? storedNextSessions
        : [createSession(nextContext)]
    const nextActiveSession = shouldMigrateSessions
      ? nextSessions.find((session) => session.id === previousSessionId) ||
        nextSessions[0]
      : nextSessions[0]

    switchingSessionRef.current = true
    writeStoredHistory(chatStorageKeyRef.current, previousSessionsForStorage)
    writeStoredHistory(nextStorageKey, nextSessions)
    sessionsRef.current = nextSessions
    documentKeyRef.current = nextDocumentKey
    chatStorageKeyRef.current = nextStorageKey
    activeSessionIdRef.current = nextActiveSession.id
    appliedToolCallIdsRef.current = new Set(
      nextActiveSession.appliedToolCallIds,
    )

    window.setTimeout(() => {
      setSessions(nextSessions)
      setActiveSessionId(nextActiveSession.id)
      setMessages(nextActiveSession.messages)
      setHistoryOpen(false)
      setStreamImageResults({})
      clearError()
      setStreamStatus(null)

      switchingSessionRef.current = false
    }, 0)
  }, [busy, clearError, getContext, messages, setMessages])

  useEffect(() => {
    const handleHistoryUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        storageKey?: string
        items?: EditorAiChatSession[]
      }>
      if (customEvent.detail?.storageKey !== chatStorageKeyRef.current) return
      const nextSessions = normalizeStoredSessions(customEvent.detail.items, {
        ...getContextRef.current(),
        documentKey: documentKeyRef.current,
      })
      sessionsRef.current = nextSessions
      setSessions(nextSessions)
    }

    window.addEventListener(LOCAL_HISTORY_UPDATED_EVENT, handleHistoryUpdated)
    return () =>
      window.removeEventListener(
        LOCAL_HISTORY_UPDATED_EVENT,
        handleHistoryUpdated,
      )
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, status])

  useEffect(() => {
    if (!hydratedRef.current || switchingSessionRef.current) return
    if (status === 'ready' || status === 'error') {
      persistActiveMessages(messages)
    }
  }, [messages, persistActiveMessages, status])

  useEffect(() => {
    for (const message of messages) {
      if (message.role !== 'assistant') continue
      for (const part of message.parts) {
        if (
          part.type !== 'tool-generateArticleImage' &&
          !isImageResultDataPart(part)
        )
          continue
        const toolCallId =
          part.type === 'tool-generateArticleImage'
            ? part.toolCallId
            : part.data.toolCallId
        if (appliedToolCallIdsRef.current.has(toolCallId)) continue

        const output =
          part.type === 'tool-generateArticleImage'
            ? streamImageResults[part.toolCallId] || getImageToolOutput(part)
            : part.data.output
        if (!output) continue
        if (output.status !== 'success' || !output.insertTarget) continue
        markToolCallApplied(toolCallId)
        const result = onInsertImage(
          output.url,
          output.alt,
          output.insertTarget,
        )
        if (result.status === 'success') {
          toast.success(result.message)
        } else {
          toast.error(result.message)
        }
      }
    }
  }, [markToolCallApplied, messages, onInsertImage, streamImageResults, toast])

  const switchToSession = useCallback(
    (session: EditorAiChatSession) => {
      if (busy || session.id === activeSessionId) return
      persistActiveMessages(messages)
      switchingSessionRef.current = true
      activeSessionIdRef.current = session.id
      appliedToolCallIdsRef.current = new Set(session.appliedToolCallIds)
      clearError()
      setStreamStatus(null)
      setStreamImageResults({})
      setActiveSessionId(session.id)
      setMessages(session.messages)
      setHistoryOpen(false)
      window.setTimeout(() => {
        switchingSessionRef.current = false
      }, 0)
    },
    [
      activeSessionId,
      busy,
      clearError,
      messages,
      persistActiveMessages,
      setMessages,
    ],
  )

  const startNewSession = useCallback(() => {
    if (busy) return
    persistActiveMessages(messages)
    const session = createSession(getContextRef.current())

    switchingSessionRef.current = true
    activeSessionIdRef.current = session.id
    appliedToolCallIdsRef.current = new Set(session.appliedToolCallIds)
    clearError()
    setStreamStatus(null)
    setInput('')
    setStreamImageResults({})
    setActiveSessionId(session.id)
    setMessages([])
    persistSessions((current) => [session, ...current])
    setHistoryOpen(false)
    window.setTimeout(() => {
      switchingSessionRef.current = false
    }, 0)
  }, [
    busy,
    clearError,
    messages,
    persistActiveMessages,
    persistSessions,
    setMessages,
  ])

  const deleteSession = useCallback(
    (sessionId: string) => {
      if (busy) return
      const remaining = sessions.filter((session) => session.id !== sessionId)
      const fallback = remaining[0] || createSession(getContextRef.current())
      const nextSessions = remaining.length > 0 ? remaining : [fallback]

      switchingSessionRef.current = true
      sessionsRef.current = nextSessions
      setSessions(nextSessions)
      writeStoredHistory(chatStorageKeyRef.current, nextSessions)

      if (sessionId === activeSessionId) {
        activeSessionIdRef.current = fallback.id
        appliedToolCallIdsRef.current = new Set(fallback.appliedToolCallIds)
        clearError()
        setStreamStatus(null)
        setStreamImageResults({})
        setActiveSessionId(fallback.id)
        setMessages(fallback.messages)
      }

      window.setTimeout(() => {
        switchingSessionRef.current = false
      }, 0)
    },
    [activeSessionId, busy, clearError, sessions, setMessages],
  )

  const sendPrompt = async (prompt: string) => {
    const text = prompt.trim()
    if (!text || busy) return

    clearError()
    setStreamStatus({ label: '正在发送', stage: 'connecting' })
    setInput('')
    try {
      await sendMessage(
        { text },
        {
          body: {
            context: getContext(),
            sessionId: activeSessionIdRef.current,
            profileId: selectedTextProfileIdRef.current,
            imageProfileId: selectedImageProfileIdRef.current,
          },
        },
      )
    } catch (nextError) {
      toast.error(
        nextError instanceof Error ? nextError.message : 'AI 对话发送失败',
      )
      setStreamStatus(null)
    }
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('已复制')
    } catch {
      toast.error('复制失败')
    }
  }

  const handleRegenerate = async () => {
    if (busy || messages.length === 0) return
    clearError()
    setStreamStatus({ label: '正在重新生成', stage: 'connecting' })
    try {
      await regenerate({
        body: {
          context: getContext(),
          sessionId: activeSessionIdRef.current,
          profileId: selectedTextProfileIdRef.current,
          imageProfileId: selectedImageProfileIdRef.current,
        },
      })
    } catch (nextError) {
      toast.error(
        nextError instanceof Error ? nextError.message : '重新生成失败',
      )
      setStreamStatus(null)
    }
  }

  const handleClearCurrent = () => {
    if (busy || messages.length === 0) return
    clearError()
    setStreamStatus(null)
    setStreamImageResults({})
    setMessages([])
    persistActiveMessages([])
  }

  const displayStatus = busy
    ? streamStatus?.label ||
      (status === 'submitted' ? '正在连接模型' : '正在生成')
    : ''
  const shouldShowDisplayStatus = Boolean(displayStatus)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[var(--editor-line)] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--editor-ink)]">
              <WandSparkles className="h-4 w-4 text-[var(--editor-accent)]" />
              AI 对话
            </div>
            <div className="mt-1 truncate text-xs text-[var(--stone-gray)]">
              {sessions.find((session) => session.id === activeSessionId)
                ?.title || '新对话'}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setHistoryOpen((value) => !value)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--editor-line)] text-[var(--editor-muted)] transition hover:text-[var(--editor-ink)]"
              title="历史对话"
              aria-label="历史对话"
            >
              <History className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={startNewSession}
              disabled={busy}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--editor-line)] text-[var(--editor-muted)] transition hover:text-[var(--editor-ink)] disabled:cursor-not-allowed disabled:opacity-40"
              title="新对话"
              aria-label="新对话"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            {busy ? (
              <button
                type="button"
                onClick={() => void stop()}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--editor-line)] text-[var(--editor-muted)] transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)]"
                title="停止生成"
                aria-label="停止生成"
              >
                <Square className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleRegenerate()}
                disabled={messages.length === 0}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--editor-line)] text-[var(--editor-muted)] transition hover:text-[var(--editor-ink)] disabled:cursor-not-allowed disabled:opacity-40"
                title="重新生成"
                aria-label="重新生成"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleClearCurrent}
              disabled={busy || messages.length === 0}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--editor-line)] text-[var(--editor-muted)] transition hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
              title="清空当前对话"
              aria-label="清空当前对话"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {historyOpen ? (
          <div className="mt-3 max-h-52 overflow-y-auto rounded-lg border border-[var(--editor-line)] bg-[var(--editor-panel)]">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center gap-2 border-b border-[var(--editor-line)] px-2 py-2 last:border-b-0 ${
                  session.id === activeSessionId
                    ? 'bg-[var(--editor-soft)]'
                    : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => switchToSession(session)}
                  className="min-w-0 flex-1 text-left"
                  disabled={busy}
                >
                  <div className="truncate text-xs font-medium text-[var(--editor-ink)]">
                    {session.title}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[var(--stone-gray)]">
                    <span className="truncate">{session.documentTitle}</span>
                    <span className="shrink-0">
                      {formatSessionTime(session.updatedAt)}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => deleteSession(session.id)}
                  disabled={busy}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--editor-muted)] opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
                  title="删除对话"
                  aria-label="删除对话"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {visibleMessages.length === 0 ? (
          <div className="space-y-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void sendPrompt(prompt)}
                disabled={busy}
                className="w-full rounded-lg border border-[var(--editor-line)] bg-[var(--editor-panel)] px-3 py-2 text-left text-xs leading-5 text-[var(--editor-ink)] transition hover:border-[var(--editor-accent)]/50 hover:bg-[var(--editor-soft)] disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {visibleMessages.map((message) => {
              const text = getMessageText(message).trim()
              const isAssistant = message.role === 'assistant'
              const imageResultParts = message.parts.filter(
                isImageResultDataPart,
              )
              const imageResultMap = new Map(
                imageResultParts.map(
                  (part) => [part.data.toolCallId, part.data.output] as const,
                ),
              )
              const imageToolCallIds = new Set(
                message.parts
                  .filter(
                    (part): part is EditorAiImageToolPart =>
                      part.type === 'tool-generateArticleImage',
                  )
                  .map((part) => part.toolCallId),
              )

              return (
                <article key={message.id} className="space-y-2">
                  <div
                    className={`text-xs font-semibold ${isAssistant ? 'text-[var(--editor-accent)]' : 'text-[var(--editor-ink)]'}`}
                  >
                    {getMessageLabel(message)}
                  </div>

                  <div className="space-y-2">
                    {message.parts.map((part, index) => {
                      if (part.type === 'text') {
                        if (!part.text.trim()) return null
                        return (
                          <MessageMarkdown
                            key={`${message.id}-text-${index}`}
                            markdown={part.text}
                            isAssistant={isAssistant}
                          />
                        )
                      }

                      if (part.type === 'tool-generateArticleImage') {
                        return (
                          <ImageToolCard
                            key={part.toolCallId}
                            part={part}
                            output={
                              streamImageResults[part.toolCallId] ||
                              imageResultMap.get(part.toolCallId)
                            }
                            onInsertImage={onInsertImage}
                            onCopy={(value) => void handleCopy(value)}
                          />
                        )
                      }

                      if (isImageResultDataPart(part)) {
                        if (imageToolCallIds.has(part.data.toolCallId))
                          return null
                        return (
                          <ImageResultCard
                            key={`${part.data.toolCallId}-result`}
                            toolCallId={part.data.toolCallId}
                            output={part.data.output}
                            onInsertImage={onInsertImage}
                            onCopy={(value) => void handleCopy(value)}
                          />
                        )
                      }

                      return null
                    })}
                  </div>

                  <MessageActions
                    text={text}
                    onCopy={() => void handleCopy(text)}
                    onInsert={() => onInsertText(text)}
                  />
                </article>
              )
            })}
            {shouldShowDisplayStatus ? (
              <div className="flex items-center gap-2 text-xs text-[var(--editor-muted)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {displayStatus}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {error ? (
        <div className="shrink-0 border-t border-rose-200 bg-rose-50 px-5 py-2 text-xs leading-5 text-rose-700">
          {error.message}
        </div>
      ) : null}

      {lastAssistantText ? (
        <div className="shrink-0 border-t border-[var(--editor-line)] px-5 py-2">
          <button
            type="button"
            onClick={() =>
              void sendPrompt(
                '基于刚才的回答，继续细化为更适合直接用于文章的版本。',
              )
            }
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md text-xs text-[var(--editor-accent)] transition hover:underline disabled:opacity-50"
          >
            <FileText className="h-3.5 w-3.5" />
            继续细化
          </button>
        </div>
      ) : null}

      <Composer
        busy={busy}
        input={input}
        textProfiles={textProfiles}
        imageProfiles={imageProfiles}
        selectedTextProfileId={selectedTextProfileId}
        selectedImageProfileId={selectedImageProfileId}
        onTextProfileChange={handleTextProfileChange}
        onImageProfileChange={handleImageProfileChange}
        onInputChange={setComposerInput}
        onSend={() => void sendPrompt(input)}
        onStop={() => void stop()}
      />
    </div>
  )
}

function updateSessionMessages(
  current: EditorAiChatSession[],
  activeSessionId: string,
  nextMessages: EditorAiChatMessage[],
  context: EditorAiChatContext,
) {
  const now = Date.now()
  const documentKey = normalizeEditorAiDocumentKey(context.documentKey)
  const storedMessages = sanitizeMessagesForStorage(nextMessages)
  const existing = current.find((session) => session.id === activeSessionId)

  if (!existing) {
    return [
      {
        ...createSession({ ...context, documentKey }, storedMessages),
        id: activeSessionId || createLocalId(),
        updatedAt: now,
      },
      ...current,
    ]
  }

  return current.map((session) => {
    if (session.id !== activeSessionId) return session
    return {
      ...session,
      documentKey,
      title: getSessionTitle(storedMessages) || session.title || '新对话',
      documentTitle: getContextTitle(context),
      messages: storedMessages,
      appliedToolCallIds: mergeToolCallIds(
        session.appliedToolCallIds,
        collectAppliedToolCallIdsFromMessages(storedMessages),
      ),
      contextSnapshot: buildContextSnapshot({ ...context, documentKey }),
      updatedAt: now,
    }
  })
}
