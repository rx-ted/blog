'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Palette, Search, X } from 'lucide-react'
import type { WechatExportTheme } from '@/lib/wechat-themes'

interface WeChatThemeSelectorProps {
  themes: WechatExportTheme[]
  value: string
  onChange: (themeId: string) => void
  variant?: 'icon' | 'field'
  align?: 'left' | 'right'
  className?: string
  panelClassName?: string
  disabled?: boolean
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function isHexColor(value: string) {
  return /^#[0-9a-f]{3}(?:[0-9a-f]{1})?(?:[0-9a-f]{2})?(?:[0-9a-f]{2})?$/i.test(
    value,
  )
}

function getThemeSwatches(theme?: WechatExportTheme) {
  const swatches = (theme?.swatches || [])
    .map((color) => color.trim())
    .filter(isHexColor)
    .slice(0, 6)

  return swatches.length > 0 ? swatches : ['#ffffff', '#141413', '#c96442']
}

export function WeChatThemeSwatchStrip({
  theme,
  className = '',
  compact = false,
}: {
  theme?: WechatExportTheme
  className?: string
  compact?: boolean
}) {
  const swatches = getThemeSwatches(theme)

  return (
    <span
      className={cn(
        'flex overflow-hidden rounded-full border border-black/10 bg-white/70',
        compact ? 'h-2 w-12' : 'h-2.5 w-20',
        className,
      )}
      aria-hidden="true"
    >
      {swatches.map((color, index) => (
        <span
          key={`${color}-${index}`}
          className="min-w-0 flex-1"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  )
}

export function WeChatThemeSelector({
  themes,
  value,
  onChange,
  variant = 'field',
  align = 'right',
  className = '',
  panelClassName = '',
  disabled = false,
}: WeChatThemeSelectorProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)

  const selectedTheme = useMemo(
    () => themes.find((theme) => theme.id === value) || themes[0],
    [themes, value],
  )

  const filteredThemes = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return themes

    return themes.filter((theme) => {
      const haystack =
        `${theme.name} ${theme.description} ${theme.id}`.toLowerCase()
      return haystack.includes(keyword)
    })
  }, [query, themes])

  useEffect(() => {
    if (!open) return

    const frame = window.requestAnimationFrame(() => searchRef.current?.focus())

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target
      if (target instanceof Node && rootRef.current?.contains(target)) return
      setOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleSelect = (themeId: string) => {
    onChange(themeId)
    setOpen(false)
  }

  const handleToggleOpen = () => {
    if (!open) setQuery('')
    setOpen((current) => !current)
  }

  const selectedName = selectedTheme?.name || '公众号样式'
  const resultLabel = query.trim()
    ? `${filteredThemes.length} 个匹配`
    : `${themes.length} 个样式`

  return (
    <div
      ref={rootRef}
      className={cn('relative', variant === 'field' && 'w-full', className)}
    >
      <button
        type="button"
        disabled={disabled || themes.length === 0}
        aria-label={`选择公众号样式，当前 ${selectedName}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={handleToggleOpen}
        className={cn(
          'group transition active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--editor-accent)] disabled:cursor-not-allowed disabled:opacity-50',
          variant === 'icon'
            ? 'relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--editor-line)] bg-[var(--editor-panel)] text-[var(--editor-ink)] shadow-sm hover:bg-[var(--editor-soft)]'
            : 'flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--editor-line)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--editor-ink)] shadow-sm hover:bg-[var(--editor-soft)]',
        )}
        title="公众号样式"
      >
        {variant === 'icon' ? (
          <Palette className="h-4 w-4" />
        ) : (
          <>
            <span className="flex min-w-0 items-center gap-2">
              <Palette className="h-4 w-4 shrink-0 text-[var(--editor-muted)]" />
              <span className="truncate">{selectedName}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <WeChatThemeSwatchStrip theme={selectedTheme} compact />
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-[var(--editor-muted)] transition-transform',
                  open && 'rotate-180',
                )}
              />
            </span>
          </>
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute top-[calc(100%+0.65rem)] z-[80] w-[25rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[var(--editor-line)] bg-[var(--editor-panel)] shadow-[0_24px_70px_-28px_rgba(15,23,42,0.5)]',
            align === 'left' ? 'left-0' : 'right-0',
            panelClassName,
          )}
          role="dialog"
          aria-label="选择公众号样式"
        >
          <div className="border-b border-[var(--editor-line)] bg-[var(--background)]/70 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-wide text-[var(--editor-muted)]">
                  当前样式
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-[var(--editor-ink)]">
                  {selectedName}
                </p>
              </div>
              <WeChatThemeSwatchStrip
                theme={selectedTheme}
                className="h-3 w-24 rounded-md"
              />
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-[var(--editor-line)] bg-[var(--editor-panel)] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
              <Search
                className="h-4 w-4 shrink-0 text-[var(--editor-muted)]"
                aria-hidden="true"
              />
              <input
                ref={searchRef}
                type="text"
                inputMode="search"
                role="searchbox"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索名称、风格、配色"
                className="min-w-0 flex-1 appearance-none bg-transparent text-sm text-[var(--editor-ink)] outline-none placeholder:text-[var(--editor-muted)]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="rounded-full p-1 text-[var(--editor-muted)] transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)]"
                  aria-label="清空搜索"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-[var(--editor-line)] px-3 py-2">
            <span className="text-xs font-medium text-[var(--editor-muted)]">
              {resultLabel}
            </span>
            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--editor-soft)]">
              {selectedTheme && (
                <WeChatThemeSwatchStrip
                  theme={selectedTheme}
                  className="h-full w-full rounded-full border-0"
                />
              )}
            </span>
          </div>

          <div
            role="listbox"
            aria-label="公众号样式"
            className="max-h-[min(56vh,360px)] overflow-y-auto py-2"
          >
            {filteredThemes.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[var(--editor-muted)]">
                没有匹配样式
              </div>
            ) : (
              filteredThemes.map((theme) => {
                const selected = theme.id === selectedTheme?.id
                return (
                  <button
                    key={theme.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => handleSelect(theme.id)}
                    className={cn(
                      'mx-2 grid w-[calc(100%-1rem)] grid-cols-[3px_minmax(0,1fr)_auto] items-stretch gap-3 rounded-xl px-2 py-2.5 text-left transition active:scale-[0.99]',
                      selected
                        ? 'bg-[var(--editor-accent)]/10'
                        : 'hover:bg-[var(--editor-soft)]',
                    )}
                  >
                    <span
                      className="my-1 rounded-full"
                      style={{ backgroundColor: getThemeSwatches(theme)[0] }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-medium text-[var(--editor-ink)]">
                          {theme.name}
                        </span>
                        {theme.builtin && (
                          <span className="shrink-0 rounded-full bg-[var(--editor-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--editor-muted)]">
                            内置
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--editor-muted)]">
                        {theme.description || theme.id}
                      </span>
                      <WeChatThemeSwatchStrip
                        theme={theme}
                        className="mt-2 h-2 w-28 rounded-md"
                      />
                    </span>
                    {selected && (
                      <Check className="mt-0.5 h-4 w-4 text-[var(--editor-accent)]" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
