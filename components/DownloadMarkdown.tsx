'use client'

import { useToast } from '@/components/Toast'
import type { copyAsWechatArticleFormat } from '@/lib/wechat-copy'
import { htmlToMarkdownBody } from '@/lib/markdown'
import { Copy, FileDown, ImageDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const URL_ATTRIBUTES = [
  ['img', 'src'],
  ['a', 'href'],
  ['audio', 'src'],
  ['video', 'src'],
  ['source', 'src'],
] as const

function shouldRewriteUrl(value: string) {
  if (!value) return false
  const trimmed = value.trim()

  if (!trimmed || trimmed.startsWith('#')) return false
  if (/^(?:[a-z]+:|\/\/)/i.test(trimmed)) return false

  return true
}

function getExportBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || window.location.origin
}

function absolutizeHtmlUrls(html: string) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const baseUrl = getExportBaseUrl()

  for (const [selector, attribute] of URL_ATTRIBUTES) {
    for (const element of doc.querySelectorAll<HTMLElement>(selector)) {
      const value = element.getAttribute(attribute)
      if (!value || !shouldRewriteUrl(value)) continue
      element.setAttribute(attribute, new URL(value, baseUrl).toString())
    }
  }

  return doc.body.innerHTML
}

function htmlToMarkdown(title: string, html: string) {
  const normalizedHtml = absolutizeHtmlUrls(html)
  const markdown = htmlToMarkdownBody(normalizedHtml)
  return `# ${title}\n\n${markdown}`
}

function htmlToPlainText(html: string) {
  return (
    new DOMParser()
      .parseFromString(html, 'text/html')
      .body.textContent?.trim() || ''
  )
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function copyTextToClipboard(text: string) {
  await navigator.clipboard.writeText(text)
}

async function copyHtmlToClipboard(html: string, plainText: string) {
  if (
    window.isSecureContext &&
    navigator.clipboard?.write &&
    typeof ClipboardItem !== 'undefined'
  ) {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' }),
      }),
    ])
    return
  }

  await copyTextToClipboard(plainText || html)
}

export function downloadMarkdownFromHtml(title: string, html: string) {
  const blob = new Blob([htmlToMarkdown(title, html)], {
    type: 'text/markdown;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.md`
  a.click()
  URL.revokeObjectURL(url)
}

export async function copyMarkdownFromHtml(title: string, html: string) {
  await copyTextToClipboard(htmlToMarkdown(title, html))
}

export async function copyHtmlFromHtml(title: string, html: string) {
  const normalizedHtml = absolutizeHtmlUrls(html)
  const fullHtml = `<h1>${escapeHtml(title)}</h1>\n${normalizedHtml}`
  await copyHtmlToClipboard(fullHtml, htmlToPlainText(fullHtml) || title)
}

type CopyFormatDropdownProps = {
  title?: string
  html?: string
  getTitle?: () => string
  getHtml?: () => string
  hasContent?: () => boolean
  wechatOptions?: Parameters<typeof copyAsWechatArticleFormat>[2]
  buttonClassName?: string
  iconClassName?: string
  menuClassName?: string
}

export function CopyFormatDropdown({
  title = '',
  html = '',
  getTitle,
  getHtml,
  hasContent,
  wechatOptions,
  buttonClassName = 'inline-flex items-center justify-center rounded p-1 text-[var(--stone-gray)] hover:text-[var(--editor-accent)] hover:bg-[var(--editor-accent)]/8 transition-colors',
  iconClassName = 'h-3.5 w-3.5',
  menuClassName = 'right-0 mt-2 w-40',
}: CopyFormatDropdownProps) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  const readCurrent = () => ({
    title: (getTitle?.() || title || '无标题').trim() || '无标题',
    html: getHtml?.() || html,
  })

  const ensureContent = () => {
    if (!hasContent || hasContent()) return true
    toast.error('正文还是空的。')
    return false
  }

  const runCopy = async (
    action: (currentTitle: string, currentHtml: string) => Promise<void>,
    successMessage: string,
    fallbackMessage: string,
  ) => {
    if (!ensureContent()) return
    const current = readCurrent()

    try {
      await action(current.title, current.html)
      setOpen(false)
      toast.success(successMessage)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : fallbackMessage)
    }
  }

  return (
    <span className="relative inline-flex" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={buttonClassName}
        title="复制"
        aria-label="复制"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Copy className={iconClassName} />
      </button>

      {open && (
        <span
          role="menu"
          className={`absolute z-50 overflow-hidden rounded-lg border border-[var(--editor-line)] bg-[var(--editor-panel)] p-1 text-sm shadow-lg ${menuClassName}`}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() =>
              runCopy(
                async (currentTitle, currentHtml) => {
                  const { copyAsWechatArticleFormat } = await import(
                    '@/lib/wechat-copy'
                  )
                  await copyAsWechatArticleFormat(
                    currentTitle,
                    currentHtml,
                    wechatOptions,
                  )
                },
                '已复制公众号格式',
                '复制公众号格式失败',
              )
            }
            className="block w-full rounded px-3 py-2 text-left text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)]"
          >
            复制为公众号格式
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() =>
              runCopy(
                copyMarkdownFromHtml,
                '已复制 Markdown',
                '复制 Markdown 失败',
              )
            }
            className="block w-full rounded px-3 py-2 text-left text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)]"
          >
            复制为 Markdown
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() =>
              runCopy(copyHtmlFromHtml, '已复制 HTML', '复制 HTML 失败')
            }
            className="block w-full rounded px-3 py-2 text-left text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)]"
          >
            复制为 HTML
          </button>
        </span>
      )}
    </span>
  )
}

export function DownloadMarkdown({
  title,
  html,
  getTitle,
  getHtml,
}: {
  title: string
  html: string
  getTitle?: () => string
  getHtml?: () => string
}) {
  const toast = useToast()

  const handleDownload = () => {
    downloadMarkdownFromHtml(getTitle?.() || title, getHtml?.() || html)
  }

  const handleDownloadPdf = async () => {
    try {
      const { downloadArticleAsPdf } = await import('@/lib/wechat-copy')
      await downloadArticleAsPdf(getTitle?.() || title, getHtml?.() || html)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导出 PDF 失败')
    }
  }

  const handleDownloadWechatPng = async () => {
    try {
      const { downloadArticleAsWechatPng } = await import('@/lib/wechat-copy')
      await downloadArticleAsWechatPng(
        getTitle?.() || title,
        getHtml?.() || html,
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导出公众号长图失败')
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        onClick={handleDownload}
        title="下载 Markdown"
        className="inline-flex items-center justify-center rounded p-1 text-[var(--stone-gray)] hover:text-[var(--editor-accent)] hover:bg-[var(--editor-accent)]/8 transition-colors"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
      <CopyFormatDropdown
        title={title}
        html={html}
        getTitle={getTitle}
        getHtml={getHtml}
      />
      <button
        onClick={handleDownloadWechatPng}
        title="下载公众号长图"
        className="inline-flex items-center justify-center rounded p-1 text-[var(--stone-gray)] hover:text-[var(--editor-accent)] hover:bg-[var(--editor-accent)]/8 transition-colors"
      >
        <ImageDown className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={handleDownloadPdf}
        title="下载 PDF"
        className="inline-flex items-center justify-center rounded p-1 text-[var(--stone-gray)] hover:text-[var(--editor-accent)] hover:bg-[var(--editor-accent)]/8 transition-colors"
      >
        <FileDown className="h-3.5 w-3.5" />
      </button>
    </span>
  )
}
