'use client'
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Check,
  Image as ImageIcon,
  Loader2,
  RotateCw,
  Search,
  X,
} from 'lucide-react'
import { useToast } from '@/components/Toast'

export interface MediaAssetLibraryItem {
  id: number
  url: string
  variants?: Record<string, string>
  alt: string
  source: string
  prompt: string
  provider_name: string
  model: string
  aspect_ratio: string
  resolution: string
  created_at: number
  current_post_link_count: number
}

type MediaAssetScope = 'article' | 'all'

interface MediaAssetLibraryProps {
  active: boolean
  postId?: number | null
  slug?: string | null
  onInsert: (asset: MediaAssetLibraryItem) => void
}

function formatAssetTime(value: number) {
  if (!Number.isFinite(value)) return ''
  return new Date(value * 1000).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getSourceLabel(value: string) {
  if (value === 'ai_chat') return 'AI 对话'
  if (value === 'image_modal') return '生图'
  if (value === 'cover_generator') return '封面'
  if (value === 'collage') return '拼图'
  if (value === 'unsplash') return 'Unsplash'
  return '上传'
}

function getPreviewUrl(asset: MediaAssetLibraryItem) {
  return asset.variants?.thumb || asset.variants?.content || asset.url
}

export function MediaAssetLibrary({
  active,
  postId,
  slug,
  onInsert,
}: MediaAssetLibraryProps) {
  const toast = useToast()
  const [scope, setScope] = useState<MediaAssetScope>('article')
  const [assets, setAssets] = useState<MediaAssetLibraryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const hasArticleTarget = Boolean(postId || slug)
  const effectiveScope = hasArticleTarget ? scope : 'all'

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set('scope', effectiveScope)
    params.set('limit', '60')
    if (postId) params.set('postId', String(postId))
    if (slug) params.set('slug', slug)
    if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim())
    return params.toString()
  }, [debouncedQuery, effectiveScope, postId, slug])

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 220)
    return () => window.clearTimeout(id)
  }, [query])

  const loadAssets = useCallback(async () => {
    if (!active) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/editor/media-assets?${queryString}`, {
        credentials: 'include',
      })
      const data = (await response.json().catch(() => ({}))) as {
        assets?: MediaAssetLibraryItem[]
        error?: string
      }
      if (!response.ok) throw new Error(data.error || '图库加载失败')
      setAssets(Array.isArray(data.assets) ? data.assets : [])
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '图库加载失败')
      setAssets([])
    } finally {
      setLoading(false)
    }
  }, [active, queryString])

  useEffect(() => {
    void loadAssets()
  }, [loadAssets])

  const handleInsert = async (asset: MediaAssetLibraryItem) => {
    try {
      if (postId || slug) {
        await fetch('/api/editor/media-assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            assetId: asset.id,
            postId,
            slug,
            role: 'inline',
          }),
        })
      }
      onInsert(asset)
    } catch {
      toast.error('图片关系记录失败，但仍会尝试插入')
      onInsert(asset)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--editor-panel)]">
      <div className="shrink-0 space-y-3 border-b border-[var(--editor-line)] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-full bg-[var(--editor-soft)] p-1">
            <button
              type="button"
              disabled={!hasArticleTarget}
              onClick={() => setScope('article')}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                effectiveScope === 'article'
                  ? 'bg-white text-[var(--editor-ink)] shadow-sm'
                  : 'text-[var(--editor-muted)] hover:text-[var(--editor-ink)]'
              }`}
            >
              当前文章
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                effectiveScope === 'all'
                  ? 'bg-white text-[var(--editor-ink)] shadow-sm'
                  : 'text-[var(--editor-muted)] hover:text-[var(--editor-ink)]'
              }`}
            >
              全部图库
            </button>
          </div>
          <button
            type="button"
            onClick={() => void loadAssets()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--editor-muted)] transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)]"
            title="刷新图库"
            aria-label="刷新图库"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-[var(--editor-line)] bg-white px-3 py-2 focus-within:border-[var(--editor-accent)] focus-within:ring-2 focus-within:ring-[var(--editor-accent)]/15">
          <Search className="h-4 w-4 shrink-0 text-[var(--editor-muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--editor-ink)] outline-none placeholder:text-[var(--editor-muted)]"
            placeholder="搜索图片、提示词、模型"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-full p-1 text-[var(--editor-muted)] transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)]"
              title="清空搜索"
              aria-label="清空搜索"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : loading && assets.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center text-sm text-[var(--editor-muted)]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            加载图库中…
          </div>
        ) : assets.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-[var(--editor-line)] bg-white/40">
            {debouncedQuery.trim() ? (
              <div className="text-sm text-[var(--editor-muted)]">
                没有匹配的图片
              </div>
            ) : (
              <ImageIcon className="h-11 w-11 text-[var(--editor-muted)] opacity-50" />
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="overflow-hidden rounded-2xl border border-[var(--editor-line)] bg-white"
              >
                <img
                  src={getPreviewUrl(asset)}
                  alt={asset.alt || '图库图片'}
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                />
                <div className="space-y-2 px-3 py-3">
                  <div className="line-clamp-2 min-h-10 text-sm font-medium leading-5 text-[var(--editor-ink)]">
                    {asset.alt || asset.prompt || '未命名图片'}
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-[var(--editor-muted)]">
                    <span className="rounded-full bg-[var(--editor-soft)] px-2 py-0.5">
                      {getSourceLabel(asset.source)}
                    </span>
                    {asset.aspect_ratio ? (
                      <span className="rounded-full bg-[var(--editor-soft)] px-2 py-0.5">
                        {asset.aspect_ratio}
                      </span>
                    ) : null}
                    {asset.current_post_link_count > 0 ? (
                      <span className="rounded-full bg-[var(--editor-accent)]/10 px-2 py-0.5 text-[var(--editor-accent)]">
                        当前文章
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[var(--editor-muted)]">
                      {formatAssetTime(asset.created_at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleInsert(asset)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--editor-line)] px-2.5 py-1.5 text-xs font-medium text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)]"
                    >
                      <Check className="h-3.5 w-3.5" />
                      插入
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
