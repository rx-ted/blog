type KeyboardCompositionState = Pick<
  KeyboardEvent,
  'isComposing' | 'key' | 'keyCode'
>

export function isImeCompositionKeyEvent(event: KeyboardCompositionState) {
  return event.isComposing || event.key === 'Process' || event.keyCode === 229
}

export function shouldRunEditorCommandNavigation(
  event: KeyboardCompositionState,
) {
  return !isImeCompositionKeyEvent(event)
}
