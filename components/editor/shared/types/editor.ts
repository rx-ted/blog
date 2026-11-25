export interface EditorHeading {
  id: string
  text: string
  level: number
}

export interface EditorContentSnapshot {
  contentJson: unknown
  html: string
  plainText: string
  markdown: string
}

/**
 * Minimal editor adapter for shared business scenarios.
 * First version: covers existing shared/editor-agnostic needs only.
 * Do not add speculative methods; extend when a second editor requires them.
 */
export interface EditorAdapter<TDocument = unknown> {
  /** Native document; editor-specific logic only. */
  getDocument(): TDocument

  /** Markdown representation for exchange/AI/preview flows. */
  getMarkdown(): string

  /** Replace content from Markdown. May be lossy depending on editor. */
  setMarkdown(markdown: string): void

  /** Current selected text, or empty string. */
  getSelectedText(): string

  /** Insert content at the editor's current insertion point. */
  insertContent(content: string): void

  /** Replace the current selection. */
  replaceSelection(content: string): void

  /** Headings for TOC/AI context. */
  getHeadings(): EditorHeading[]

  /** Focus the editor when ready. */
  focus?(): void

  /** Subscribe to document changes. Returns unsubscribe. */
  subscribe?(listener: () => void): () => void

  /** Optional snapshot for save/autosave flows. */
  getContentSnapshot?(): EditorContentSnapshot
}
