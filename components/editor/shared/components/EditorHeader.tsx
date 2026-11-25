import Link from 'next/link'
import { ArrowLeft, ChevronUp, Eye, FileDown, FileUp, Globe, ImageIcon, Link2, ListTree, Loader2, Lock, PanelRightClose, PanelRightOpen, Pilcrow, Smartphone, WandSparkles, X } from 'lucide-react'
import { CopyFormatDropdown } from '@/components/DownloadMarkdown'
import { PublishChannelMenu } from '@/components/PublishChannelMenu'
import { CategorySelector } from '@/components/CategorySelector'
import type { WechatExportTheme } from '@/lib/wechat-themes'
import type { EditorViewMode, PublishStatus, SaveFeedback } from '@/components/editor/shared'

interface StatusOption {
  key: PublishStatus
  label: string
  desc: string
  Icon: React.ComponentType<{ className?: string }>
}

const STATUS_CONFIG: StatusOption[] = [
  { key: 'public', label: '公开访问', desc: '所有人可见，出现在首页和搜索', Icon: Globe },
  { key: 'draft', label: '草稿自见', desc: '仅自己可见，不会发布', Icon: Eye },
  { key: 'encrypted', label: '加密访问', desc: '需要密码才能查看', Icon: Lock },
  { key: 'unlisted', label: '链接访问', desc: '不在首页显示，但可通过链接访问', Icon: Link2 },
]

export interface EditorHeaderStatusProps {
  saveStatusText: string
  saveStatusColor: string
  saveState: 'saved' | 'dirty' | 'saving' | 'error'
  charCount: number
  calcReadTime: (chars: number) => string
  uploadingImage: boolean
  uploadProgress: number
}

export interface EditorHeaderViewProps {
  editorViewMode: EditorViewMode
  onSwitchSource: () => void
  onSwitchPreview: () => void
  onSwitchWysiwyg: () => void
}

export interface EditorHeaderToolsProps {
  onImportMarkdown: () => void
  tocCollapsed: boolean
  tocItemsCount: number
  onToggleToc: () => void
  getCopyExport: () => { title: string; html: string; hasContent: boolean }
  wechatThemeId: string
  wechatTheme: WechatExportTheme
  onWechatPublish: () => void
  coverImage: string
  description: string
  onDownloadPdf: () => void
  copywritingMenuOpen: boolean
  onToggleCopywritingMenu: () => void
  copywritingMenuRef: React.RefObject<HTMLDivElement | null>
  onFormatCopywriting: (scope: 'block' | 'document') => void
  showSidebar: boolean
  sidebarTab: 'properties' | 'ai'
  onOpenAiChat: () => void
  onOpenImageTool: () => void
  mobilePreviewOpen: boolean
  onToggleMobilePreview: () => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export interface EditorHeaderPublishProps {
  category: string
  onCategoryChange: (val: string) => void
  onSave: () => void
  saving: boolean
  editSlug: string | null
  publishPanelOpen: boolean
  onTogglePublishPanel: () => void
  publishPanelRef: React.RefObject<HTMLDivElement | null>
  publishStatus: PublishStatus
  onPublishStatusChange: (status: PublishStatus) => void
}

export interface EditorHeaderFeedbackProps {
  feedback: SaveFeedback
  onClear: () => void
  onStartNewArticle: () => void
}

interface EditorHeaderProps {
  status: EditorHeaderStatusProps
  view: EditorHeaderViewProps
  tools: EditorHeaderToolsProps
  publish: EditorHeaderPublishProps
  feedback: EditorHeaderFeedbackProps
}

export function EditorHeader({ status, view, tools, publish, feedback }: EditorHeaderProps) {
  return (
    <header className="sticky top-0 z-40 h-14 border-b border-[var(--editor-line)] bg-[color-mix(in_srgb,var(--background)_90%,transparent)] backdrop-blur-lg">
      <div className="flex h-full items-center gap-2 px-4">
        <Link
          href="/dashboard/posts"
          className="flex items-center gap-1 shrink-0 text-sm text-[var(--editor-muted)] hover:text-[var(--editor-ink)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">文章列表</span>
        </Link>

        <div className="mx-1 h-4 w-px bg-[var(--editor-line)]" />

        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`flex items-center gap-1.5 text-sm min-w-[140px] ${status.saveStatusColor}`}>
            <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${
              status.saveState === 'saved' ? 'bg-emerald-500' :
              status.saveState === 'dirty' ? 'bg-gray-300' :
              status.saveState === 'saving' ? 'bg-gray-400 animate-pulse' : 'bg-orange-500'
            }`} />
            <span className="truncate">{status.saveStatusText}</span>
          </div>

          {status.charCount > 0 && (
            <>
              <div className="hidden sm:block h-4 w-px bg-[var(--editor-line)]" />
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm text-[var(--stone-gray)] whitespace-nowrap tabular-nums">
                  {status.charCount.toLocaleString()} 字 · {status.calcReadTime(status.charCount)}
                </span>
              </div>
            </>
          )}

          <div className="hidden h-4 w-px bg-[var(--editor-line)] sm:block" />
          <div className="inline-flex items-center rounded-lg border border-[var(--editor-line)] bg-[var(--editor-panel)] p-0.5">
            <button type="button" onClick={view.onSwitchSource} className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${view.editorViewMode === 'source' ? 'bg-[var(--editor-accent)]/10 text-[var(--editor-accent)]' : 'text-[var(--editor-muted)] hover:text-[var(--editor-ink)]'}`} title="源码编辑（Markdown）">源码</button>
            <button type="button" onClick={view.onSwitchPreview} className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${view.editorViewMode === 'preview' ? 'bg-[var(--editor-accent)]/10 text-[var(--editor-accent)]' : 'text-[var(--editor-muted)] hover:text-[var(--editor-ink)]'}`} title="预览模式">预览</button>
            <button type="button" onClick={view.onSwitchWysiwyg} className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${view.editorViewMode === 'wysiwyg' ? 'bg-[var(--editor-accent)]/10 text-[var(--editor-accent)]' : 'text-[var(--editor-muted)] hover:text-[var(--editor-ink)]'}`} title="Live Preview / WYSIWYG">可视</button>
          </div>
        </div>

        {status.uploadingImage && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-20 h-1.5 bg-[var(--editor-line)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--editor-accent)] transition-all duration-300" style={{ width: `${status.uploadProgress}%` }} />
            </div>
            <span className="text-xs text-[var(--editor-muted)] tabular-nums">{status.uploadProgress}%</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button type="button" onClick={tools.onImportMarkdown} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--editor-muted)] transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-accent)]" title="导入 Markdown" aria-label="导入 Markdown"><FileUp className="h-4 w-4" /></button>
          <button type="button" onClick={tools.onToggleToc} disabled={tools.tocItemsCount === 0} aria-pressed={!tools.tocCollapsed} className={`hidden h-8 w-8 items-center justify-center rounded-md transition lg:inline-flex ${!tools.tocCollapsed && tools.tocItemsCount > 0 ? 'bg-[var(--editor-accent)]/10 text-[var(--editor-accent)]' : 'text-[var(--editor-muted)] hover:bg-[var(--editor-soft)] hover:text-[var(--editor-accent)]'} disabled:cursor-not-allowed disabled:opacity-35`} title={tools.tocCollapsed ? '展开目录' : '收起目录'} aria-label={tools.tocCollapsed ? '展开目录' : '收起目录'}><ListTree className="h-4 w-4" /></button>

          <CopyFormatDropdown getTitle={() => tools.getCopyExport().title} getHtml={() => tools.getCopyExport().html} hasContent={() => tools.getCopyExport().hasContent} wechatOptions={{ themeId: tools.wechatThemeId, theme: tools.wechatTheme }} buttonClassName="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--editor-muted)] hover:bg-[var(--editor-soft)] hover:text-[var(--editor-accent)] transition" iconClassName="h-4 w-4" />
          <PublishChannelMenu onWechat={tools.onWechatPublish} getArticle={() => ({ ...tools.getCopyExport(), cover: tools.coverImage, summary: tools.description })} buttonClassName="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--editor-muted)] hover:bg-[var(--editor-soft)] hover:text-[var(--editor-accent)] transition" iconClassName="h-4 w-4" />
          <button type="button" onClick={tools.onDownloadPdf} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--editor-muted)] hover:bg-[var(--editor-soft)] hover:text-[var(--editor-accent)] transition" title="下载 PDF"><FileDown className="h-4 w-4" /></button>

          <div className="relative" ref={tools.copywritingMenuRef}>
            <button type="button" onClick={tools.onToggleCopywritingMenu} aria-expanded={tools.copywritingMenuOpen} aria-haspopup="menu" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--editor-muted)] transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-accent)]" title="中文排版整理" aria-label="中文排版整理"><Pilcrow className="h-4 w-4" /></button>
            {tools.copywritingMenuOpen && (
              <div className="absolute right-0 top-9 z-50 min-w-36 rounded-lg border border-[var(--editor-line)] bg-[var(--editor-panel)] p-1 shadow-[0_16px_36px_rgba(37,32,24,0.14)]">
                <button type="button" onClick={() => tools.onFormatCopywriting('block')} className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)]">当前段落</button>
                <button type="button" onClick={() => tools.onFormatCopywriting('document')} className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)]">全文</button>
              </div>
            )}
          </div>

          <button type="button" onClick={tools.onOpenAiChat} aria-pressed={tools.showSidebar && tools.sidebarTab === 'ai'} className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition ${tools.showSidebar && tools.sidebarTab === 'ai' ? 'bg-[var(--editor-accent)]/10 text-[var(--editor-accent)]' : 'text-[var(--editor-muted)] hover:bg-[var(--editor-soft)] hover:text-[var(--editor-accent)]'}`} title="AI 对话" aria-label="AI 对话"><WandSparkles className="h-4 w-4" /></button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={tools.onOpenImageTool} aria-label="图片工具" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--editor-muted)] transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-accent)]" title="图片工具"><ImageIcon className="h-4 w-4" /></button>
          <button type="button" onClick={tools.onToggleMobilePreview} aria-pressed={tools.mobilePreviewOpen} aria-label={tools.mobilePreviewOpen ? '关闭手机预览' : '打开手机预览'} className={`hidden h-8 w-8 items-center justify-center rounded-md transition lg:inline-flex ${tools.mobilePreviewOpen ? 'bg-[var(--editor-accent)]/10 text-[var(--editor-accent)]' : 'text-[var(--editor-muted)] hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)]'}`} title={tools.mobilePreviewOpen ? '关闭手机预览' : '手机预览'}><Smartphone className="h-4 w-4" /></button>
          <button type="button" onClick={tools.onToggleSidebar} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--editor-muted)] hover:bg-[var(--editor-soft)] transition" title={tools.sidebarOpen ? '收起侧边栏' : '展开侧边栏'}>{tools.sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}</button>

          <div className="mx-0.5 h-5 w-px bg-[var(--editor-line)]" />
          <CategorySelector value={publish.category} onChange={publish.onCategoryChange} />

          <div className="relative" ref={publish.publishPanelRef}>
            <div className="inline-flex">
              <button type="button" onClick={publish.onSave} disabled={publish.saving || status.uploadingImage} className="inline-flex items-center gap-1.5 rounded-l-lg bg-[var(--editor-accent)] pl-3 pr-2 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60">
                <Globe className="h-3.5 w-3.5" />
                {publish.saving ? '保存中…' : publish.editSlug ? '更新' : '发布'}
              </button>
              <button type="button" onClick={publish.onTogglePublishPanel} className="inline-flex items-center rounded-r-lg bg-[var(--editor-accent)] px-1.5 py-1.5 text-white border-l border-white/25 hover:brightness-105 transition">
                <ChevronUp className={`h-3.5 w-3.5 transition-transform ${publish.publishPanelOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {publish.publishPanelOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-[var(--editor-line)] bg-[var(--editor-panel)] shadow-xl z-50 overflow-hidden">
                <div className="px-4 pt-3 pb-2 text-xs font-semibold text-[var(--editor-muted)] uppercase tracking-wider">选择发布状态</div>
                {STATUS_CONFIG.map(({ key, label, desc, Icon }) => {
                  const isActive = publish.publishStatus === key
                  return (
                    <button key={key} type="button" onClick={() => { publish.onPublishStatusChange(key); publish.onTogglePublishPanel() }} className={`w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-[var(--editor-soft)] transition ${isActive ? 'bg-[var(--editor-accent)]/6' : ''}`}>
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isActive ? 'text-[var(--editor-accent)]' : 'text-[var(--editor-muted)]'}`} />
                      <div className="min-w-0"><div className={`text-sm font-medium ${isActive ? 'text-[var(--editor-accent)]' : 'text-[var(--editor-ink)]'}`}>{label}</div><div className="text-xs text-[var(--editor-muted)] leading-relaxed">{desc}</div></div>
                      {isActive && <span className="ml-auto mt-1.5 h-2 w-2 rounded-full bg-[var(--editor-accent)] shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {feedback.feedback && (
        <div className="border-t border-[var(--editor-line)] px-4 py-2">
          <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${feedback.feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
            <span>{feedback.feedback.message}</span>
            {feedback.feedback.slug && (
              <a href={`/${feedback.feedback.slug}`} className="font-medium underline underline-offset-2">{feedback.feedback.published ? '查看已发布' : '打开文章'}</a>
            )}
            {feedback.feedback.canStartNew && (
              <button type="button" onClick={feedback.onStartNewArticle} className="font-medium underline underline-offset-2">写新文章</button>
            )}
            <button type="button" onClick={feedback.onClear} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      )}
    </header>
  )
}
