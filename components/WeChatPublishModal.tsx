'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import { WeChatThemeSelector } from '@/components/WeChatThemeSelector'
import {
  buildWechatBridgeArticleExportAsync,
  buildWechatBridgeCoverImageUrl,
  extractFirstWechatBridgeCoverImageUrl,
} from '@/lib/wechat-copy'
import {
  fetchWechatExportThemeConfig,
  getPreferredWechatExportThemeId,
  rememberPreferredWechatExportThemeId,
} from '@/lib/wechat-theme-client'
import {
  DEFAULT_WECHAT_EXPORT_THEME_CONFIG,
  getWechatExportTheme,
  type WechatExportThemeConfig,
} from '@/lib/wechat-themes'
import type { WechatPublishInspectResult } from '@/lib/wechat-publish-inspect'
import {
  WECHAT_DEFAULT_AUTHOR,
  WECHAT_DEFAULT_NEED_OPEN_COMMENT,
  WECHAT_DEFAULT_ONLY_FANS_CAN_COMMENT,
} from '@/lib/wechat-publish-defaults'
import {
  WECHAT_DRAFT_AUTHOR_MAX_CHARS,
  WECHAT_DRAFT_DIGEST_MAX_BYTES,
  WECHAT_DRAFT_DIGEST_MAX_CHARS,
  truncateWechatText,
} from '@/lib/wechat-publish-limits'

interface BridgeAccount {
  id: string
  name: string
}

interface WechatPublishPayload {
  account_id: string
  title: string
  content_html: string
  author: string
  digest: string
  content_source_url: string
  cover_image_url: string
  publish_now: boolean
  need_open_comment: boolean
  only_fans_can_comment: boolean
}

interface WeChatPublishModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  html: string
  defaultDigest?: string
  defaultSourceUrl?: string
  defaultCoverImageUrl?: string
  exportThemeId?: string
}

const fieldClassName =
  'w-full rounded-xl border border-[var(--editor-line)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--editor-ink)] outline-none transition focus:border-[var(--editor-accent)] focus:ring-2 focus:ring-[var(--editor-accent)]/10 disabled:cursor-not-allowed disabled:opacity-60'
const labelClassName =
  'block text-[11px] font-semibold tracking-wide text-[var(--editor-muted)]'

function PublishToggle({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label
      className={`group flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
        checked
          ? 'border-[var(--editor-accent)]/40 bg-[var(--editor-accent)]/10 text-[var(--editor-ink)]'
          : 'border-[var(--editor-line)] bg-[var(--background)] text-[var(--editor-muted)] hover:bg-[var(--editor-soft)]'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <span className="font-medium">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 rounded-full transition ${
          checked ? 'bg-[var(--editor-accent)]' : 'bg-[var(--editor-line)]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
    </label>
  )
}

export function WeChatPublishModal({
  isOpen,
  onClose,
  title,
  html,
  defaultDigest = '',
  defaultSourceUrl = '',
  defaultCoverImageUrl = '',
  exportThemeId = '',
}: WeChatPublishModalProps) {
  const toast = useToast()

  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [accounts, setAccounts] = useState<BridgeAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [author, setAuthor] = useState(WECHAT_DEFAULT_AUTHOR)
  const [digest, setDigest] = useState(defaultDigest)
  const [sourceUrl, setSourceUrl] = useState(defaultSourceUrl)
  const [coverImageUrl, setCoverImageUrl] = useState(defaultCoverImageUrl)
  const [publishNow, setPublishNow] = useState(false)
  const [needOpenComment, setNeedOpenComment] = useState(
    WECHAT_DEFAULT_NEED_OPEN_COMMENT,
  )
  const [onlyFansCanComment, setOnlyFansCanComment] = useState(
    WECHAT_DEFAULT_ONLY_FANS_CAN_COMMENT,
  )
  const [loadError, setLoadError] = useState('')
  const [checking, setChecking] = useState(false)
  const [inspectResult, setInspectResult] =
    useState<WechatPublishInspectResult | null>(null)
  const [themeConfig, setThemeConfig] = useState<WechatExportThemeConfig>(
    DEFAULT_WECHAT_EXPORT_THEME_CONFIG,
  )
  const [selectedThemeId, setSelectedThemeId] = useState(
    DEFAULT_WECHAT_EXPORT_THEME_CONFIG.defaultThemeId,
  )

  const selectedTheme = useMemo(
    () => getWechatExportTheme(themeConfig, selectedThemeId),
    [themeConfig, selectedThemeId],
  )

  const loadAccounts = async () => {
    setLoadingAccounts(true)
    setLoadError('')

    try {
      const res = await fetch('/api/admin/wechat-bridge/accounts')
      const data = (await res.json().catch(() => ({}))) as {
        accounts?: BridgeAccount[]
        error?: string
      }
      if (!res.ok) throw new Error(data.error || '加载公众号账号失败')

      const nextAccounts = data.accounts || []
      setAccounts(nextAccounts)
      setSelectedAccountId((current) => {
        if (current && nextAccounts.some((account) => account.id === current)) {
          return current
        }
        return nextAccounts[0]?.id || ''
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '加载公众号账号失败'
      setAccounts([])
      setSelectedAccountId('')
      setLoadError(message)
    } finally {
      setLoadingAccounts(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return

    setAuthor(WECHAT_DEFAULT_AUTHOR)
    setDigest(
      truncateWechatText(
        defaultDigest,
        WECHAT_DRAFT_DIGEST_MAX_CHARS,
        WECHAT_DRAFT_DIGEST_MAX_BYTES,
      ),
    )
    setSourceUrl(defaultSourceUrl)
    setCoverImageUrl(defaultCoverImageUrl)
    setPublishNow(false)
    setNeedOpenComment(WECHAT_DEFAULT_NEED_OPEN_COMMENT)
    setOnlyFansCanComment(WECHAT_DEFAULT_ONLY_FANS_CAN_COMMENT)
    setInspectResult(null)

    void fetchWechatExportThemeConfig().then((nextConfig) => {
      setThemeConfig(nextConfig)
      setSelectedThemeId(
        getPreferredWechatExportThemeId(nextConfig, exportThemeId),
      )
    })
    void loadAccounts()
  }, [
    isOpen,
    defaultDigest,
    defaultSourceUrl,
    defaultCoverImageUrl,
    exportThemeId,
  ])

  if (!isOpen) return null

  const buildPublishPayload = async (): Promise<WechatPublishPayload> => {
    const { normalizedTitle, exportedHtml } =
      await buildWechatBridgeArticleExportAsync(title, html, {
        theme: selectedTheme,
      })
    const finalCoverUrl =
      buildWechatBridgeCoverImageUrl(coverImageUrl) ||
      buildWechatBridgeCoverImageUrl(defaultCoverImageUrl) ||
      extractFirstWechatBridgeCoverImageUrl(exportedHtml)

    return {
      account_id: selectedAccountId,
      title: normalizedTitle,
      content_html: exportedHtml,
      author: author.trim(),
      digest: truncateWechatText(
        digest,
        WECHAT_DRAFT_DIGEST_MAX_CHARS,
        WECHAT_DRAFT_DIGEST_MAX_BYTES,
      ),
      content_source_url: sourceUrl.trim(),
      cover_image_url: finalCoverUrl,
      publish_now: publishNow,
      need_open_comment: needOpenComment,
      only_fans_can_comment: needOpenComment && onlyFansCanComment,
    }
  }

  const requestInspect = async (payload: WechatPublishPayload) => {
    const res = await fetch('/api/admin/wechat-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        dry_run: true,
      }),
    })
    const data = (await res.json().catch(() => ({}))) as {
      error?: string
      inspect?: WechatPublishInspectResult
    }
    if (!res.ok || !data.inspect)
      throw new Error(data.error || '发布前检查失败')
    setInspectResult(data.inspect)
    return data.inspect
  }

  const handleInspect = async () => {
    setChecking(true)

    try {
      const payload = await buildPublishPayload()
      const inspect = await requestInspect(payload)
      const hasErrors = inspect.checks.some((check) => check.level === 'error')
      const hasWarnings = inspect.checks.some(
        (check) => check.level === 'warning',
      )

      if (hasErrors) {
        toast.error('发布前检查未通过')
      } else if (hasWarnings) {
        toast.warning('发布前检查有提醒')
      } else {
        toast.success('发布前检查通过')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发布前检查失败')
    } finally {
      setChecking(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedAccountId) {
      toast.error('请先选择公众号账号')
      return
    }

    setSubmitting(true)

    try {
      const payload = await buildPublishPayload()
      const inspect = await requestInspect(payload)
      const blocking = inspect.checks.filter((check) => check.level === 'error')

      if (blocking.length > 0) {
        toast.error(blocking[0]?.message || '发布前检查未通过')
        return
      }

      const res = await fetch('/api/admin/wechat-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        media_id?: string
        publish_id?: string
      }
      if (!res.ok) throw new Error(data.error || '提交公众号发布失败')

      toast.success(publishNow ? '公众号发布任务已提交' : '公众号草稿已创建')
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '提交公众号发布失败')
    } finally {
      setSubmitting(false)
    }
  }

  const checkErrors =
    inspectResult?.checks.filter((check) => check.level === 'error') || []
  const checkWarnings =
    inspectResult?.checks.filter((check) => check.level === 'warning') || []
  const checkInfos =
    inspectResult?.checks.filter((check) => check.level === 'info') || []
  const visibleChecks =
    inspectResult?.checks
      .filter((check) => check.level !== 'info')
      .slice(0, 4) || []
  const checkStatus =
    checkErrors.length > 0
      ? 'error'
      : checkWarnings.length > 0
        ? 'warning'
        : inspectResult
          ? 'ok'
          : 'idle'
  const checkStatusLabel =
    checkStatus === 'error'
      ? '有阻断项'
      : checkStatus === 'warning'
        ? '有提醒'
        : checkStatus === 'ok'
          ? '已通过'
          : '待检查'

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/50 p-2 sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose()
      }}
    >
      <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--editor-line)] bg-[var(--editor-panel)] shadow-[0_28px_90px_-32px_rgba(15,23,42,0.6)] sm:max-h-[min(92dvh,760px)]">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--editor-line)] bg-[var(--background)]/70 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-[var(--editor-ink)]">
              发布到公众号
            </h3>
            <p className="mt-0.5 truncate text-xs text-[var(--editor-muted)]">
              {selectedTheme?.name || '公众号样式'} · {checkStatusLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full p-2 text-[var(--editor-muted)] transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)] disabled:opacity-50"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.85fr)]">
            <div className="space-y-4">
              <section className="space-y-3 rounded-2xl border border-[var(--editor-line)] bg-[var(--background)]/70 p-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="space-y-1.5">
                    <label className={labelClassName}>公众号账号</label>
                    <select
                      value={selectedAccountId}
                      onChange={(event) =>
                        setSelectedAccountId(event.target.value)
                      }
                      disabled={loadingAccounts || accounts.length === 0}
                      className={fieldClassName}
                    >
                      {accounts.length === 0 && (
                        <option value="">暂无可用账号</option>
                      )}
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} · {account.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadAccounts()}
                    disabled={loadingAccounts}
                    className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl border border-[var(--editor-line)] bg-[var(--editor-panel)] px-3 text-sm font-medium text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)] disabled:opacity-50 md:mt-[23px]"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${loadingAccounts ? 'animate-spin' : ''}`}
                    />
                    刷新
                  </button>
                </div>
                {loadError && (
                  <p className="text-xs text-rose-600">{loadError}</p>
                )}

                <div className="space-y-1.5">
                  <label className={labelClassName}>公众号样式</label>
                  <WeChatThemeSelector
                    themes={themeConfig.themes}
                    value={selectedThemeId}
                    onChange={(themeId) => {
                      setSelectedThemeId(themeId)
                      rememberPreferredWechatExportThemeId(themeId)
                      setInspectResult(null)
                    }}
                    variant="field"
                    align="left"
                    panelClassName="w-[min(25rem,calc(100vw-2rem))]"
                  />
                </div>
              </section>

              <section className="grid gap-3 rounded-2xl border border-[var(--editor-line)] bg-[var(--background)]/70 p-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className={labelClassName}>作者</label>
                  <input
                    type="text"
                    value={author}
                    onChange={(event) => setAuthor(event.target.value)}
                    maxLength={WECHAT_DRAFT_AUTHOR_MAX_CHARS}
                    placeholder={WECHAT_DEFAULT_AUTHOR}
                    className={fieldClassName}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelClassName}>原文链接</label>
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(event) => setSourceUrl(event.target.value)}
                    placeholder="选填"
                    className={fieldClassName}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className={labelClassName}>摘要</label>
                  <textarea
                    value={digest}
                    onChange={(event) => {
                      setDigest(
                        truncateWechatText(
                          event.target.value,
                          WECHAT_DRAFT_DIGEST_MAX_CHARS,
                          WECHAT_DRAFT_DIGEST_MAX_BYTES,
                        ),
                      )
                    }}
                    maxLength={WECHAT_DRAFT_DIGEST_MAX_CHARS}
                    rows={2}
                    placeholder="默认使用文章描述，选填"
                    className={`${fieldClassName} min-h-[76px] resize-none`}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className={labelClassName}>封面图 URL</label>
                  <input
                    type="url"
                    value={coverImageUrl}
                    onChange={(event) => setCoverImageUrl(event.target.value)}
                    placeholder="留空时自动使用默认封面"
                    className={fieldClassName}
                  />
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <section className="space-y-3 rounded-2xl border border-[var(--editor-line)] bg-[var(--background)]/70 p-4">
                <p className={labelClassName}>发布选项</p>
                <PublishToggle
                  checked={publishNow}
                  label="立即发布"
                  onChange={setPublishNow}
                />
                <PublishToggle
                  checked={needOpenComment}
                  label="开启评论"
                  onChange={(checked) => {
                    setNeedOpenComment(checked)
                    if (!checked) setOnlyFansCanComment(false)
                  }}
                />
                <PublishToggle
                  checked={onlyFansCanComment}
                  disabled={!needOpenComment}
                  label="仅粉丝可评论"
                  onChange={setOnlyFansCanComment}
                />
              </section>

              <section className="space-y-3 rounded-2xl border border-[var(--editor-line)] bg-[var(--background)]/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--editor-ink)]">
                    {checking ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--editor-muted)]" />
                    ) : checkStatus === 'ok' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : checkStatus === 'error' ? (
                      <AlertCircle className="h-4 w-4 text-rose-600" />
                    ) : checkStatus === 'warning' ? (
                      <Info className="h-4 w-4 text-amber-600" />
                    ) : (
                      <Info className="h-4 w-4 text-[var(--editor-muted)]" />
                    )}
                    <span>{checkStatusLabel}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleInspect()}
                    disabled={checking || submitting}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--editor-line)] bg-[var(--editor-panel)] px-2.5 py-1.5 text-xs font-medium text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)] disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`}
                    />
                    检查
                  </button>
                </div>

                {inspectResult ? (
                  <div className="space-y-3 text-xs text-[var(--editor-muted)]">
                    <div className="grid grid-cols-3 gap-2">
                      <span className="rounded-xl border border-[var(--editor-line)] bg-[var(--editor-panel)] px-2 py-2 text-center">
                        <span className="block font-semibold text-[var(--editor-ink)]">
                          {inspectResult.summary.image_count}
                        </span>
                        图片
                      </span>
                      <span className="rounded-xl border border-[var(--editor-line)] bg-[var(--editor-panel)] px-2 py-2 text-center">
                        <span className="block font-semibold text-[var(--editor-ink)]">
                          {inspectResult.summary.cover_ready ? 'OK' : '缺失'}
                        </span>
                        封面
                      </span>
                      <span className="rounded-xl border border-[var(--editor-line)] bg-[var(--editor-panel)] px-2 py-2 text-center">
                        <span className="block font-semibold text-[var(--editor-ink)]">
                          {inspectResult.summary.estimated_upload_seconds}s
                        </span>
                        上传
                      </span>
                    </div>
                    {visibleChecks.length > 0 ? (
                      <ul className="max-h-28 space-y-1 overflow-y-auto pr-1">
                        {visibleChecks.map((check) => (
                          <li
                            key={`${check.code}-${check.field || ''}`}
                            className={`rounded-lg px-2 py-1.5 ${
                              check.level === 'error'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {check.message}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-lg bg-emerald-50 px-2 py-1.5 text-emerald-700">
                        可以提交到公众号。
                      </p>
                    )}
                    {checkInfos.length > 0 && <p>提示 {checkInfos.length}</p>}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--editor-muted)]">
                    提交前会自动检查。
                  </p>
                )}
              </section>
            </aside>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--editor-line)] bg-[var(--editor-panel)] px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-[var(--editor-line)] px-4 py-2.5 text-sm font-medium text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)] disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || loadingAccounts || accounts.length === 0}
            className="rounded-xl bg-[var(--editor-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
          >
            {submitting ? '提交中…' : publishNow ? '提交发布' : '创建草稿'}
          </button>
        </div>
      </div>
    </div>
  )
}
