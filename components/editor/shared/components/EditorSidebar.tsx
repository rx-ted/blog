import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { SidebarTab } from '@/components/editor/shared'

interface EditorSidebarProps {
  open: boolean
  tab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
  onClose: () => void
  children: ReactNode
}

export function EditorSidebar({ open, tab, onTabChange, onClose, children }: EditorSidebarProps) {
  return (
    <aside
      className={`shrink-0 overflow-hidden border-l border-[var(--editor-line)] bg-[var(--background)] transition-all duration-200 ease-in-out ${
        open ? (tab === 'ai' ? 'w-[380px]' : 'w-[300px]') : 'w-0 border-l-0'
      }`}
      style={{ position: 'sticky', top: '3.5rem', height: 'calc(100vh - 3.5rem)' }}
    >
      {open && (
        <div className={`${tab === 'ai' ? 'w-[380px]' : 'w-[300px]'} flex h-full min-h-0 flex-col`}>
          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--editor-line)] px-4 py-3">
            <div className="grid flex-1 grid-cols-2 rounded-lg bg-[var(--editor-soft)] p-1">
              <button
                type="button"
                onClick={() => onTabChange('properties')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  tab === 'properties'
                    ? 'bg-[var(--editor-panel)] text-[var(--editor-ink)] shadow-sm'
                    : 'text-[var(--stone-gray)] hover:text-[var(--editor-ink)]'
                }`}
              >
                文章属性
              </button>
              <button
                type="button"
                onClick={() => onTabChange('ai')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  tab === 'ai'
                    ? 'bg-[var(--editor-panel)] text-[var(--editor-ink)] shadow-sm'
                    : 'text-[var(--stone-gray)] hover:text-[var(--editor-ink)]'
                }`}
              >
                AI 对话
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--stone-gray)] transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)]"
              aria-label="关闭侧栏"
              title="关闭侧栏"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {children}
        </div>
      )}
    </aside>
  )
}
