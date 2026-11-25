import { NextResponse } from 'next/server'
import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { getSetting } from '@/lib/db'
import {
  WECHAT_EXPORT_THEME_CONFIG_SETTING_KEY,
  resolveWechatExportThemeConfig,
} from '@/lib/wechat-themes'

export async function GET() {
  try {
    const env = await getAppCloudflareEnv()
    if (!env?.DB) {
      return NextResponse.json(resolveWechatExportThemeConfig(), {
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    const rawConfig = await getSetting(
      env.DB,
      WECHAT_EXPORT_THEME_CONFIG_SETTING_KEY,
    )
    return NextResponse.json(resolveWechatExportThemeConfig(rawConfig), {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json(resolveWechatExportThemeConfig(), {
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
