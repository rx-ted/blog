interface NovelSourceViewProps {
  value: string
  onChange: (next: string) => void
}

export function NovelSourceView({ value, onChange }: NovelSourceViewProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="editor-surface min-h-[60vh] w-full resize-y rounded-none border-0 bg-transparent p-0 font-mono text-[15px] leading-7 text-[var(--editor-ink)] outline-none placeholder:text-[var(--stone-gray)]"
      placeholder="在此输入 Markdown 源码..."
      spellCheck={false}
    />
  )
}
