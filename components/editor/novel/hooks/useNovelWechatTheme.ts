import { useEffect, useMemo, useState } from 'react'
import { fetchWechatExportThemeConfig, getPreferredWechatExportThemeId } from '@/lib/wechat-theme-client'
import {
  DEFAULT_WECHAT_EXPORT_THEME_CONFIG,
  getWechatExportTheme,
  type WechatExportThemeConfig,
} from '@/lib/wechat-themes'

export function useNovelWechatTheme() {
  const [wechatThemeConfig, setWechatThemeConfig] = useState<WechatExportThemeConfig>(DEFAULT_WECHAT_EXPORT_THEME_CONFIG)
  const [selectedWechatThemeId, setSelectedWechatThemeId] = useState(DEFAULT_WECHAT_EXPORT_THEME_CONFIG.defaultThemeId)

  const selectedWechatTheme = useMemo(() => (
    getWechatExportTheme(wechatThemeConfig, selectedWechatThemeId)
  ), [wechatThemeConfig, selectedWechatThemeId])

  useEffect(() => {
    void fetchWechatExportThemeConfig().then((nextConfig) => {
      setWechatThemeConfig(nextConfig)
      setSelectedWechatThemeId(getPreferredWechatExportThemeId(nextConfig))
    })
  }, [])

  return {
    wechatThemeConfig,
    selectedWechatThemeId,
    setSelectedWechatThemeId,
    selectedWechatTheme,
  }
}
