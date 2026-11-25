import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react'
import type { JSONContent } from 'novel'
import { EMPTY_DOCUMENT, SIDEBAR_KEY } from '@/components/editor/shared'
import { normalizeWechatPublishingHtml } from '@/lib/wechat-publishing-enhancements'

interface UseNovelEditorInitOptions {
  initialData?: {
    title?: string
    html?: string
  }
  latestTitleRef: MutableRefObject<string>
  setTitle: Dispatch<SetStateAction<string>>
  setPreviewHtml: Dispatch<SetStateAction<string>>
  setInitialContent: Dispatch<SetStateAction<JSONContent>>
  setDraftReady: Dispatch<SetStateAction<boolean>>
  setSidebarOpen: Dispatch<SetStateAction<boolean>>
}

export function useNovelEditorInit({
  initialData,
  latestTitleRef,
  setTitle,
  setPreviewHtml,
  setInitialContent,
  setDraftReady,
  setSidebarOpen,
}: UseNovelEditorInitOptions) {
  useEffect(() => {
    if (initialData) {
      const initialHtml = normalizeWechatPublishingHtml(initialData.html || '')
      latestTitleRef.current = initialData.title || ''
      setTitle(initialData.title || '')
      setPreviewHtml(initialHtml)
      setInitialContent(EMPTY_DOCUMENT)
    } else {
      // 新文章，使用空文档
      setPreviewHtml('')
      setInitialContent(EMPTY_DOCUMENT)
    }
    setDraftReady(true)

    // Load sidebar preference
    if (typeof window !== 'undefined') {
      setSidebarOpen(window.localStorage.getItem(SIDEBAR_KEY) === 'true')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
