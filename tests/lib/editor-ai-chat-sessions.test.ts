import { describe, expect, it } from 'vitest'
import {
  buildEditorAiChatStorageKey,
  collectAppliedToolCallIdsFromMessages,
  isDraftEditorAiDocumentKey,
  mergeToolCallIds,
  normalizeEditorAiDocumentKey,
} from '@/lib/editor-ai-chat-sessions'

describe('editor ai chat sessions', () => {
  it('builds article-scoped storage keys', () => {
    expect(buildEditorAiChatStorageKey('post:42')).toBe(
      'qmblog:editor-ai-chat-sessions:v2:post%3A42',
    )
    expect(buildEditorAiChatStorageKey(' slug:hello world ')).toBe(
      'qmblog:editor-ai-chat-sessions:v2:slug%3Ahello%20world',
    )
  })

  it('normalizes empty document keys to a draft fallback', () => {
    expect(normalizeEditorAiDocumentKey('')).toBe('draft:unknown')
    expect(normalizeEditorAiDocumentKey(null)).toBe('draft:unknown')
    expect(isDraftEditorAiDocumentKey('draft:local-1')).toBe(true)
    expect(isDraftEditorAiDocumentKey('post:1')).toBe(false)
  })

  it('collects historical side-effect tool call ids so restored messages are display-only', () => {
    const messages = [
      {
        parts: [
          {
            type: 'tool-generateArticleImage',
            state: 'output-available',
            toolCallId: 'image-1',
            output: {
              status: 'success',
              insertTarget: { mode: 'section', sectionNumber: 2 },
            },
          },
          {
            type: 'tool-generateArticleImage',
            state: 'output-available',
            toolCallId: 'image-preview-only',
            output: {
              status: 'success',
            },
          },
          {
            type: 'data-imageResult',
            data: {
              toolCallId: 'image-stream-result',
              output: {
                status: 'success',
                insertTarget: { mode: 'section', sectionNumber: 3 },
              },
            },
          },
          {
            type: 'data-imageResult',
            data: {
              toolCallId: 'image-stream-preview-only',
              output: {
                status: 'success',
              },
            },
          },
          {
            type: 'tool-insertMarkdownIntoArticle',
            state: 'output-error',
            toolCallId: 'insert-1',
          },
        ],
      },
    ]

    expect(collectAppliedToolCallIdsFromMessages(messages)).toEqual([
      'image-1',
      'image-stream-result',
      'insert-1',
    ])
  })

  it('dedupes stored and inferred tool call ids', () => {
    expect(mergeToolCallIds(['a', 'b', 'a'], ['b', 'c'], ['', null])).toEqual([
      'a',
      'b',
      'c',
    ])
  })
})
