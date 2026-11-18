'use client'

import { useEffect, useMemo, useState } from 'react'
import { Palette, Plus, Search, Trash2 } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { WeChatThemeSelector, WeChatThemeSwatchStrip } from '@/components/WeChatThemeSelector'
import {
  DEFAULT_WECHAT_EXPORT_THEME_CONFIG,
  WECHAT_EXPORT_THEME_CONFIG_SETTING_KEY,
  resolveWechatExportThemeConfig,
  serializeWechatExportThemeConfig,
  type WechatExportTheme,
  type WechatExportThemeConfig,
} from '@/lib/wechat-themes'

function createCustomTheme(index: number): WechatExportTheme {
  return {
    id: `custom-${Date.now().toString(36)}-${index}`,
    name: '自定义样式',
    description: '后台自定义公众号排版样式',
    swatches: ['#ffffff', '#111111', '#c96442'],
    css: `
.wechat-export-article {
  padding: 0 12px;
  background: #ffffff;
}

.wechat-export-title {
  color: #111111;
  font-size: 20px;
  font-weight: 700;
}

.wechat-export-content h2 {
  color: var(--editor-accent);
}
`.trim(),
  }
}

export function WeChatThemeManager() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<WechatExportThemeConfig>(DEFAULT_WECHAT_EXPORT_THEME_CONFIG)
  const [selectedThemeId, setSelectedThemeId] = useState(DEFAULT_WECHAT_EXPORT_THEME_CONFIG.defaultThemeId)
  const [themeQuery, setThemeQuery] = useState('')

  const selectedTheme = useMemo(() => (
    config.themes.find(theme => theme.id === selectedThemeId) || config.themes[0]
  ), [config.themes, selectedThemeId])

  const filteredThemes = useMemo(() => {
    const keyword = themeQuery.trim().toLowerCase()
    if (!keyword) return config.themes

    return config.themes.filter((theme) => {
      const haystack = `${theme.name} ${theme.description} ${theme.id}`.toLowerCase()
      return haystack.includes(keyword)
    })
  }, [config.themes, themeQuery])

  const builtinCount = useMemo(() => (
    config.themes.filter(theme => theme.builtin).length
  ), [config.themes])
  const customCount = config.themes.length - builtinCount

  const updateConfig = (updater: (current: WechatExportThemeConfig) => WechatExportThemeConfig) => {
    setConfig((current) => {
      const next = updater(current)
      if (!next.themes.some(theme => theme.id === selectedThemeId)) {
        setSelectedThemeId(next.defaultThemeId)
      }
      return next
    })
  }

  const updateSelectedTheme = (patch: Partial<WechatExportTheme>) => {
    if (!selectedTheme) return

    updateConfig((current) => ({
      ...current,
      themes: current.themes.map(theme => (
        theme.id === selectedTheme.id ? { ...theme, ...patch } : theme
      )),
    }))
  }

  const loadConfig = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings/wechat-export-themes', { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error('加载公众号样式失败')

      const nextConfig = resolveWechatExportThemeConfig(JSON.stringify(data))
      setConfig(nextConfig)
      setSelectedThemeId(nextConfig.defaultThemeId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载公众号样式失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadConfig()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAddTheme = () => {
    const nextTheme = createCustomTheme(config.themes.length + 1)
    updateConfig((current) => ({
      ...current,
      themes: [...current.themes, nextTheme],
    }))
    setSelectedThemeId(nextTheme.id)
  }

  const handleDeleteTheme = () => {
    if (!selectedTheme || selectedTheme.builtin) return

    updateConfig((current) => ({
      defaultThemeId: current.defaultThemeId === selectedTheme.id ? DEFAULT_WECHAT_EXPORT_THEME_CONFIG.defaultThemeId : current.defaultThemeId,
      themes: current.themes.filter(theme => theme.id !== selectedTheme.id),
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const value = serializeWechatExportThemeConfig(config)
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: WECHAT_EXPORT_THEME_CONFIG_SETTING_KEY,
          value,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error || '保存公众号样式失败')
      }

      toast.success('公众号样式已保存')
      await loadConfig()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存公众号样式失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-[var(--editor-line)] bg-[var(--editor-panel)] p-5 text-sm text-[var(--editor-muted)]">
        正在加载公众号样式…
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-[var(--editor-line)] bg-[var(--editor-panel)] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--editor-ink)]">
            <Palette className="h-4 w-4" />
            公众号样式
          </h3>
          <div className="flex flex-wrap gap-2 text-xs text-[var(--editor-muted)]">
            <span>{config.themes.length} 套样式</span>
            <span>内置 {builtinCount}</span>
            <span>自定义 {customCount}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAddTheme}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--editor-line)] px-3 py-2 text-sm text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)]"
          >
            <Plus className="h-4 w-4" />
            新增样式
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[var(--editor-accent)] px-3 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存样式'}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-2">
          <label className="block text-xs font-semibold tracking-wider text-[var(--stone-gray)]">
            默认发布样式
          </label>
          <WeChatThemeSelector
            themes={config.themes}
            value={config.defaultThemeId}
            onChange={(themeId) => updateConfig(current => ({ ...current, defaultThemeId: themeId }))}
            align="left"
          />

          <div className="pt-3">
            <label className="block text-xs font-semibold tracking-wider text-[var(--stone-gray)]">
              样式目录
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--editor-line)] bg-[var(--background)] px-2 py-1.5">
              <Search className="h-4 w-4 shrink-0 text-[var(--editor-muted)]" />
              <input
                type="search"
                value={themeQuery}
                onChange={(event) => setThemeQuery(event.target.value)}
                placeholder="搜索名称、描述或 ID"
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--editor-ink)] outline-none placeholder:text-[var(--editor-muted)]"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--editor-line)] bg-[var(--background)]">
            <div className="flex items-center justify-between border-b border-[var(--editor-line)] px-3 py-2 text-xs text-[var(--editor-muted)]">
              <span>{filteredThemes.length} / {config.themes.length}</span>
              <span>{selectedTheme?.name || '未选择'}</span>
            </div>
            <div className="max-h-[460px] overflow-y-auto overscroll-contain">
              {filteredThemes.length > 0 ? (
                filteredThemes.map(theme => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedThemeId(theme.id)}
                    className={`flex w-full items-start justify-between gap-3 border-b border-[var(--editor-line)] px-3 py-3 text-left last:border-b-0 transition ${
                      selectedThemeId === theme.id
                        ? 'bg-[var(--editor-accent)]/10'
                        : 'hover:bg-[var(--editor-soft)]'
                    }`}
                    aria-current={selectedThemeId === theme.id}
                  >
                    <span className="min-w-0">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-medium text-[var(--editor-ink)]">{theme.name}</span>
                        <WeChatThemeSwatchStrip theme={theme} compact />
                      </span>
                      <span className="mt-0.5 block line-clamp-2 text-xs leading-relaxed text-[var(--editor-muted)]">
                        {theme.description || theme.id}
                      </span>
                    </span>
                    {theme.builtin && (
                      <span className="shrink-0 rounded-full bg-[var(--editor-soft)] px-2 py-0.5 text-[10px] text-[var(--editor-muted)]">
                        内置
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-8 text-center text-sm text-[var(--editor-muted)]">
                  没有匹配样式
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedTheme && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--editor-line)] bg-[var(--background)] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate text-sm font-semibold text-[var(--editor-ink)]">{selectedTheme.name}</h4>
                    {selectedTheme.builtin && (
                      <span className="rounded-full bg-[var(--editor-soft)] px-2 py-0.5 text-[10px] text-[var(--editor-muted)]">
                        内置
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-[var(--editor-muted)]">
                    {selectedTheme.description || selectedTheme.id}
                  </p>
                </div>
                <WeChatThemeSwatchStrip theme={selectedTheme} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-semibold tracking-wider text-[var(--stone-gray)]">
                  名称
                </label>
                <input
                  type="text"
                  value={selectedTheme.name}
                  onChange={(event) => updateSelectedTheme({ name: event.target.value })}
                  className="w-full rounded-lg border border-[var(--editor-line)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold tracking-wider text-[var(--stone-gray)]">
                  ID
                </label>
                <input
                  type="text"
                  value={selectedTheme.id}
                  disabled
                  className="w-full rounded-lg border border-[var(--editor-line)] bg-[var(--editor-soft)] px-3 py-2 text-sm text-[var(--editor-muted)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold tracking-wider text-[var(--stone-gray)]">
                描述
              </label>
              <input
                type="text"
                value={selectedTheme.description}
                onChange={(event) => updateSelectedTheme({ description: event.target.value })}
                className="w-full rounded-lg border border-[var(--editor-line)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold tracking-wider text-[var(--stone-gray)]">
                配色
              </label>
              <input
                type="text"
                value={(selectedTheme.swatches || []).join(', ')}
                onChange={(event) => updateSelectedTheme({
                  swatches: event.target.value.split(',').map(color => color.trim()),
                })}
                placeholder="#ffffff, #111111, #c96442"
                className="w-full rounded-lg border border-[var(--editor-line)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
              />
              <WeChatThemeSwatchStrip theme={selectedTheme} />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold tracking-wider text-[var(--stone-gray)]">
                CSS
              </label>
              <textarea
                value={selectedTheme.css}
                onChange={(event) => updateSelectedTheme({ css: event.target.value })}
                rows={18}
                spellCheck={false}
                className="w-full rounded-lg border border-[var(--editor-line)] bg-[var(--background)] px-3 py-2 font-mono text-xs leading-relaxed text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
              />
            </div>

            {!selectedTheme.builtin && (
              <button
                type="button"
                onClick={handleDeleteTheme}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-700 transition hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" />
                删除当前样式
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
