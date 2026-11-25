import { ImageIcon, Loader2, WandSparkles, X } from 'lucide-react'
import { EditorCoverImagePreview } from '@/components/EditorCoverImagePreview'
import type { MetaGenerationTarget } from '@/components/editor/shared'
import { getSiteDisplayUrl } from '@/lib/site-config'
import { normalizePostSlug, sanitizePostSlugInput } from '@/lib/post-utils'

interface EditorMetadataPanelProps {
  tags: string[]
  tagInput: string
  setTagInput: (value: string) => void
  onAddTag: (value: string) => void
  onRemoveTag: (idx: number) => void
  description: string
  onDescriptionChange: (value: string) => void
  coverImage: string
  coverInputRef: React.RefObject<HTMLInputElement | null>
  onCoverUpload: (file: File) => void
  onCoverRemove: () => void
  slug: string
  editSlug: string | null
  slugInputFocusedRef: React.MutableRefObject<boolean>
  onSlugChange: (value: string) => void
  onSlugBlur: (value: string) => void
  onGenerateMetadata: (target: MetaGenerationTarget) => void
  isMetadataTargetPending: (target: MetaGenerationTarget) => boolean
}

export function EditorMetadataPanel({
  tags,
  tagInput,
  setTagInput,
  onAddTag,
  onRemoveTag,
  description,
  onDescriptionChange,
  coverImage,
  coverInputRef,
  onCoverUpload,
  onCoverRemove,
  slug,
  editSlug,
  slugInputFocusedRef,
  onSlugChange,
  onSlugBlur,
  onGenerateMetadata,
  isMetadataTargetPending,
}: EditorMetadataPanelProps) {
  const siteDisplayUrl = getSiteDisplayUrl()

  return (
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="block text-xs font-semibold tracking-wider text-[var(--stone-gray)]">
            标签
          </label>
          <button
            type="button"
            onClick={() => void onGenerateMetadata('tags')}
            disabled={isMetadataTargetPending('tags')}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--editor-line)] bg-[var(--editor-panel)] text-[var(--stone-gray)] transition hover:border-[var(--editor-accent)]/40 hover:text-[var(--editor-accent)] disabled:cursor-not-allowed disabled:opacity-50"
            title="AI 生成标签"
            aria-label="AI 生成标签"
          >
            {isMetadataTargetPending('tags') ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <WandSparkles className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag, idx) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-[var(--editor-accent)]/8 px-2 py-0.5 text-xs text-[var(--editor-accent)]"
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemoveTag(idx)}
                className="hover:text-[var(--editor-ink)]"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        {tags.length < 10 && (
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                e.preventDefault()
                onAddTag(tagInput)
              }
              if (e.key === 'Backspace' && !tagInput && tags.length > 0)
                onRemoveTag(tags.length - 1)
            }}
            placeholder="添加标签…"
            className="w-full rounded-md border border-[var(--editor-line)] bg-[var(--editor-panel)] px-2.5 py-1.5 text-sm text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
          />
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="block text-xs font-semibold tracking-wider text-[var(--stone-gray)]">
            摘要
          </label>
          <button
            type="button"
            onClick={() => void onGenerateMetadata('summary')}
            disabled={isMetadataTargetPending('summary')}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--editor-line)] bg-[var(--editor-panel)] text-[var(--stone-gray)] transition hover:border-[var(--editor-accent)]/40 hover:text-[var(--editor-accent)] disabled:cursor-not-allowed disabled:opacity-50"
            title="AI 生成摘要"
            aria-label="AI 生成摘要"
          >
            {isMetadataTargetPending('summary') ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <WandSparkles className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="文章摘要（建议 ≤ 160 字）"
          className="w-full rounded-md border border-[var(--editor-line)] bg-[var(--editor-panel)] px-2.5 py-2 text-sm text-[var(--editor-ink)] outline-none resize-none focus:border-[var(--editor-accent)]"
        />
        <div className="mt-1 text-right text-[10px] text-[var(--stone-gray)]">
          {description.length}/160
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="block text-xs font-semibold tracking-wider text-[var(--stone-gray)]">
            封面图
          </label>
          <button
            type="button"
            onClick={() => void onGenerateMetadata('cover')}
            disabled={isMetadataTargetPending('cover')}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--editor-line)] bg-[var(--editor-panel)] text-[var(--stone-gray)] transition hover:border-[var(--editor-accent)]/40 hover:text-[var(--editor-accent)] disabled:cursor-not-allowed disabled:opacity-50"
            title="AI 生成封面"
            aria-label="AI 生成封面"
          >
            {isMetadataTargetPending('cover') ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <WandSparkles className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        {coverImage ? (
          <EditorCoverImagePreview
            src={coverImage}
            onUpload={() => coverInputRef.current?.click()}
            onRemove={onCoverRemove}
          />
        ) : (
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f?.type.startsWith('image/')) void onCoverUpload(f)
            }}
            onDragOver={(e) => e.preventDefault()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-[var(--editor-line)] py-8 text-[var(--stone-gray)] hover:border-[var(--editor-accent)]/40 hover:text-[var(--editor-accent)] transition"
          >
            <ImageIcon className="h-6 w-6" />
            <span className="text-xs">点击或拖拽上传封面</span>
          </button>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="block text-xs font-semibold tracking-wider text-[var(--stone-gray)]">
            链接
          </label>
          <button
            type="button"
            onClick={() => void onGenerateMetadata('slug')}
            disabled={isMetadataTargetPending('slug')}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--editor-line)] bg-[var(--editor-panel)] text-[var(--stone-gray)] transition hover:border-[var(--editor-accent)]/40 hover:text-[var(--editor-accent)] disabled:cursor-not-allowed disabled:opacity-50"
            title="AI 生成 slug"
            aria-label="AI 生成 slug"
          >
            {isMetadataTargetPending('slug') ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <WandSparkles className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--stone-gray)] shrink-0">
            slug:
          </span>
          <input
            type="text"
            value={slug}
            onFocus={() => {
              slugInputFocusedRef.current = true
            }}
            onChange={(e) =>
              onSlugChange(sanitizePostSlugInput(e.target.value))
            }
            onBlur={(e) => {
              slugInputFocusedRef.current = false
              onSlugBlur(e.target.value)
            }}
            placeholder={editSlug || 'auto-generated'}
            className="flex-1 rounded-md border border-[var(--editor-line)] bg-[var(--editor-panel)] px-2 py-1.5 text-sm text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
          />
        </div>
        <div className="mt-1 text-[10px] text-[var(--stone-gray)]">
          {siteDisplayUrl}/{normalizePostSlug(slug) || editSlug || '自动生成'}
        </div>
      </div>
    </div>
  )
}
