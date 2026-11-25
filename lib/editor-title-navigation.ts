import type { KeyboardEvent } from 'react'

type TitleTextareaLike = Pick<
  HTMLTextAreaElement,
  'selectionStart' | 'selectionEnd' | 'value'
>

export function isTitleEndEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (
    event.key !== 'Enter' ||
    event.shiftKey ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.nativeEvent.isComposing
  ) {
    return false
  }

  return isTextareaSelectionAtEnd(event.currentTarget)
}

export function isTextareaSelectionAtEnd(textarea: TitleTextareaLike) {
  const end = textarea.value.length
  return textarea.selectionStart === end && textarea.selectionEnd === end
}

export function focusEditorDocumentStart(
  editor:
    | {
        chain: () => {
          focus: (
            position: number,
            options: { scrollIntoView: false },
          ) => { run: () => void }
        }
      }
    | null
    | undefined,
) {
  editor?.chain().focus(1, { scrollIntoView: false }).run()
}
