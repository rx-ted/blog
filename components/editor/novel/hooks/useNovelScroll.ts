import { useCallback, useEffect, useRef, useState } from 'react'
import type { WechatExportTheme } from '@/lib/wechat-themes'
import {
  resizeTextareaHeight,
  useAutoResizeTextarea,
} from '@/lib/textarea-autosize'

interface UseNovelScrollOptions {
  title: string
  previewHtml: string
  selectedWechatTheme: WechatExportTheme
  draftReady: boolean
  sidebarOpen: boolean
  titleRef: React.RefObject<HTMLTextAreaElement | null>
}

export function useNovelScroll({
  title,
  previewHtml,
  selectedWechatTheme,
  draftReady,
  sidebarOpen,
  titleRef,
}: UseNovelScrollOptions) {
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false)
  const [mobileWechatPreviewHtml, setMobileWechatPreviewHtml] = useState('')
  const [mobileWechatPreviewError, setMobileWechatPreviewError] =
    useState(false)
  const [mobileWechatPreviewRetry, setMobileWechatPreviewRetry] = useState(0)
  const editorScrollAreaRef = useRef<HTMLDivElement>(null)
  const mobilePreviewScrollRef = useRef<HTMLDivElement>(null)

  useAutoResizeTextarea(titleRef)

  useEffect(() => {
    resizeTextareaHeight(titleRef.current)
  }, [title, sidebarOpen, mobilePreviewOpen, draftReady, titleRef])

  const syncMobilePreviewScroll = useCallback(() => {
    const source = editorScrollAreaRef.current
    const target = mobilePreviewScrollRef.current
    if (!source || !target) return

    const headerOffset = 56
    const rect = source.getBoundingClientRect()
    const sourceTop = window.scrollY + rect.top
    const sourceViewport = Math.max(1, window.innerHeight - headerOffset)
    const sourceScrollable = Math.max(1, source.scrollHeight - sourceViewport)
    const sourceProgress = Math.min(
      1,
      Math.max(
        0,
        (window.scrollY + headerOffset - sourceTop) / sourceScrollable,
      ),
    )
    const targetScrollable = Math.max(
      0,
      target.scrollHeight - target.clientHeight,
    )
    target.scrollTop = targetScrollable * sourceProgress
  }, [])

  useEffect(() => {
    if (!mobilePreviewOpen) return

    let frame: number | null = null
    const requestSync = () => {
      if (frame !== null) return
      frame = window.requestAnimationFrame(() => {
        frame = null
        syncMobilePreviewScroll()
      })
    }

    requestSync()
    window.addEventListener('scroll', requestSync, { passive: true })
    window.addEventListener('resize', requestSync)

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', requestSync)
      window.removeEventListener('resize', requestSync)
    }
  }, [mobilePreviewOpen, previewHtml, title, syncMobilePreviewScroll])

  useEffect(() => {
    if (!mobilePreviewOpen) return

    let cancelled = false
    setMobileWechatPreviewHtml('')
    setMobileWechatPreviewError(false)
    void import('@/lib/wechat-copy')
      .then(async ({ buildWechatPreviewArticleHtml }) => {
        if (cancelled) return
        const baseHtml = buildWechatPreviewArticleHtml(
          title.trim() || '无标题',
          previewHtml || '<p></p>',
          {
            theme: selectedWechatTheme,
          },
        )
        setMobileWechatPreviewHtml(baseHtml)
        const { renderVisualDiagramsInHtml } = await import(
          '@/lib/content-enhancers'
        )
        const renderedHtml = await renderVisualDiagramsInHtml(baseHtml)
        if (!cancelled) setMobileWechatPreviewHtml(renderedHtml)
      })
      .catch(() => {
        if (!cancelled) setMobileWechatPreviewError(true)
      })

    return () => {
      cancelled = true
    }
  }, [
    mobilePreviewOpen,
    previewHtml,
    selectedWechatTheme,
    title,
    mobileWechatPreviewRetry,
  ])

  return {
    mobilePreviewOpen,
    setMobilePreviewOpen,
    mobileWechatPreviewHtml,
    mobileWechatPreviewError,
    mobileWechatPreviewRetry,
    setMobileWechatPreviewRetry,
    editorScrollAreaRef,
    mobilePreviewScrollRef,
  }
}
