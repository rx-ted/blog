'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import { Dropdown } from '@/components/Dropdown'

export interface BaseProviderProfile {
  id: number
  name: string
  provider: string
  provider_name: string
  provider_type: string
  provider_category: string
  api_key_url: string
  base_url: string
  model: string
  api_key_masked: string
  is_default: number
  updated_at?: number
}

export interface BaseProviderFormState {
  id?: number
  name: string
  provider: string
  provider_name: string
  provider_type: string
  provider_category: string
  api_key_url: string
  base_url: string
  model: string
  api_key: string
  is_default: boolean
  api_key_masked?: string
}

export interface ModelsResponse {
  models?: Array<{ id: string; name: string }>
  source?: 'provider' | 'preset'
  warning?: string
  error?: string
}

export interface ProviderTemplatePreset {
  id: string
  name: string
  category: string
  defaultModel: string
  description: string
  recommended?: boolean
}

export interface ProviderTemplateGroup {
  category: string
  presets: ProviderTemplatePreset[]
}

export function createModelOptions(
  models: Array<{ id: string; name: string }>,
  currentModel: string,
) {
  const options = models.map((model) => ({ value: model.id, label: model.name }))
  const normalizedCurrentModel = currentModel.trim()

  if (!normalizedCurrentModel || options.some((option) => option.value === normalizedCurrentModel)) {
    return options
  }

  return [
    { value: normalizedCurrentModel, label: `${normalizedCurrentModel}（当前值）` },
    ...options,
  ]
}

interface ProviderListTableProps<T extends BaseProviderProfile> {
  profiles: T[]
  defaultProfileId: number | null
  emptyText: string
  onEdit: (profile: T) => void
  onDelete: (profile: T) => void
  onSetDefault: (profile: T) => void
}

export function ProviderListTable<T extends BaseProviderProfile>({
  profiles,
  defaultProfileId,
  emptyText,
  onEdit,
  onDelete,
  onSetDefault,
}: ProviderListTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--editor-line)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--editor-soft)] text-left">
            <th className="px-3 py-2 font-medium text-[var(--editor-muted)]">名称</th>
            <th className="hidden px-3 py-2 font-medium text-[var(--editor-muted)] sm:table-cell">平台</th>
            <th className="hidden px-3 py-2 font-medium text-[var(--editor-muted)] md:table-cell">模型</th>
            <th className="hidden px-3 py-2 font-medium text-[var(--editor-muted)] lg:table-cell">更新时间</th>
            <th className="w-36 px-3 py-2 text-right font-medium text-[var(--editor-muted)]">操作</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile) => (
            <tr key={profile.id} className="border-t border-[var(--editor-line)] hover:bg-[var(--editor-panel)]">
              <td className="px-3 py-2 font-medium text-[var(--editor-ink)]">
                {profile.name}
                {profile.id === defaultProfileId || profile.is_default === 1 ? (
                  <span className="ml-2 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-600">默认</span>
                ) : null}
              </td>
              <td className="hidden px-3 py-2 text-[var(--editor-muted)] sm:table-cell">
                {profile.provider_name || profile.provider || '-'}
              </td>
              <td className="hidden px-3 py-2 text-[var(--editor-muted)] md:table-cell">{profile.model}</td>
              <td className="hidden px-3 py-2 text-[var(--editor-muted)] lg:table-cell">
                {profile.updated_at ? new Date(profile.updated_at * 1000).toLocaleString('zh-CN') : '-'}
              </td>
              <td className="px-3 py-2 text-right">
                {profile.id !== defaultProfileId && profile.is_default !== 1 ? (
                  <button
                    type="button"
                    onClick={() => onSetDefault(profile)}
                    className="text-xs text-[var(--editor-accent)] hover:underline"
                  >
                    默认
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onEdit(profile)}
                  className="ml-2 text-xs text-[var(--editor-accent)] hover:underline"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(profile)}
                  className="ml-2 text-xs text-rose-500 hover:underline"
                >
                  删除
                </button>
              </td>
            </tr>
          ))}
          {profiles.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-8 text-center text-sm text-[var(--editor-muted)]">
                {emptyText}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

interface ProviderDialogProps {
  title: string
  onClose: () => void
  headerAction?: ReactNode
  children: ReactNode
}

export function ProviderDialog({ title, onClose, headerAction, children }: ProviderDialogProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-2 sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--editor-line)] bg-[var(--editor-panel)] shadow-xl sm:max-h-[min(92dvh,760px)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--editor-line)] px-4 py-3 sm:px-6">
          <h3 className="text-lg font-semibold text-[var(--editor-ink)]">{title}</h3>
          {headerAction}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {children}
        </div>
      </div>
    </div>
  )
}

interface ProviderTemplateModalProps {
  groups: ProviderTemplateGroup[]
  customOptionLabel: string
  customOptionDescription: string
  onClose: () => void
  onSelect: (presetId: string) => void
}

export function ProviderTemplateModal({
  groups,
  customOptionLabel,
  customOptionDescription,
  onClose,
  onSelect,
}: ProviderTemplateModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const allPresets = useMemo(() => groups.flatMap((group) => group.presets), [groups])
  const categoryFilters = useMemo(() => [
    { id: 'all', label: '全部', count: allPresets.length },
    ...groups.map((group) => ({ id: group.category, label: group.category, count: group.presets.length })),
  ], [allPresets.length, groups])

  const normalizedQuery = query.trim().toLowerCase()
  const visibleGroups = useMemo(() => {
    return groups
      .filter((group) => activeCategory === 'all' || group.category === activeCategory)
      .map((group) => ({
        category: group.category,
        presets: group.presets.filter((preset) => {
          if (!normalizedQuery) return true
          return [
            preset.name,
            preset.description,
            preset.defaultModel,
            preset.category,
          ].some((value) => value.toLowerCase().includes(normalizedQuery))
        }),
      }))
      .filter((group) => group.presets.length > 0)
  }, [activeCategory, groups, normalizedQuery])

  const visibleCount = visibleGroups.reduce((sum, group) => sum + group.presets.length, 0)
  const activeCategoryLabel = categoryFilters.find((category) => category.id === activeCategory)?.label || '全部'

  useEffect(() => {
    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
    window.setTimeout(() => searchRef.current?.focus(), 0)

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const focusable = dialogRef.current
        ? Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )).filter((element) => !element.hasAttribute('disabled') && element.offsetParent !== null)
        : []

      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousActiveElement?.focus()
    }
  }, [onClose])

  const handleOverlayKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && event.target === event.currentTarget) {
      event.preventDefault()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-2 sm:p-4"
      onClick={onClose}
      onKeyDown={handleOverlayKeyDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="provider-template-title"
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[var(--editor-line)] bg-[var(--editor-panel)] shadow-[0_28px_90px_-32px_rgba(15,23,42,0.65)] sm:max-h-[min(92dvh,760px)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-[var(--editor-line)] bg-[var(--background)]/75 px-4 py-3 sm:px-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 id="provider-template-title" className="truncate text-lg font-semibold text-[var(--editor-ink)]">
                快捷模板
              </h3>
              <p className="mt-0.5 text-xs text-[var(--editor-muted)]">
                {activeCategoryLabel} · {visibleCount} / {allPresets.length}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-[var(--editor-muted)] transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)]"
              aria-label="关闭快捷模板"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-[var(--editor-line)] bg-[var(--editor-panel)] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[var(--editor-muted)]" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索模板、模型或平台"
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--editor-ink)] outline-none placeholder:text-[var(--editor-muted)]"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="rounded-full p-1 text-[var(--editor-muted)] transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)]"
                aria-label="清空搜索"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto md:hidden">
            {categoryFilters.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${
                  activeCategory === category.id
                    ? 'border-[var(--editor-accent)] bg-[var(--editor-accent)]/10 text-[var(--editor-accent)]'
                    : 'border-[var(--editor-line)] text-[var(--editor-muted)] hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)]'
                }`}
              >
                {category.label} {category.count}
              </button>
            ))}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 overflow-hidden md:grid-cols-[13rem_minmax(0,1fr)]">
          <aside className="hidden min-h-0 overflow-y-auto border-r border-[var(--editor-line)] bg-[var(--background)]/45 p-3 md:block">
            <div className="space-y-1">
              {categoryFilters.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                    activeCategory === category.id
                      ? 'bg-[var(--editor-accent)]/10 text-[var(--editor-accent)]'
                      : 'text-[var(--editor-muted)] hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)]'
                  }`}
                >
                  <span className="truncate">{category.label}</span>
                  <span className="rounded-full bg-[var(--editor-panel)] px-2 py-0.5 text-[11px] text-[var(--editor-muted)]">
                    {category.count}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <div className="min-h-0 overflow-y-auto px-4 py-4 sm:px-5">
            {visibleGroups.length === 0 ? (
              <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-[var(--editor-line)] text-sm text-[var(--editor-muted)]">
                没有匹配模板
              </div>
            ) : (
              <div className="space-y-5">
                {visibleGroups.map((group) => (
                  <section key={group.category}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--editor-muted)]">
                        {group.category}
                      </h4>
                      <span className="text-xs text-[var(--editor-muted)]">{group.presets.length}</span>
                    </div>
                    <div className="grid gap-2 lg:grid-cols-2">
                      {group.presets.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => onSelect(preset.id)}
                          className="min-h-28 rounded-lg border border-[var(--editor-line)] bg-[var(--editor-panel)] px-4 py-3 text-left transition hover:border-[var(--editor-accent)] hover:bg-[var(--editor-soft)] focus-visible:border-[var(--editor-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--editor-accent)]/20"
                        >
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="min-w-0 text-sm font-semibold text-[var(--editor-ink)]">
                              {preset.name}
                            </div>
                            {preset.recommended ? (
                              <span className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-600">
                                推荐
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--editor-muted)]">
                            {preset.description}
                          </div>
                          <div className="mt-2 break-all rounded-md bg-[var(--background)] px-2 py-1 font-mono text-[11px] text-[var(--editor-muted)]">
                            {preset.defaultModel}
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-[var(--editor-line)] bg-[var(--background)]/75 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="text-xs text-[var(--editor-muted)]">
            {visibleCount} 个可选模板
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--editor-line)] px-3 py-2 text-sm text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => onSelect('custom')}
              className="rounded-lg border border-dashed border-[var(--editor-line)] px-3 py-2 text-left text-sm font-medium text-[var(--editor-ink)] transition hover:border-[var(--editor-accent)] hover:bg-[var(--editor-soft)] sm:min-w-48"
              title={customOptionDescription}
            >
              {customOptionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ProviderBasicFieldsProps<T extends BaseProviderFormState> {
  editing: T
  modelOptions: Array<{ value: string; label: string }>
  loadingModels: boolean
  models: Array<{ id: string; name: string }>
  modelsSource: 'provider' | 'preset' | null
  modelsWarning: string
  onChange: (patch: Partial<T>) => void
  onFetchModels: () => void
  fetchModelsLabel?: string
}

export function ProviderBasicFields<T extends BaseProviderFormState>({
  editing,
  modelOptions,
  loadingModels,
  models,
  modelsSource,
  modelsWarning,
  onChange,
  onFetchModels,
  fetchModelsLabel = '拉取模型列表',
}: ProviderBasicFieldsProps<T>) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--editor-ink)]">配置名称</label>
        <input
          type="text"
          value={editing.name}
          onChange={(event) => onChange({ name: event.target.value } as Partial<T>)}
          className="w-full rounded-lg border border-[var(--editor-line)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--editor-ink)]">平台</label>
        <input
          type="text"
          value={editing.provider_name || editing.provider}
          onChange={(event) => onChange({ provider_name: event.target.value } as Partial<T>)}
          className="w-full rounded-lg border border-[var(--editor-line)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-[var(--editor-ink)]">Base URL</label>
        <input
          type="url"
          value={editing.base_url}
          onChange={(event) => onChange({ base_url: event.target.value } as Partial<T>)}
          className="w-full rounded-lg border border-[var(--editor-line)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
        />
      </div>

      <div className="sm:col-span-2">
        <div className="mb-1 flex items-center justify-between gap-2">
          <label className="block text-sm font-medium text-[var(--editor-ink)]">API Key</label>
          {editing.api_key_url ? (
            <a
              href={editing.api_key_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--editor-accent)] hover:underline"
            >
              获取 Key
            </a>
          ) : null}
        </div>
        <input
          type="password"
          value={editing.api_key}
          onChange={(event) => onChange({ api_key: event.target.value } as Partial<T>)}
          className="w-full rounded-lg border border-[var(--editor-line)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
        />
        {editing.api_key_masked ? (
          <div className="mt-1 text-xs text-[var(--editor-muted)]">已保存：{editing.api_key_masked}</div>
        ) : null}
      </div>

      <div className="sm:col-span-2">
        <div className="mb-1 flex items-center justify-between gap-2">
          <label className="block text-sm font-medium text-[var(--editor-ink)]">模型</label>
          <button
            type="button"
            onClick={onFetchModels}
            disabled={loadingModels}
            className="rounded-md border border-[var(--editor-line)] px-2.5 py-1 text-xs text-[var(--editor-ink)] hover:bg-[var(--editor-soft)] disabled:opacity-50"
          >
            {loadingModels ? '拉取中…' : fetchModelsLabel}
          </button>
        </div>
        <input
          type="text"
          value={editing.model}
          onChange={(event) => onChange({ model: event.target.value } as Partial<T>)}
          className="w-full rounded-lg border border-[var(--editor-line)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
        />
        {models.length > 0 ? (
          <div className="mt-2 space-y-2">
            <Dropdown
              options={modelOptions}
              value={editing.model}
              onChange={(value) => onChange({ model: value } as Partial<T>)}
              placeholder={`搜索并选择已加载的 ${models.length} 个模型`}
            />
            <div className="text-xs text-[var(--editor-muted)]">
              已加载 {models.length} 个模型。可在下拉里搜索，也可以直接在上方手动输入模型 ID。
            </div>
          </div>
        ) : null}
        {modelsSource || modelsWarning ? (
          <div className="mt-1 text-xs text-[var(--editor-muted)]">
            {modelsSource === 'provider' ? '来源：服务商接口' : modelsSource === 'preset' ? '来源：模板回退' : ''}
            {modelsWarning ? ` · ${modelsWarning}` : ''}
          </div>
        ) : null}
      </div>
    </div>
  )
}
