import { useCallback } from 'react'
import type { EditorInstance } from 'novel'
import {
  formatChineseCopywritingInEditor,
  type ChineseCopywritingScope,
} from '@/lib/editor-extensions'
import { rememberPreferredWechatExportThemeId } from '@/lib/wechat-theme-client'
import type { WechatExportTheme } from '@/lib/wechat-themes'

interface UseNovelExportActionsOptions {
  editorRef: React.RefObject<EditorInstance | null>
  title: string
  selectedWechatTheme: WechatExportTheme
  setSelectedWechatThemeId: (id: string) => void
  setCopywritingMenuOpen: React.Dispatch<React.SetStateAction<boolean>>
  setWechatPublishOpen: React.Dispatch<React.SetStateAction<boolean>>
  markDirty: () => void
  toast: {
    success: (msg: string) => void
    error: (msg: string) => void
    info: (msg: string) => void
  }
}

export function useNovelExportActions({
  editorRef,
  title,
  selectedWechatTheme,
  setSelectedWechatThemeId,
  setCopywritingMenuOpen,
  setWechatPublishOpen,
  markDirty,
  toast,
}: UseNovelExportActionsOptions) {
  const getCurrentCopyExport = useCallback(() => {
    const editor = editorRef.current
    const normalizedTitle = title.trim() || '无标题'

    if (!editor) {
      return {
        title: normalizedTitle,
        html: '',
        hasContent: false,
      }
    }

    const content = editor.getText({ blockSeparator: '\n\n' }).trim()
    const html = editor.getHTML()
    const hasContent = content || /<(img|video|audio|iframe)\s/i.test(html)

    return {
      title: normalizedTitle,
      html,
      hasContent: Boolean(hasContent),
    }
  }, [editorRef, title])

  const handleDownloadPdf = useCallback(async () => {
    const exported = getCurrentCopyExport()

    if (!exported.hasContent) {
      toast.error('正文还是空的。')
      return
    }

    try {
      const { downloadArticleAsPdf } = await import('@/lib/wechat-copy')
      await downloadArticleAsPdf(exported.title, exported.html, {
        theme: selectedWechatTheme,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导出 PDF 失败')
    }
  }, [getCurrentCopyExport, selectedWechatTheme, toast])

  const handleWechatThemeChange = useCallback(
    (themeId: string) => {
      setSelectedWechatThemeId(themeId)
      rememberPreferredWechatExportThemeId(themeId)
    },
    [setSelectedWechatThemeId],
  )

  const handleFormatCopywriting = useCallback(
    (scope: ChineseCopywritingScope) => {
      const editor = editorRef.current
      if (!editor) {
        toast.error('编辑器还没准备好。')
        return
      }

      const changed = formatChineseCopywritingInEditor(editor, scope)
      setCopywritingMenuOpen(false)

      if (!changed) {
        toast.info(
          scope === 'document'
            ? '全文排版已是整理状态'
            : '当前段落已是整理状态',
        )
        return
      }

      markDirty()
      toast.success(scope === 'document' ? '已整理全文排版' : '已整理当前段落')
    },
    [editorRef, markDirty, setCopywritingMenuOpen, toast],
  )

  const handleOpenWechatPublish = useCallback(() => {
    const exported = getCurrentCopyExport()
    if (!exported.hasContent) {
      toast.error('正文还是空的。')
      return
    }
    setWechatPublishOpen(true)
  }, [getCurrentCopyExport, setWechatPublishOpen, toast])

  return {
    getCurrentCopyExport,
    handleDownloadPdf,
    handleWechatThemeChange,
    handleFormatCopywriting,
    handleOpenWechatPublish,
  }
}
