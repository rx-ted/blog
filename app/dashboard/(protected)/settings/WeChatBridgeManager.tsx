'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, RefreshCw, RadioTower } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { normalizeBaseUrl } from '@/lib/ai-provider-profiles'

interface BridgeConfig {
  enabled: boolean
  base_url: string
  token_masked: string
  configured: boolean
}

interface BridgeAccount {
  id: string
  name: string
}

const EMPTY_CONFIG: BridgeConfig = {
  enabled: false,
  base_url: '',
  token_masked: '',
  configured: false,
}

export function WeChatBridgeManager() {
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [refreshingAccounts, setRefreshingAccounts] = useState(false)

  const [config, setConfig] = useState<BridgeConfig>(EMPTY_CONFIG)
  const [baseUrl, setBaseUrl] = useState('')
  const [token, setToken] = useState('')
  const [accounts, setAccounts] = useState<BridgeAccount[]>([])
  const [testMessage, setTestMessage] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const loadAccounts = async () => {
    setRefreshingAccounts(true)
    try {
      const res = await fetch('/api/admin/wechat-bridge/accounts')
      const data = await res.json().catch(() => ({})) as { accounts?: BridgeAccount[]; error?: string }
      if (!res.ok) throw new Error(data.error || '加载公众号账号失败')
      setAccounts(data.accounts || [])
    } catch (error) {
      setAccounts([])
      toast.error(error instanceof Error ? error.message : '加载公众号账号失败')
    } finally {
      setRefreshingAccounts(false)
    }
  }

  const loadConfig = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/wechat-bridge')
      const data = await res.json().catch(() => ({})) as { config?: BridgeConfig; error?: string }
      if (!res.ok) throw new Error(data.error || '加载 bridge 配置失败')

      const nextConfig = data.config || EMPTY_CONFIG
      setConfig(nextConfig)
      setBaseUrl(nextConfig.base_url || '')
      setToken('')

      if (nextConfig.enabled && nextConfig.configured) {
        await loadAccounts()
      } else {
        setAccounts([])
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载 bridge 配置失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadConfig()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setTestMessage('')
    setTestStatus('idle')

    try {
      const payload = {
        enabled: config.enabled,
        base_url: normalizeBaseUrl(baseUrl),
        token: token.trim(),
      }

      const res = await fetch('/api/admin/wechat-bridge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({})) as { config?: BridgeConfig; error?: string }
      if (!res.ok) throw new Error(data.error || '保存 bridge 配置失败')

      const nextConfig = data.config || EMPTY_CONFIG
      setConfig(nextConfig)
      setBaseUrl(nextConfig.base_url || '')
      setToken('')
      toast.success('Bridge 配置已保存')

      if (nextConfig.enabled && nextConfig.configured) {
        await loadAccounts()
      } else {
        setAccounts([])
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存 bridge 配置失败')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestMessage('')

    try {
      const res = await fetch('/api/admin/wechat-bridge/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_url: normalizeBaseUrl(baseUrl),
          token: token.trim(),
        }),
      })
      const data = await res.json().catch(() => ({})) as {
        success?: boolean
        accounts?: BridgeAccount[]
        error?: string
      }
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Bridge 连接测试失败')
      }

      const nextAccounts = data.accounts || []
      setAccounts(nextAccounts)
      setTestMessage(`连接成功，可用公众号 ${nextAccounts.length} 个`)
      setTestStatus('success')
      toast.success('Bridge 连接正常')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bridge 连接测试失败'
      setTestMessage(message)
      setTestStatus('error')
      toast.error(message)
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--editor-line)] bg-[var(--editor-panel)] p-5 text-sm text-[var(--editor-muted)]">
        正在加载 Bridge 配置…
      </div>
    )
  }

  const bridgeReady = config.enabled && config.configured
  const statusLabel = bridgeReady ? '已配置' : config.enabled ? '待保存' : '未启用'

  return (
    <section className="rounded-2xl border border-[var(--editor-line)] bg-[var(--editor-panel)] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--editor-ink)]">
            <RadioTower className="h-4 w-4 text-[var(--editor-muted)]" />
            Bridge 连接
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--editor-muted)]">
            <span className={`rounded-full px-2 py-0.5 ${
              bridgeReady
                ? 'bg-emerald-50 text-emerald-700'
                : config.enabled
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-[var(--editor-soft)] text-[var(--editor-muted)]'
            }`}>
              {statusLabel}
            </span>
            <span>{accounts.length} 个公众号</span>
            {config.token_masked && <span>Token {config.token_masked}</span>}
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={config.enabled}
          onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
          className={`inline-flex w-fit items-center gap-2 rounded-full border px-2 py-1 text-sm transition ${
            config.enabled
              ? 'border-[var(--editor-accent)]/35 bg-[var(--editor-accent)]/10 text-[var(--editor-ink)]'
              : 'border-[var(--editor-line)] bg-[var(--background)] text-[var(--editor-muted)]'
          }`}
        >
          <span className={`block h-4 w-4 rounded-full transition ${
            config.enabled ? 'bg-[var(--editor-accent)]' : 'bg-[var(--editor-line)]'
          }`} />
          启用 Bridge
        </button>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-semibold tracking-wider text-[var(--stone-gray)]">
                Bridge Base URL
              </label>
              <input
                type="url"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="https://bridge.example.com"
                className="w-full rounded-lg border border-[var(--editor-line)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold tracking-wider text-[var(--stone-gray)]">
                Bridge Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder={config.token_masked ? `已保存：${config.token_masked}；留空不修改` : '输入 bridge token'}
                className="w-full rounded-lg border border-[var(--editor-line)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
              />
            </div>
          </div>

          {testMessage && (
            <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${
              testStatus === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : testStatus === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-[var(--editor-line)] bg-[var(--background)] text-[var(--editor-muted)]'
            }`}>
              {testStatus === 'success'
                ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
              <span>{testMessage}</span>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="rounded-lg border border-[var(--editor-line)] px-3 py-2 text-sm text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)] disabled:opacity-50"
            >
              {testing ? '测试中…' : '测试连接'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-[var(--editor-accent)] px-3 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
            >
              {saving ? '保存中…' : '保存配置'}
            </button>
          </div>
        </div>

        <aside className="rounded-xl border border-[var(--editor-line)] bg-[var(--background)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--editor-line)] px-4 py-3">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-[var(--editor-ink)]">可用公众号</h4>
              <p className="mt-0.5 text-xs text-[var(--editor-muted)]">{accounts.length} 个账号</p>
            </div>

            <button
              type="button"
              onClick={() => void loadAccounts()}
              disabled={refreshingAccounts || !bridgeReady}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--editor-line)] px-2.5 py-1.5 text-xs text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshingAccounts ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>

          {accounts.length > 0 ? (
            <ul className="max-h-[280px] overflow-y-auto overscroll-contain divide-y divide-[var(--editor-line)]">
              {accounts.map((account) => (
                <li key={account.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[var(--editor-ink)]">{account.name}</div>
                    <div className="mt-1 text-xs text-[var(--editor-muted)]">{account.id}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-sm text-[var(--editor-muted)]">
              {bridgeReady
                ? 'Bridge 已连接，但还没有返回可用公众号账号。'
                : '先保存可用的 bridge 配置，再从 bridge 拉取公众号列表。'}
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
