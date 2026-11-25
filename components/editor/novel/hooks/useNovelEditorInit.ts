import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react'
import type { JSONContent } from 'novel'
import { EMPTY_DOCUMENT, SIDEBAR_KEY } from '@/components/editor/shared'

interface UseNovelEditorInitOptions {
  initialData?: {
    title?: string
    html?: string
  }
  latestTitleRef: MutableRefObject<string>
  setTitle: Dispatch<SetStateAction<string>>
  setInitialContent: Dispatch<SetStateAction<JSONContent>>
  setDraftReady: Dispatch<SetStateAction<boolean>>
  setSidebarOpen: Dispatch<SetStateAction<boolean>>
}

export function useNovelEditorInit({
  initialData,
  latestTitleRef,
  setTitle,
  setInitialContent,
  setDraftReady,
  setSidebarOpen,
}: UseNovelEditorInitOptions) {
  useEffect(() => {
    if (initialData) {
      latestTitleRef.current = initialData.title || ''
      setTitle(initialData.title || '')
      setInitialContent(EMPTY_DOCUMENT)
    } else {
      setInitialContent(EMPTY_DOCUMENT)
    }
    setDraftReady(true)

    if (typeof window !== 'undefined') {
      setSidebarOpen(window.localStorage.getItem(SIDEBAR_KEY) === 'true')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
