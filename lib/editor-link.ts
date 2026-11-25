import { TiptapLink } from 'novel'
import { createEditorAutolinkPlugin } from './editor-autolink'
import { editorLinkInclusive } from './editor-link-config'

// Keep autolink enabled, but don't let adjacent typing inherit the link mark.
export const EditorLink = TiptapLink.extend({
  inclusive() {
    return editorLinkInclusive()
  },

  addProseMirrorPlugins() {
    return [...(this.parent?.() || []), createEditorAutolinkPlugin(this.type)]
  },
})
