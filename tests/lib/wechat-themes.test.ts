import { describe, expect, it } from 'vitest'
import {
  WECHAT_EXPORT_BUILTIN_THEMES,
  resolveWechatExportThemeConfig,
  serializeWechatExportThemeConfig,
} from '@/lib/wechat-themes'

describe('wechat export themes', () => {
  it('keeps builtin themes and accepts custom themes from settings', () => {
    const config = resolveWechatExportThemeConfig(
      JSON.stringify({
        defaultThemeId: 'custom-green',
        themes: [
          {
            id: 'custom-green',
            name: 'Custom Green',
            description: 'A custom style',
            swatches: ['#ffffff', '#008000', '#112233'],
            css: '.wechat-export-content h2 { color: #008000; }',
          },
        ],
      }),
    )

    expect(config.defaultThemeId).toBe('custom-green')
    expect(config.themes.length).toBeGreaterThan(30)
    expect(config.themes.map((theme) => theme.id)).toEqual(
      expect.arrayContaining([
        WECHAT_EXPORT_BUILTIN_THEMES[0].id,
        'custom-green',
      ]),
    )
    expect(
      config.themes.find((theme) => theme.id === 'custom-green')?.swatches,
    ).toEqual(['#ffffff', '#008000', '#112233'])
  })

  it('falls back to the default builtin theme when stored config is invalid', () => {
    const config = resolveWechatExportThemeConfig('{bad json')

    expect(config.defaultThemeId).toBe(WECHAT_EXPORT_BUILTIN_THEMES[0].id)
    expect(config.themes.length).toBeGreaterThan(1)
  })

  it('includes a Qiaomu podcast long-form reading theme', () => {
    const theme = WECHAT_EXPORT_BUILTIN_THEMES.find(
      (theme) => theme.id === 'qiaomu-podcast',
    )

    expect(theme?.name).toBe('木羽播客')
    expect(theme?.css).toContain('font-size: 17px;')
    expect(theme?.css).toContain('line-height: 1.9;')
    expect(theme?.css).toContain('letter-spacing: 0.04em;')
    expect(theme?.css).toContain('.wechat-export-content > p + p')
    expect(theme?.css).toContain('padding: 20px 8px 32px;')
    expect(theme?.css).toContain('text-align: left; margin: 2.5em 0 1.2em;')
    expect(theme?.css).toContain(
      'background: linear-gradient(to right, transparent, #e8e8e8, transparent);',
    )
  })

  it('includes a blueprint-annotation Qiaomu mobile reading theme', () => {
    const theme = WECHAT_EXPORT_BUILTIN_THEMES.find(
      (theme) => theme.id === 'qiaomu-clean-reading',
    )

    expect(theme?.name).toBe('木羽简阅')
    expect(theme?.builtin).toBe(true)
    expect(theme?.swatches).toEqual([
      '#fbfdfe',
      '#25343f',
      '#0f7285',
      '#dff0f4',
    ])
    expect(theme?.css).toContain('padding: 18px 8px 32px;')
    expect(theme?.css).toContain('font-size: 16px;')
    expect(theme?.css).toContain('line-height: 1.8;')
    expect(theme?.css).toContain('letter-spacing: 0;')
    expect(theme?.css).toContain('text-align: left;')
    // H2：纯文本左对齐 + 底部 1px 深青发线，无编号/竖线/背景
    expect(theme?.css).toContain('border-bottom: 1px solid #c3d9e0;')
    expect(theme?.css).toContain(
      'color: #142530; font-size: 20px; font-weight: 600;',
    )
    // strong：浅青底高亮块 + 深青字
    expect(theme?.css).toContain('background: #dff0f4;')
    expect(theme?.css).toContain('color: #0b5b6b;')
    // blockquote：上下双发线三明治
    expect(theme?.css).toContain('border-top: 1px solid #c3d9e0;')
    // 图注：居中同时压过 compat 的 text-align 与 text-align-last（单行图注由后者决定对齐）
    expect(theme?.css).toContain('text-align: center !important;')
    expect(theme?.css).toContain('text-align-last: center !important;')
    // 主题专属浅色代码块：高特异性 + !important 覆盖全局深色 compat 层
    expect(theme?.css).toContain(
      '.wechat-export-root .wechat-export-article .wechat-export-content pre',
    )
    expect(theme?.css).toContain('background: #f2f8fa !important;')
    expect(theme?.css).toContain('background: #e2edf1 !important;')
    expect(theme?.css).toContain('border-color: #d3e2e8 !important;')
    expect(theme?.css).toContain('color: #2a3b46 !important;')
    // 上一版米白墨绿完全移除
    expect(theme?.css).not.toContain('#2e5c4a')
    expect(theme?.css).not.toContain('Songti SC')
  })

  it('includes a Dacomming inspired WeChat editorial theme', () => {
    const theme = WECHAT_EXPORT_BUILTIN_THEMES.find(
      (theme) => theme.id === 'dacomming-editorial',
    )

    expect(theme?.name).toBe('大聪明')
    expect(theme?.builtin).toBe(true)
    expect(theme?.swatches).toEqual([
      '#ffffff',
      '#151515',
      '#2f5f8f',
      '#f7f7f4',
      '#fff3c4',
    ])
    expect(theme?.css).toContain('font-size: 16.5px;')
    expect(theme?.css).toContain('line-height: 1.9;')
    expect(theme?.css).toMatch(
      /\.wechat-export-content \{\n\s+font-size: 16\.5px;\n\s+line-height: 1\.9;\n\s+letter-spacing: 0;/,
    )
    expect(theme?.css).toMatch(
      /\.wechat-export-content > p \{[\s\S]*?letter-spacing: 0;/,
    )
    expect(theme?.css).toContain('padding: 18px 18px 34px;')
    expect(theme?.css).toContain('background: #fff3c4;')
    expect(theme?.css).toContain(
      'background: linear-gradient(to top, #fff3c4 42%, transparent 42%);',
    )
    expect(theme?.css).toContain('text-underline-offset: 3px;')
  })

  it('serializes through the same normalizer used by the API', () => {
    const serialized = serializeWechatExportThemeConfig({
      defaultThemeId: 'custom',
      themes: [
        {
          id: 'custom',
          name: 'Custom',
          description: '',
          swatches: ['#fff', '#123456'],
          css: '.wechat-export-title { color: red; }',
        },
      ],
    })

    const config = resolveWechatExportThemeConfig(serialized)
    expect(config.defaultThemeId).toBe('custom')
    expect(
      config.themes.find((theme) => theme.id === 'custom')?.swatches,
    ).toEqual(['#fff', '#123456'])
  })
})
