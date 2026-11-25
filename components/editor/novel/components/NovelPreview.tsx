interface NovelPreviewProps {
  html: string
  mobilePreviewOpen: boolean
}

export function NovelPreview({ html, mobilePreviewOpen }: NovelPreviewProps) {
  return (
    <article
      className={`editor-surface editor-main-prose prose prose-neutral max-w-none ${
        mobilePreviewOpen ? 'editor-mobile-preview-surface' : ''
      }`}
    >
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="text-[var(--editor-muted)]">暂无内容可预览</p>
      )}
    </article>
  )
}
