'use client'

import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
} from 'novel'
import { suggestionItems } from './suggestion-items'

export function SlashMenu() {
  return (
    <EditorCommand className="z-50 h-auto max-h-[340px] w-80 overflow-y-auto rounded-md border border-[var(--editor-line)] bg-white p-1 shadow-[0_20px_40px_rgba(37,32,24,0.14)]">
      <EditorCommandEmpty className="px-3 py-2 text-sm text-[var(--editor-muted)]">
        没找到匹配项
      </EditorCommandEmpty>
      <EditorCommandList>
        {suggestionItems.map((item) => (
          <EditorCommandItem
            key={item.title}
            value={item.title}
            keywords={item.searchTerms}
            onCommand={(props) => item.command?.(props)}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition hover:bg-[var(--editor-soft)] aria-selected:bg-[var(--editor-soft)]"
          >
            {item.icon}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--editor-ink)]">
                {item.title}
              </p>
              <p className="truncate text-xs text-[var(--editor-muted)]">
                {item.description}
              </p>
            </div>
          </EditorCommandItem>
        ))}
      </EditorCommandList>
    </EditorCommand>
  )
}
