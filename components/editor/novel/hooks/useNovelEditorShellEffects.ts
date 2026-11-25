import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react'
import { SIDEBAR_KEY } from '@/components/editor/shared'

interface UseNovelEditorShellEffectsOptions {
  sidebarOpen: boolean
  setTick: Dispatch<SetStateAction<number>>
  title: string
  draftReady: boolean
  editSlug: string | null
  titleRef: RefObject<HTMLTextAreaElement | null>
  publishPanelOpen: boolean
  copywritingMenuOpen: boolean
  setPublishPanelOpen: Dispatch<SetStateAction<boolean>>
  setCopywritingMenuOpen: Dispatch<SetStateAction<boolean>>
  publishPanelRef: RefObject<HTMLDivElement | null>
  copywritingMenuRef: RefObject<HTMLDivElement | null>
  onSaveShortcut: () => void
}

export function useNovelEditorShellEffects({
  sidebarOpen,
  setTick,
  title,
  draftReady,
  editSlug,
  titleRef,
  publishPanelOpen,
  copywritingMenuOpen,
  setPublishPanelOpen,
  setCopywritingMenuOpen,
  publishPanelRef,
  copywritingMenuRef,
  onSaveShortcut,
}: UseNovelEditorShellEffectsOptions) {
  // Persist sidebar preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SIDEBAR_KEY, String(sidebarOpen))
    }
  }, [sidebarOpen])

  // Relative time ticker
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 30000)
    return () => window.clearInterval(id)
  }, [setTick, title])

  // Auto-focus title on new post
  useEffect(() => {
    if (draftReady && !editSlug && titleRef.current) {
      titleRef.current.focus()
    }
  }, [draftReady, editSlug, titleRef])

  // Click outside to close floating header panels
  useEffect(() => {
    if (!publishPanelOpen && !copywritingMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (publishPanelRef.current && !publishPanelRef.current.contains(e.target as Node)) {
        setPublishPanelOpen(false)
      }
      if (copywritingMenuRef.current && !copywritingMenuRef.current.contains(e.target as Node)) {
        setCopywritingMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [copywritingMenuOpen, publishPanelOpen, publishPanelRef, copywritingMenuRef, setCopywritingMenuOpen, setPublishPanelOpen])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        onSaveShortcut()
      }
      if (e.key === 'Escape') {
        setPublishPanelOpen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onSaveShortcut, setPublishPanelOpen])
}
