'use client'

export {
  formatChineseCopywritingInEditor,
  type ChineseCopywritingScope,
} from '@/lib/editor/formatting/copywriting'

export {
  TRIGGER_AI_MODAL_EVENT,
  TRIGGER_FILE_UPLOAD_EVENT,
  TRIGGER_IMAGE_GENERATION_EVENT,
  TRIGGER_IMAGE_UPLOAD_EVENT,
  TRIGGER_INPUT_MODAL_EVENT,
} from './editor-events'
export type {
  InputModalDetail,
  TriggerAIModalDetail,
  TriggerImageGenerationDetail,
} from './editor-events'

export { suggestionItems } from '@/lib/editor/menus/suggestion-items'
export { SlashMenu } from '@/lib/editor/menus/slash-menu'
export {
  FormattingBubble,
  EditorFooter,
  type DraftSaveStatus,
} from '@/lib/editor/menus/formatting-bubble'

export {
  createEditorExtensions,
  editorExtensions,
  buildEditorProps,
  type EditorExtensionOptions,
} from '@/lib/editor/extensions/create-editor-extensions'
