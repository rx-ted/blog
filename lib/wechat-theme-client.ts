import {
  DEFAULT_WECHAT_EXPORT_THEME_CONFIG,
  WECHAT_EXPORT_THEME_LOCAL_STORAGE_KEY,
  getWechatExportTheme,
  resolveWechatExportThemeConfig,
  type WechatExportThemeConfig,
} from '@/lib/wechat-themes'

export async function fetchWechatExportThemeConfig(): Promise<WechatExportThemeConfig> {
  try {
    const response = await fetch('/api/settings/wechat-export-themes', {
      cache: 'no-store',
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error('Failed to load WeChat export themes')
    return resolveWechatExportThemeConfig(JSON.stringify(data))
  } catch {
    return DEFAULT_WECHAT_EXPORT_THEME_CONFIG
  }
}

export function readPreferredWechatExportThemeId() {
  if (typeof window === 'undefined') return ''
  return (
    window.localStorage.getItem(WECHAT_EXPORT_THEME_LOCAL_STORAGE_KEY) || ''
  )
}

export function rememberPreferredWechatExportThemeId(themeId: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(WECHAT_EXPORT_THEME_LOCAL_STORAGE_KEY, themeId)
}

export function getPreferredWechatExportThemeId(
  config: WechatExportThemeConfig,
  explicitThemeId?: string | null,
) {
  const preferred =
    explicitThemeId ||
    readPreferredWechatExportThemeId() ||
    config.defaultThemeId
  return getWechatExportTheme(config, preferred).id
}
