'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  ListTree,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import {
  createTocAnchorId,
  normalizeTocTitle,
  type ArticleTocItem,
} from '@/lib/article-toc'

type ArticleTocProps = {
  items: ArticleTocItem[]
  title?: string
  showTitle?: boolean
  defaultCollapsed?: boolean
  compact?: boolean
  stickyTop?: string
  className?: string
  root?: HTMLElement | null
  activeId?: string
  onActiveIdChange?: (id: string) => void
  onItemSelect?: (item: ArticleTocItem) => void
}

type PublicArticleTocProps = {
  containerId: string
  defaultCollapsed?: boolean
}

const HEADING_SELECTOR = 'h1, h2, h3'

function getOffsetTop() {
  return 72
}

function getActiveAnchorLine() {
  if (typeof window === 'undefined') return getOffsetTop() + 24
  return Math.min(Math.max(window.innerHeight * 0.32, getOffsetTop() + 24), 260)
}

function scrollElementIntoView(element: HTMLElement) {
  const top =
    element.getBoundingClientRect().top + window.scrollY - getOffsetTop()
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}

function getHeadingId(element: HTMLElement, index: number) {
  const existingId = element.id.trim()
  if (existingId) return existingId

  const id = createTocAnchorId(element.textContent || '', index)
  element.id = id
  return id
}

function readTocFromContainer(container: HTMLElement | null): ArticleTocItem[] {
  if (!container) return []

  let sectionNumber = 0
  return Array.from(container.querySelectorAll<HTMLElement>(HEADING_SELECTOR))
    .map((heading, index): ArticleTocItem | null => {
      const level = Number(heading.tagName.slice(1))
      if (level !== 1 && level !== 2 && level !== 3) return null

      const title = normalizeTocTitle(heading.textContent || '')
      if (!title) return null
      if (level === 2 || level === 3) sectionNumber += 1

      return {
        id: getHeadingId(heading, index),
        title,
        level,
        sectionNumber: level === 2 || level === 3 ? sectionNumber : undefined,
      }
    })
    .filter((item): item is ArticleTocItem => Boolean(item))
}

function getHeadingElements(root?: HTMLElement | null) {
  const scope = root || document
  return Array.from(scope.querySelectorAll<HTMLElement>(HEADING_SELECTOR))
}

function useActiveHeadingId(
  items: ArticleTocItem[],
  root?: HTMLElement | null,
  onActiveIdChange?: (id: string) => void,
) {
  const [activeId, setActiveId] = useState('')
  const activeIdRef = useRef('')

  useEffect(() => {
    if (items.length === 0 || typeof window === 'undefined') {
      return
    }

    let frame: number | null = null

    const sync = () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const headings = getHeadingElements(root)
        const current = items
          .map((item, index) => {
            const element =
              root?.querySelector<HTMLElement>(`#${CSS.escape(item.id)}`) ||
              document.getElementById(item.id) ||
              headings[index]
            return element
              ? {
                  id: item.id,
                  top: element.getBoundingClientRect().top,
                }
              : null
          })
          .filter((item): item is { id: string; top: number } => Boolean(item))
          .filter((item) => item.top <= getActiveAnchorLine())
          .sort((a, b) => b.top - a.top)[0]

        const nextActiveId = current?.id || items[0]?.id || ''
        if (activeIdRef.current === nextActiveId) return

        activeIdRef.current = nextActiveId
        setActiveId(nextActiveId)
        onActiveIdChange?.(nextActiveId)
      })
    }

    sync()
    window.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [items, onActiveIdChange, root])

  return activeId
}

export function ArticleToc({
  items,
  title = '目录',
  showTitle = true,
  defaultCollapsed = false,
  compact = false,
  stickyTop = '4.5rem',
  className = '',
  root,
  activeId,
  onActiveIdChange,
  onItemSelect,
}: ArticleTocProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const navRef = useRef<HTMLElement | null>(null)
  const inferredActiveId = useActiveHeadingId(items, root, onActiveIdChange)
  const resolvedActiveId = inferredActiveId || activeId || ''
  const visibleItems = useMemo(
    () => items.filter((item) => item.title),
    [items],
  )

  const handleSelect = useCallback(
    (item: ArticleTocItem) => {
      onActiveIdChange?.(item.id)

      if (onItemSelect) {
        onItemSelect(item)
        return
      }

      const element = document.getElementById(item.id)
      if (element) scrollElementIntoView(element)
    },
    [onActiveIdChange, onItemSelect],
  )

  if (visibleItems.length === 0) return null

  return (
    <nav
      ref={navRef}
      aria-label={title}
      className={`article-toc ${compact ? 'article-toc-compact' : ''} ${className}`}
      style={{ top: stickyTop }}
    >
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="article-toc-header"
        aria-expanded={!collapsed}
      >
        <span className="article-toc-title">
          <ListTree className="h-3.5 w-3.5" />
          {showTitle ? title : <span className="sr-only">{title}</span>}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition ${collapsed ? '-rotate-90' : ''}`}
        />
      </button>

      {!collapsed ? (
        <ol className="article-toc-list">
          {visibleItems.map((item) => {
            const active = resolvedActiveId === item.id
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={`article-toc-item article-toc-level-${item.level} ${active ? 'article-toc-item-active' : ''}`}
                  title={item.title}
                >
                  <span className="article-toc-marker" aria-hidden />
                  <span className="truncate">{item.title}</span>
                </button>
              </li>
            )
          })}
        </ol>
      ) : null}
    </nav>
  )
}

export function EditorTocRail({
  items,
  onItemSelect,
  collapsed,
  onCollapsedChange,
  activeId,
  onActiveIdChange,
  root,
  variant = 'editor',
}: {
  items: ArticleTocItem[]
  onItemSelect: (item: ArticleTocItem) => void
  collapsed: boolean
  onCollapsedChange: (value: boolean) => void
  activeId?: string
  onActiveIdChange?: (id: string) => void
  root?: HTMLElement | null
  variant?: 'editor' | 'article-fixed'
}) {
  if (items.length === 0) return null

  if (collapsed) {
    if (variant === 'article-fixed') {
      return (
        <div className="inline-article-editor-toc-collapsed">
          <button
            type="button"
            onClick={() => onCollapsedChange(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--editor-line)] bg-[var(--editor-panel)] text-[var(--editor-muted)] shadow-sm transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)]"
            title="展开目录"
            aria-label="展开目录"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      )
    }

    return (
      <div className="hidden shrink-0 lg:block">
        <button
          type="button"
          onClick={() => onCollapsedChange(false)}
          className="sticky top-[4.5rem] ml-4 mt-6 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--editor-line)] bg-[var(--editor-panel)] text-[var(--editor-muted)] shadow-sm transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)]"
          title="展开目录"
          aria-label="展开目录"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      </div>
    )
  }

  if (variant === 'article-fixed') {
    return (
      <aside className="inline-article-editor-toc" aria-label="文档目录">
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => onCollapsedChange(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--editor-muted)] transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)]"
            title="收起目录"
            aria-label="收起目录"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
        <ArticleToc
          items={items}
          title="文档目录"
          stickyTop="5rem"
          root={root}
          activeId={activeId}
          onActiveIdChange={onActiveIdChange}
          onItemSelect={onItemSelect}
          className="article-toc-editor"
        />
      </aside>
    )
  }

  return (
    <aside className="hidden w-64 shrink-0 px-4 py-6 lg:block">
      <div className="sticky top-[4.5rem] max-h-[calc(100vh-5.5rem)]">
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => onCollapsedChange(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--editor-muted)] transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)]"
            title="收起目录"
            aria-label="收起目录"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
        <ArticleToc
          items={items}
          title="文档目录"
          stickyTop="4.5rem"
          root={root}
          activeId={activeId}
          onActiveIdChange={onActiveIdChange}
          onItemSelect={onItemSelect}
          className="article-toc-editor"
        />
      </div>
    </aside>
  )
}

export function PublicArticleToc({
  containerId,
  defaultCollapsed = false,
}: PublicArticleTocProps) {
  const [items, setItems] = useState<ArticleTocItem[]>([])
  const containerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(containerId)
      containerRef.current = target
      setItems(readTocFromContainer(target))
    })

    const observer = new MutationObserver(() => {
      setItems(readTocFromContainer(containerRef.current))
    })

    const observeFrame = window.requestAnimationFrame(() => {
      if (!containerRef.current) return
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      })
    })

    return () => {
      window.cancelAnimationFrame(frame)
      window.cancelAnimationFrame(observeFrame)
      observer.disconnect()
    }
  }, [containerId])

  if (items.length < 2) return null

  return (
    <div className="public-article-toc">
      <ArticleToc
        items={items}
        title="本文目录"
        showTitle={false}
        defaultCollapsed={defaultCollapsed}
        compact
        stickyTop="5rem"
      />
    </div>
  )
}
