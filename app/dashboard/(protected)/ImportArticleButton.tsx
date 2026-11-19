'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FileUp } from 'lucide-react'

const IMPORT_MARKDOWN_STORAGE_KEY = 'qmblog:pending-editor-import-markdown'

export function ImportArticleButton() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--editor-line)] text-[var(--editor-ink)] rounded-lg text-sm font-medium hover:bg-[var(--editor-soft)] transition-all whitespace-nowrap"
        title="导入 Markdown 文章"
      >
        <FileUp className="w-4 h-4" />
        <span className="hidden md:inline">导入文章</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".md,.markdown,text/markdown,text/plain"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          try {
            const markdown = await file.text()
            window.sessionStorage.setItem(
              IMPORT_MARKDOWN_STORAGE_KEY,
              JSON.stringify({
                markdown,
                name: file.name,
                createdAt: Date.now(),
              }),
            )
            router.push('/editor?import=pending')
          } finally {
            e.target.value = ''
          }
        }}
      />
    </>
  )
}
