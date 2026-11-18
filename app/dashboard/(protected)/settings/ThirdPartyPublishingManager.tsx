'use client'

import { KeyRound, Palette, RadioTower, Send } from 'lucide-react'
import { ApiTokensManager } from './ApiTokensManager'
import { WeChatBridgeManager } from './WeChatBridgeManager'
import { WeChatThemeManager } from './WeChatThemeManager'

export function ThirdPartyPublishingManager() {
  const flows = [
    { label: '外部工具', value: 'API Token', icon: KeyRound },
    { label: '复制与发布', value: '公众号样式', icon: Palette },
    { label: '微信草稿', value: 'Bridge 连接', icon: RadioTower },
  ]

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[var(--editor-line)] bg-[var(--editor-panel)] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--editor-ink)]">
              <Send className="h-4 w-4 text-[var(--editor-muted)]" />
              第三方发布
            </h3>
            <p className="text-sm text-[var(--editor-muted)]">
              令牌、公众号样式和微信 bridge 独立配置，编辑器发布时统一读取。
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
            {flows.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.value}
                  className="flex items-center gap-3 rounded-xl border border-[var(--editor-line)] bg-[var(--background)] px-3 py-2"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--editor-soft)] text-[var(--editor-ink)]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-medium text-[var(--editor-muted)]">
                      {item.label}
                    </span>
                    <span className="block truncate text-sm font-semibold text-[var(--editor-ink)]">
                      {item.value}
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--editor-line)] bg-[var(--editor-panel)] p-5">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--editor-ink)]">
            <KeyRound className="h-4 w-4 text-[var(--editor-muted)]" />
            外部工具 Token
          </h3>
          <p className="text-sm text-[var(--editor-muted)]">
            用于 Obsidian、浏览器插件、脚本或其他工具调用后台接口。
          </p>
        </div>
        <div className="mt-5">
          <ApiTokensManager />
        </div>
      </section>

      <WeChatThemeManager />
      <WeChatBridgeManager />
    </div>
  )
}
