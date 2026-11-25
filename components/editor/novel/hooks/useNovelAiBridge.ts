import { useCallback } from 'react'
import type { EditorInstance } from 'novel'
import type { ArticleTocItem } from '@/lib/article-toc'
import { formatTocForAi, formatTocItemForAi } from '@/lib/article-toc'
import {
  renderMarkdownToEditorHtml,
  replaceEditorRangeWithMarkdown,
} from '@/lib/editor-markdown'
import { resolveExactTextRangeInDoc } from '@/lib/editor-ai-edit'
import { insertGeneratedImageAtPosition } from '@/lib/editor-file-upload'
import { normalizePostSlug } from '@/lib/post-utils'
import { resizeTextareaHeight } from '@/lib/textarea-autosize'
import {
  findSectionInsertPosition,
  type DraftMetaState,
  type EditorAiEditArticleContentInput,
  type EditorAiReadArticleContentOutput,
  type EditorAiToolInsertTarget,
  type EditorAiToolOutput,
} from '@/components/editor/shared'
import type { EditorAiChatContext } from '@/components/EditorAiChatPanel'

interface UseNovelAiBridgeOptions {
  editorRef: React.RefObject<EditorInstance | null>
  title: string
  latestTitleRef: React.MutableRefObject<string>
  titleRef: React.RefObject<HTMLTextAreaElement | null>
  description: string
  category: string
  tags: string[]
  slug: string
  editSlug: string | null
  postId: number | null
  tocItems: ArticleTocItem[]
  activeTocItem: ArticleTocItem | null
  draftAiDocumentKeyRef: React.RefObject<string>
  setTitle: (title: string) => void
  setDescription: (description: string) => void
  setTags: (tags: string[]) => void
  setTagInput: (value: string) => void
  markDirty: (metaOverrides?: Partial<DraftMetaState>) => void
}

export function useNovelAiBridge({
  editorRef,
  title,
  latestTitleRef,
  titleRef,
  description,
  category,
  tags,
  slug,
  editSlug,
  postId,
  tocItems,
  activeTocItem,
  draftAiDocumentKeyRef,
  setTitle,
  setDescription,
  setTags,
  setTagInput,
  markDirty,
}: UseNovelAiBridgeOptions) {
  const getSelectedEditorText = useCallback(() => {
    const editor = editorRef.current
    const selection = editor?.state.selection
    if (!editor || !selection || selection.empty) return ''
    return editor.state.doc
      .textBetween(selection.from, selection.to, '\n\n')
      .trim()
  }, [editorRef])

  const getEditorChatDocumentKey = useCallback(() => {
    if (postId) return `post:${postId}`
    const currentSlug = normalizePostSlug(slug) || editSlug
    if (currentSlug) return `slug:${currentSlug}`
    return draftAiDocumentKeyRef.current
  }, [draftAiDocumentKeyRef, editSlug, postId, slug])

  const getEditorChatContext = useCallback((): EditorAiChatContext => {
    const editor = editorRef.current
    return {
      documentKey: getEditorChatDocumentKey(),
      postId,
      title: title.trim(),
      documentText: editor?.getText({ blockSeparator: '\n\n' }).trim() || '',
      sectionToc: formatTocForAi(tocItems),
      currentSection: formatTocItemForAi(activeTocItem),
      selectedText: getSelectedEditorText(),
      description: description.trim(),
      category,
      tags,
      slug: normalizePostSlug(slug) || editSlug || '',
    }
  }, [
    activeTocItem,
    category,
    description,
    editSlug,
    getEditorChatDocumentKey,
    getSelectedEditorText,
    postId,
    slug,
    tags,
    title,
    tocItems,
    editorRef,
  ])

  const insertAiChatText = useCallback(
    (markdown: string) => {
      const editor = editorRef.current
      const trimmed = markdown.trim()
      if (!editor || !trimmed) return

      replaceEditorRangeWithMarkdown(editor, trimmed, {
        from: editor.state.selection.to,
        to: editor.state.selection.to,
      })
      markDirty()
    },
    [editorRef, markDirty],
  )

  const setAiChatTitle = useCallback(
    (nextTitle: string): EditorAiToolOutput => {
      const normalizedTitle = nextTitle.trim().replace(/\s+/g, ' ')
      if (!normalizedTitle) return { status: 'error', message: '标题不能为空' }

      setTitle(normalizedTitle)
      latestTitleRef.current = normalizedTitle
      window.requestAnimationFrame(() => resizeTextareaHeight(titleRef.current))
      markDirty()
      return { status: 'success', message: '已替换文章标题' }
    },
    [latestTitleRef, markDirty, setTitle, titleRef],
  )

  const setAiChatDescription = useCallback(
    (nextDescription: string): EditorAiToolOutput => {
      const normalizedDescription = nextDescription
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 300)
      if (!normalizedDescription)
        return { status: 'error', message: '摘要不能为空' }

      setDescription(normalizedDescription)
      markDirty({ description: normalizedDescription })
      return { status: 'success', message: '已更新文章摘要' }
    },
    [markDirty, setDescription],
  )

  const setAiChatTags = useCallback(
    (nextTags: string[]): EditorAiToolOutput => {
      const normalizedTags = nextTags
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 10)
      if (normalizedTags.length === 0)
        return { status: 'error', message: '标签不能为空' }

      setTagInput('')
      setTags(normalizedTags)
      markDirty({ tags: normalizedTags })
      return { status: 'success', message: '已更新文章标签' }
    },
    [markDirty, setTagInput, setTags],
  )

  const readAiChatArticleContent = useCallback(
    (
      scope: 'all' | 'selection' = 'all',
      maxChars?: number,
    ): EditorAiReadArticleContentOutput => {
      const editor = editorRef.current
      const limit = Number.isInteger(maxChars)
        ? Math.max(1000, Math.min(30000, Number(maxChars)))
        : 16000
      const selectedText = getSelectedEditorText()

      if (!editor) {
        return {
          status: 'error',
          message: '编辑器还没有准备好',
          scope,
          content: '',
          charCount: 0,
          truncated: false,
          title: title.trim(),
          sectionToc: formatTocForAi(tocItems),
          currentSection: formatTocItemForAi(activeTocItem),
          selectedText,
        }
      }

      const fullText = editor.getText({ blockSeparator: '\n\n' }).trim()
      const content = scope === 'selection' ? selectedText : fullText
      if (scope === 'selection' && !content) {
        return {
          status: 'error',
          message: '当前没有选中文本',
          scope,
          content: '',
          charCount: 0,
          truncated: false,
          title: title.trim(),
          sectionToc: formatTocForAi(tocItems),
          currentSection: formatTocItemForAi(activeTocItem),
          selectedText,
        }
      }

      return {
        status: 'success',
        message:
          scope === 'selection' ? '已读取当前选中文本' : '已读取当前文章正文',
        scope,
        content: content.slice(0, limit),
        charCount: content.length,
        truncated: content.length > limit,
        title: title.trim(),
        sectionToc: formatTocForAi(tocItems),
        currentSection: formatTocItemForAi(activeTocItem),
        selectedText,
      }
    },
    [activeTocItem, editorRef, getSelectedEditorText, title, tocItems],
  )

  const editAiChatArticleContent = useCallback(
    (input: EditorAiEditArticleContentInput): EditorAiToolOutput => {
      const editor = editorRef.current
      if (!editor) return { status: 'error', message: '编辑器还没有准备好' }

      const action = input.action === 'delete' ? 'delete' : 'replace'
      const targetMode = input.target?.mode
      const replacementMarkdown = input.replacementMarkdown?.trim() || ''
      const expectedText = input.expectedText?.trim() || ''

      if (action === 'replace' && !replacementMarkdown) {
        return { status: 'error', message: '替换内容不能为空' }
      }

      if (targetMode === 'all') {
        if (action === 'delete')
          return { status: 'error', message: '不能通过 AI 工具删除整篇正文' }
        const currentText = editor.getText({ blockSeparator: '\n\n' }).trim()
        if (expectedText && !currentText.includes(expectedText)) {
          return {
            status: 'error',
            message: '整篇正文已变化，安全校验未通过，请重新读取正文后再替换',
          }
        }

        editor.commands.setContent(
          renderMarkdownToEditorHtml(replacementMarkdown),
        )
        markDirty()
        return { status: 'success', message: '已替换整篇正文' }
      }

      let range: { from: number; to: number } | null = null
      let targetText = ''

      if (targetMode === 'selection') {
        const selection = editor.state.selection
        if (!selection || selection.empty)
          return { status: 'error', message: '当前没有选中文本' }
        range = { from: selection.from, to: selection.to }
        targetText = editor.state.doc
          .textBetween(selection.from, selection.to, '\n\n')
          .trim()
      } else if (targetMode === 'exactText') {
        const exactText = input.target?.exactText?.trim() || ''
        if (!exactText)
          return { status: 'error', message: '请提供要编辑的原文片段' }
        const resolved = resolveExactTextRangeInDoc(
          editor.state.doc,
          exactText,
          {
            occurrence: input.target?.occurrence,
            useLastMatch: input.target?.useLastMatch,
          },
        )

        if (resolved.status === 'ambiguous') {
          return {
            status: 'error',
            message: `这段原文在正文中出现了 ${resolved.matchCount} 次，请指定 occurrence 或选中目标段落后重试`,
          }
        }

        if (resolved.status === 'not_found') {
          return {
            status: 'error',
            message:
              '没有在当前正文中找到要编辑的原文片段，请重新读取正文后再试',
          }
        }

        range = { from: resolved.from, to: resolved.to }
        targetText = editor.state.doc
          .textBetween(resolved.from, resolved.to, '\n\n')
          .trim()
      } else {
        return { status: 'error', message: '正文编辑目标不完整' }
      }

      if (!range || range.from === range.to)
        return { status: 'error', message: '没有找到可编辑的正文范围' }
      if (expectedText && !targetText.includes(expectedText)) {
        return {
          status: 'error',
          message: '目标正文已变化，安全校验未通过，请重新读取正文后再编辑',
        }
      }

      if (action === 'delete') {
        editor.chain().focus().deleteRange(range).run()
        markDirty()
        return {
          status: 'success',
          message:
            targetMode === 'selection' ? '已删除选中文本' : '已删除匹配原文',
        }
      }

      const changed = replaceEditorRangeWithMarkdown(
        editor,
        replacementMarkdown,
        range,
      )
      if (!changed)
        return { status: 'error', message: '替换失败，请检查替换内容' }

      markDirty()
      return {
        status: 'success',
        message:
          targetMode === 'selection' ? '已替换选中文本' : '已替换匹配原文',
      }
    },
    [editorRef, markDirty],
  )

  const insertAiChatMarkdown = useCallback(
    (
      markdown: string,
      target?: EditorAiToolInsertTarget,
    ): EditorAiToolOutput => {
      const editor = editorRef.current
      const trimmed = markdown.trim()
      if (!editor) return { status: 'error', message: '编辑器还没有准备好' }
      if (!trimmed) return { status: 'error', message: '插入内容不能为空' }

      let insertPos = editor.state.selection.to
      if (target?.mode === 'section') {
        const sectionPos = findSectionInsertPosition(editor.state.doc, target)
        if (sectionPos === null) {
          return {
            status: 'error',
            message: '没有找到指定章节，请先把光标放到目标位置再重试',
          }
        }
        insertPos = sectionPos
      }

      replaceEditorRangeWithMarkdown(editor, trimmed, {
        from: insertPos,
        to: insertPos,
      })
      markDirty()
      return {
        status: 'success',
        message:
          target?.mode === 'section'
            ? '已插入到指定章节'
            : '已插入到当前光标位置',
      }
    },
    [editorRef, markDirty],
  )

  const insertAiChatImage = useCallback(
    (
      imageUrl: string,
      alt: string,
      target?: EditorAiToolInsertTarget,
    ): EditorAiToolOutput => {
      const editor = editorRef.current
      if (!editor) return { status: 'error', message: '编辑器还没有准备好' }
      if (!imageUrl) return { status: 'error', message: '图片地址为空' }

      let insertPos = editor.state.selection?.to ?? null
      if (target?.mode === 'section') {
        const sectionPos = findSectionInsertPosition(editor.state.doc, target)
        if (sectionPos === null) {
          return {
            status: 'error',
            message: '没有找到指定章节，图片已生成但未自动插入',
          }
        }
        insertPos = sectionPos
      }

      insertGeneratedImageAtPosition(
        editor,
        imageUrl,
        alt || 'AI 生成配图',
        insertPos,
      )
      markDirty()
      return {
        status: 'success',
        message:
          target?.mode === 'section'
            ? '图片已插入到指定章节'
            : '图片已插入到当前光标位置',
      }
    },
    [editorRef, markDirty],
  )

  return {
    getSelectedEditorText,
    getEditorChatDocumentKey,
    getEditorChatContext,
    insertAiChatText,
    setAiChatTitle,
    setAiChatDescription,
    setAiChatTags,
    readAiChatArticleContent,
    editAiChatArticleContent,
    insertAiChatMarkdown,
    insertAiChatImage,
  }
}
