import { NextResponse } from 'next/server'
import { normalizeTheme } from '@/lib/appearance'
import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { getPublicSettings } from '@/lib/public-site-cache'

export async function GET() {
  try {
    const env = await getAppCloudflareEnv()
    if (!env?.DB) {
      return NextResponse.json({ font: '', defaultTheme: 'default' })
    }

    const settings = await getPublicSettings(env, [
      'body_font',
      'default_theme',
    ])

    return NextResponse.json(
      {
        font: settings.body_font || '',
        defaultTheme: normalizeTheme(settings.default_theme),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    )
  } catch {
    return NextResponse.json({ font: '', defaultTheme: 'default' })
  }
}
