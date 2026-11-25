'use client'

import { ImageIcon, X } from 'lucide-react'

interface EditorCoverImagePreviewProps {
  src: string
  onRemove: () => void
  onUpload: () => void
}

export function EditorCoverImagePreview({
  src,
  onRemove,
  onUpload,
}: EditorCoverImagePreviewProps) {
  return (
    <div
      className="group relative overflow-hidden rounded-md border border-[var(--editor-line)]"
      style={{ height: 120 }}
    >
      {/* Keep the native image context menu available so the cover can be saved locally. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="封面预览" className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          onClick={onUpload}
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-[var(--editor-panel)] text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)]"
          title="重新上传"
          aria-label="重新上传封面"
        >
          <ImageIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-[var(--editor-panel)] text-rose-600 transition hover:bg-[var(--editor-soft)]"
          title="删除封面"
          aria-label="删除封面"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
