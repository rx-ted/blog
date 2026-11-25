import { describe, expect, it, vi } from 'vitest'

import {
  focusEditorDocumentStart,
  isTextareaSelectionAtEnd,
} from '@/lib/editor-title-navigation'

describe('editor title navigation', () => {
  it('detects a collapsed selection at the title end', () => {
    expect(
      isTextareaSelectionAtEnd({
        value: '标题',
        selectionStart: 2,
        selectionEnd: 2,
      }),
    ).toBe(true)
    expect(
      isTextareaSelectionAtEnd({
        value: '标题',
        selectionStart: 1,
        selectionEnd: 1,
      }),
    ).toBe(false)
    expect(
      isTextareaSelectionAtEnd({
        value: '标题',
        selectionStart: 0,
        selectionEnd: 2,
      }),
    ).toBe(false)
  })

  it('focuses the first editable document position', () => {
    const run = vi.fn()
    const focus = vi.fn(() => ({ run }))
    const chain = vi.fn(() => ({ focus }))

    focusEditorDocumentStart({ chain })

    expect(chain).toHaveBeenCalledOnce()
    expect(focus).toHaveBeenCalledWith(1, { scrollIntoView: false })
    expect(run).toHaveBeenCalledOnce()
  })
})
