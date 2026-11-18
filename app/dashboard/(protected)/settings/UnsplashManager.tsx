'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/Toast'

type UnsplashConfigResponse = {
  enabled?: boolean
  source?: 'env' | 'settings' | 'none'
  api_key_masked?: string
  error?: string
}

export function UnsplashManager() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [accessKey, setAccessKey] = useState('')
  const [config, setConfig] = useState<UnsplashConfigResponse>({
    enabled: false,
    source: 'none',
    api_key_masked: '',
  })

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/admin/unsplash')
      const data = await res.json().catch(() => ({})) as UnsplashConfigResponse
      if (!res.ok) throw new Error(data.error || '加载失败')
      setConfig(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载 Unsplash 配置失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadConfig()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveConfig = async () => {
    if (!accessKey.trim()) {
      toast.error('请填写 Access Key')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/unsplash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKey: accessKey.trim() }),
      })
      const data = await res.json().catch(() => ({})) as UnsplashConfigResponse
      if (!res.ok) throw new Error(data.error || '保存失败')
      setConfig(data)
      setAccessKey('')
      toast.success('Unsplash 配置已保存')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存 Unsplash 配置失败')
    } finally {
      setSaving(false)
    }
  }

  const clearConfig = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/unsplash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear: true }),
      })
      const data = await res.json().catch(() => ({})) as UnsplashConfigResponse
      if (!res.ok) throw new Error(data.error || '清除失败')
      setConfig(data)
      setAccessKey('')
      toast.success('Unsplash 配置已清除')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '清除 Unsplash 配置失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-sm text-[var(--editor-muted)]">加载中…</div>
  }

  const sourceLabel = config.source === 'env'
    ? '环境变量'
    : config.source === 'settings'
      ? '后台配置'
      : '未配置'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--editor-ink)]">Unsplash 图库</h3>
          <div className="mt-1 text-sm text-[var(--editor-muted)]">
            当前：{config.enabled ? `已启用 · ${sourceLabel}` : '未启用'}
          </div>
        </div>
        {config.api_key_masked ? (
          <span className="rounded-full border border-[var(--editor-line)] px-3 py-1 text-xs text-[var(--editor-muted)]">
            {config.api_key_masked}
          </span>
        ) : null}
      </div>

      <div className="rounded-xl border border-[var(--editor-line)] bg-white p-4">
        <label className="block text-sm font-medium text-[var(--editor-ink)]">
          Access Key
          <input
            type="password"
            value={accessKey}
            onChange={(event) => setAccessKey(event.target.value)}
            placeholder={config.api_key_masked || 'Unsplash Access Key'}
            className="mt-2 w-full rounded-lg border border-[var(--editor-line)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
            autoComplete="off"
          />
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={clearConfig}
            disabled={saving || config.source === 'env' || !config.enabled}
            className="rounded-lg border border-[var(--editor-line)] px-3 py-2 text-sm text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            清除
          </button>
          <button
            type="button"
            onClick={saveConfig}
            disabled={saving}
            className="rounded-lg bg-[var(--editor-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
