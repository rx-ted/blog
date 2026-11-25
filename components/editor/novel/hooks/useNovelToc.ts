import { useCallback, useEffect, useMemo, useState } from 'react'
import type { EditorInstance } from 'novel'
import { extractTocFromTiptapDoc, type ArticleTocItem } from '@/lib/article-toc'
import {
  TOC_COLLAPSED_KEY,
  syncEditorHeadingAnchors,
} from '@/components/editor/shared'

export function useNovelToc(editorRef: React.RefObject<EditorInstance | null>) {
  const [tocItems, setTocItems] = useState<ArticleTocItem[]>([])
  const [activeTocId, setActiveTocId] = useState('')
  const [tocCollapsed, setTocCollapsed] = useState(false)

  const activeTocItem = useMemo(
    () => tocItems.find((item) => item.id === activeTocId) || null,
    [activeTocId, tocItems],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    setTocCollapsed(window.localStorage.getItem(TOC_COLLAPSED_KEY) === 'true')
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(TOC_COLLAPSED_KEY, String(tocCollapsed))
  }, [tocCollapsed])

  const refreshToc = useCallback((editor: EditorInstance | null) => {
    const items = extractTocFromTiptapDoc(editor?.state.doc)
    setTocItems(items)
    setActiveTocId((currentId) => {
      if (items.length === 0) return ''
      if (currentId && items.some((item) => item.id === currentId))
        return currentId
      return items[0]?.id || ''
    })
    window.requestAnimationFrame(() => {
      syncEditorHeadingAnchors(editor?.view.dom as HTMLElement | null, items)
    })
  }, [])

  const scrollToTocItem = useCallback(
    (item: ArticleTocItem) => {
      setActiveTocId(item.id)

      const editor = editorRef.current
      if (!editor) return

      const rawPos = Number.isFinite(item.pos) ? Number(item.pos) : 1
      const selectionPos = Math.min(
        Math.max(rawPos + 1, 1),
        editor.state.doc.content.size,
      )
      editor.chain().focus().setTextSelection(selectionPos).run()

      window.requestAnimationFrame(() => {
        try {
          const coords = editor.view.coordsAtPos(selectionPos)
          window.scrollTo({
            top: Math.max(0, coords.top + window.scrollY - 82),
            behavior: 'smooth',
          })
          return
        } catch {}

        const target = editor.view.dom.querySelector<HTMLElement>(
          `#${CSS.escape(item.id)}`,
        )
        if (target) {
          const top = target.getBoundingClientRect().top + window.scrollY - 82
          window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
        }
      })
    },
    [editorRef],
  )

  return {
    tocItems,
    activeTocId,
    setActiveTocId,
    tocCollapsed,
    setTocCollapsed,
    activeTocItem,
    refreshToc,
    scrollToTocItem,
  }
}
