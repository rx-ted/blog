import { WeChatThemeSelector } from '@/components/WeChatThemeSelector'
import type { WechatExportTheme, WechatExportThemeConfig } from '@/lib/wechat-themes'

interface NovelMobilePreviewProps {
  themeConfig: WechatExportThemeConfig
  selectedThemeId: string
  onThemeChange: (themeId: string) => void
  previewHtml: string
  previewError: boolean
  onRetry: () => void
  scrollRef: React.RefObject<HTMLDivElement | null>
}

export function NovelMobilePreview({
  themeConfig,
  selectedThemeId,
  onThemeChange,
  previewHtml,
  previewError,
  onRetry,
  scrollRef,
}: NovelMobilePreviewProps) {
  return (
    <section
      className="group relative hidden w-[430px] shrink-0 border-l border-[var(--editor-line)] bg-white lg:block"
      style={{ position: 'sticky', top: '3.5rem', height: 'calc(100vh - 3.5rem)' }}
    >
      <div className="pointer-events-none absolute right-3 top-3 z-20 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
        <WeChatThemeSelector
          themes={themeConfig.themes}
          value={selectedThemeId}
          onChange={onThemeChange}
          variant="icon"
          align="right"
        />
      </div>
      <div
        ref={scrollRef}
        className="mobile-preview-scroll h-full overflow-y-auto bg-white px-5 py-8"
      >
        {previewError ? (
          <div role="alert" className="text-center text-sm text-gray-500">
            预览加载失败。<button type="button" className="ml-2 underline" onClick={onRetry}>重试</button>
          </div>
        ) : !previewHtml && (
          <div role="status" className="text-center text-sm text-gray-500">加载预览...</div>
        )}
        <div
          className="mobile-preview-article mobile-wechat-preview mx-auto w-full max-w-[390px] overflow-hidden rounded-lg bg-white"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>
    </section>
  )
}
