export interface WechatExportTheme {
  id: string
  name: string
  description: string
  css: string
  swatches?: string[]
  builtin?: boolean
}

export interface WechatExportThemeConfig {
  defaultThemeId: string
  themes: WechatExportTheme[]
}

export const WECHAT_EXPORT_THEME_CONFIG_SETTING_KEY = 'wechat_export_theme_config'
export const WECHAT_EXPORT_THEME_LOCAL_STORAGE_KEY = 'qmblog:wechat-export-theme'

const DEFAULT_THEME_ID = 'qm-default'

function compactCss(input: string) {
  return input.trim()
}

function brandTheme(options: {
  id: string
  name: string
  description: string
  swatches: string[]
  css: string
}): WechatExportTheme {
  return {
    ...options,
    builtin: true,
    css: compactCss(options.css),
  }
}

function buildEditorialCss(options: {
  rootBg: string
  articleBg: string
  titleColor: string
  bodyColor: string
  accent: string
  accentSoft: string
  border: string
  muted: string
  titleFont?: string
  bodyFont?: string
  titleSize?: string
  titleWeight?: string
  titleTransform?: string
  titleSpacing?: string
  articlePadding?: string
  articleRadius?: string
  h2Css?: string
  h3Css?: string
  quoteCss?: string
  codeCss?: string
  preCss?: string
  tableCss?: string
  imageCss?: string
  extraCss?: string
}) {
  return compactCss(`
.wechat-export-root {
  background: ${options.rootBg};
}

.wechat-export-article {
  padding: ${options.articlePadding || '0 12px'};
  border-radius: ${options.articleRadius || '0'};
  background: ${options.articleBg};
}

.wechat-export-title {
  color: ${options.titleColor};
  font-family: ${options.titleFont || options.bodyFont || 'var(--body-font, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)'};
  font-size: ${options.titleSize || '20px'};
  font-weight: ${options.titleWeight || '700'};
  line-height: 1.45;
  letter-spacing: ${options.titleSpacing || '0'};
  text-transform: ${options.titleTransform || 'none'};
}

.wechat-export-content {
  color: ${options.bodyColor};
  font-family: ${options.bodyFont || 'var(--body-font, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)'};
  font-size: 16px;
  line-height: 1.82;
}

.wechat-export-content h2 {
  ${options.h2Css || `padding-left: 0.82em; border-left: 4px solid ${options.accent}; color: ${options.titleColor};`}
}

.wechat-export-content h3 {
  ${options.h3Css || `color: ${options.accent};`}
}

.wechat-export-content a,
.wechat-export-content strong {
  color: ${options.accent};
}

.wechat-export-content blockquote {
  ${options.quoteCss || `padding: 0.9em 1em; border-left-color: ${options.accent}; border-radius: 8px; background: ${options.accentSoft}; color: ${options.muted};`}
}

.wechat-export-content code {
  ${options.codeCss || `color: ${options.accent}; background: ${options.accentSoft};`}
}

.wechat-export-content pre {
  ${options.preCss || `border-color: ${options.border}; background: ${options.accentSoft};`}
}

.wechat-export-content table th {
  background: ${options.accentSoft};
  color: ${options.titleColor};
  border-color: ${options.border};
}

.wechat-export-content table td {
  border-color: ${options.border};
}

${options.tableCss || ''}

.wechat-export-content hr {
  background: linear-gradient(to right, transparent, ${options.border}, transparent);
}

.wechat-export-content img {
  ${options.imageCss || 'border-radius: 8px;'}
}

${options.extraCss || ''}
`)
}

export const WECHAT_EXPORT_BUILTIN_THEMES: WechatExportTheme[] = [
  {
    id: DEFAULT_THEME_ID,
    name: '默认正文',
    description: '沿用当前博客正文排版，适合日常快速复制。',
    swatches: ['#f5f4ed', '#141413', '#c96442', '#faf9f5'],
    builtin: true,
    css: '',
  },
  brandTheme({
    id: 'qiaomu-podcast',
    name: '木羽播客',
    description: '白底中文长文阅读排版，大行高、大段距和轻字距，适合播客逐字稿与深度解读。',
    swatches: ['#ffffff', '#1a1a1a', '#576b95', '#f6f6f6'],
    css: buildEditorialCss({
      rootBg: '#ffffff',
      articleBg: '#ffffff',
      titleColor: '#111111',
      bodyColor: '#1a1a1a',
      accent: '#576b95',
      accentSoft: '#f6f6f6',
      border: '#e8e8e8',
      muted: '#555555',
      bodyFont: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
      titleSize: '22px',
      titleWeight: '600',
      titleSpacing: '0.02em',
      articlePadding: '20px 8px 32px',
      articleRadius: '0',
      h2Css: 'text-align: left; margin: 2.5em 0 1.2em; color: #111111; font-size: 20px; font-weight: 600; line-height: 1.5;',
      h3Css: 'margin: 2.2em 0 1.2em; color: #111111; font-size: 18px; font-weight: 600; line-height: 1.55;',
      quoteCss: 'padding: 0.85em 0 0.85em 1em; border-left-color: #dddddd; background: transparent; color: #555555;',
      imageCss: 'display: block; width: 100%; border-radius: 8px; margin: 1.5em 0;',
      extraCss: `
.wechat-export-article {
  max-width: 680px;
  margin: 0 auto;
}

.wechat-export-content {
  font-size: 17px;
  font-weight: 400;
  line-height: 1.9;
  letter-spacing: 0.04em;
  color: #1a1a1a;
  text-align: left;
}

.wechat-export-content > p {
  margin: 0;
  padding: 0;
  color: #1a1a1a;
  font-size: 17px;
  font-weight: 400;
  line-height: 1.9;
  letter-spacing: 0.04em;
  text-align: left;
}

.wechat-export-content > p + p {
  margin-top: 1.6em;
}

.wechat-export-content > p[data-wechat-empty="true"] {
  margin: 1.1em 0 0;
  line-height: 1;
  letter-spacing: 0;
}

.wechat-export-content strong {
  color: #111111;
  font-weight: 600;
}

.wechat-export-content a {
  color: #576b95;
  word-break: break-all;
}
`,
    }),
  }),
  brandTheme({
    id: 'qiaomu-clean-reading',
    name: '木羽简阅',
    description: '深青工程简报风：冷白纸面、通栏发线标题、浅青高亮重点和浅色纸面代码块。',
    swatches: ['#fbfdfe', '#25343f', '#0f7285', '#dff0f4'],
    css: buildEditorialCss({
      rootBg: '#fbfdfe',
      articleBg: '#fbfdfe',
      titleColor: '#142530',
      bodyColor: '#25343f',
      accent: '#0f7285',
      accentSoft: '#dff0f4',
      border: '#c3d9e0',
      muted: '#6b7f8c',
      bodyFont: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
      titleSize: '22px',
      titleWeight: '600',
      titleSpacing: '0',
      articlePadding: '18px 8px 32px',
      articleRadius: '0',
      h2Css: 'text-align: left; margin: 2.3em 0 1.1em; padding-bottom: 10px; border: 0; border-bottom: 1px solid #c3d9e0; color: #142530; font-size: 20px; font-weight: 600; line-height: 1.3; letter-spacing: 0;',
      h3Css: 'text-align: left; margin: 1.8em 0 0.7em; color: #0f7285; font-size: 16px; font-weight: 600; line-height: 1.5; letter-spacing: 0.02em;',
      quoteCss: 'margin: 1.4em 0; padding: 14px 2px; border: 0; border-top: 1px solid #c3d9e0; border-bottom: 1px solid #c3d9e0; border-radius: 0; background: transparent; color: #4d6472;',
      codeCss: 'color: #0b5b6b; background: #f2f8fa; border: 1px solid #e2edf1;',
      preCss: 'border-color: #d3e2e8; background: #f2f8fa;',
      imageCss: 'display: block; width: 100%; margin: 1.4em auto; border-radius: 8px;',
      extraCss: `
.wechat-export-article {
  max-width: 680px;
  margin: 0 auto;
}

.wechat-export-title {
  margin-bottom: 1.2em;
  color: #142530;
}

.wechat-export-content {
  color: #25343f;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.8;
  letter-spacing: 0;
  text-align: left;
}

.wechat-export-content > p {
  margin: 0 0 1.15em;
  padding: 0;
  color: #25343f;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.8;
  letter-spacing: 0;
  text-align: left;
}

.wechat-export-content > p[data-wechat-empty="true"] {
  margin: 0.8em 0 0;
  line-height: 1;
}

.wechat-export-content strong {
  padding: 0 4px;
  border-radius: 3px;
  background: #dff0f4;
  color: #0b5b6b;
  font-weight: 600;
}

.wechat-export-content a {
  color: #0f7285;
  text-decoration: underline;
  text-underline-offset: 3px;
  word-break: break-all;
  overflow-wrap: anywhere;
}

.wechat-export-content .wechat-list-marker {
  color: #0f7285;
}

.wechat-export-content figcaption,
.wechat-export-content .wechat-figure-caption {
  color: #6b7f8c;
  font-size: 13px;
  line-height: 1.6;
  letter-spacing: 0;
}

.wechat-export-content hr {
  height: 1px;
  margin: 2em 0;
  background: #c3d9e0;
  opacity: 1;
}

/* 浅色工程纸面代码块：以更高特异性 + !important 仅在本主题内覆盖全局深色 compat 层，
   mac 三色点结构与 .wechat-code-row / .wechat-code-line 的换行布局完全保留。 */
.wechat-export-root .wechat-export-article .wechat-export-content pre.code__pre,
.wechat-export-root .wechat-export-article .wechat-export-content .hljs.code__pre,
.wechat-export-root .wechat-export-article .wechat-export-content pre {
  border-color: #d3e2e8 !important;
  background: #f2f8fa !important;
}

.wechat-export-root .wechat-export-article .wechat-export-content pre.code__pre > .mac-sign,
.wechat-export-root .wechat-export-article .wechat-export-content .hljs.code__pre > .mac-sign,
.wechat-export-root .wechat-export-article .wechat-export-content pre > .mac-sign {
  background: #e2edf1 !important;
}

.wechat-export-root .wechat-export-article .wechat-export-content pre.code__pre > code,
.wechat-export-root .wechat-export-article .wechat-export-content .hljs.code__pre > code,
.wechat-export-root .wechat-export-article .wechat-export-content pre > code {
  color: #2a3b46 !important;
  border: 0;
}

.wechat-export-root .wechat-export-article .wechat-export-content .wechat-code-lines {
  color: #2a3b46;
}

.wechat-export-root .wechat-export-article .wechat-export-content .wechat-code-line-number {
  color: #9db4bd;
}

/* 图注居中：压过 compat 层的 text-align / text-align-last: left !important 与 color: inherit；
   单行图注的对齐由 text-align-last 决定，缺了它会退回左对齐 */
.wechat-export-root .wechat-export-article .wechat-export-content figcaption {
  color: #6b7f8c !important;
  text-align: center !important;
  text-align-last: center !important;
}
`,
    }),
  }),
  brandTheme({
    id: 'wechat-native',
    name: '微信原生',
    description: '白底、绿色强调，接近公众号后台默认阅读习惯。',
    swatches: ['#ffffff', '#333333', '#07c160', '#f0f7f2'],
    css: buildEditorialCss({
      rootBg: '#ffffff',
      articleBg: '#ffffff',
      titleColor: '#111111',
      bodyColor: '#333333',
      accent: '#07c160',
      accentSoft: '#f0f7f2',
      border: '#d8e8dc',
      muted: '#4b5a50',
      h2Css: 'padding-left: 0.8em; border-left: 4px solid #07c160; color: #111111;',
    }),
  }),
  brandTheme({
    id: 'apple-gallery',
    name: 'Apple Gallery',
    description: 'Apple 式留白、SF 字体、蓝色链接和克制圆角，适合产品发布与摄影长文。',
    swatches: ['#ffffff', '#1d1d1f', '#0066cc', '#f5f5f7'],
    css: buildEditorialCss({
      rootBg: '#f5f5f7',
      articleBg: '#ffffff',
      titleColor: '#1d1d1f',
      bodyColor: '#1d1d1f',
      accent: '#0066cc',
      accentSoft: '#f5f5f7',
      border: '#e0e0e0',
      muted: '#515154',
      titleFont: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
      bodyFont: '"SF Pro Text", -apple-system, BlinkMacSystemFont, sans-serif',
      titleSize: '22px',
      titleWeight: '650',
      articlePadding: '18px 16px 30px',
      articleRadius: '18px',
      h2Css: 'margin-top: 2.4em; padding-top: 0.7em; border-top: 1px solid #d2d2d7; color: #1d1d1f;',
      h3Css: 'color: #515154; font-weight: 650;',
      quoteCss: 'padding: 0.2em 0 0.2em 1em; border-left-color: #0066cc; background: transparent; color: #515154;',
      imageCss: 'border-radius: 18px;',
    }),
  }),
  brandTheme({
    id: 'claude-warm',
    name: 'Claude Warm',
    description: 'Anthropic/Claude 的暖色编辑感，奶油底、陶土强调和柔和引用块。',
    swatches: ['#faf9f5', '#141413', '#cc785c', '#efe9de'],
    css: buildEditorialCss({
      rootBg: '#faf9f5',
      articleBg: '#faf9f5',
      titleColor: '#141413',
      bodyColor: '#3d3d3a',
      accent: '#cc785c',
      accentSoft: '#f5f0e8',
      border: '#e6dfd8',
      muted: '#6c6a64',
      titleFont: 'Copernicus, "Tiempos Headline", Georgia, serif',
      bodyFont: 'StyreneB, -apple-system, BlinkMacSystemFont, sans-serif',
      titleWeight: '400',
      titleSize: '22px',
      h2Css: 'color: #cc785c; font-family: Copernicus, Georgia, serif; font-weight: 400;',
      quoteCss: 'padding: 1em 1.1em; border-left-color: #cc785c; border-radius: 10px; background: #efe9de; color: #56514a;',
      imageCss: 'border-radius: 12px;',
    }),
  }),
  brandTheme({
    id: 'vercel-mono',
    name: 'Vercel Mono',
    description: 'Vercel 式黑白精度、Geist 字体和 shadow-as-border，适合技术发布。',
    swatches: ['#ffffff', '#171717', '#0a72ef', '#ebebeb'],
    css: buildEditorialCss({
      rootBg: '#ffffff',
      articleBg: '#ffffff',
      titleColor: '#171717',
      bodyColor: '#171717',
      accent: '#0a72ef',
      accentSoft: '#fafafa',
      border: '#ebebeb',
      muted: '#4d4d4d',
      titleFont: 'Geist, Arial, sans-serif',
      bodyFont: 'Geist, Arial, sans-serif',
      titleSize: '21px',
      titleWeight: '650',
      h2Css: 'padding: 0.65em 0; border-top: 1px solid #ebebeb; border-bottom: 1px solid #ebebeb; color: #171717;',
      h3Css: 'color: #171717; font-family: "Geist Mono", ui-monospace, monospace; font-size: 0.98em;',
      quoteCss: 'padding: 1em; border-left: 0; border-radius: 10px; background: #fafafa; color: #4d4d4d; box-shadow: 0 0 0 1px rgba(0,0,0,0.08);',
      preCss: 'border-color: #ebebeb; background: #fafafa; box-shadow: 0 0 0 1px rgba(0,0,0,0.08);',
      imageCss: 'border-radius: 10px; box-shadow: 0 0 0 1px rgba(0,0,0,0.08);',
    }),
  }),
  brandTheme({
    id: 'linear-night',
    name: 'Linear Night',
    description: 'Linear 的近黑产品画布、薰衣草蓝强调和精密工程感。',
    swatches: ['#010102', '#f7f8f8', '#5e6ad2', '#141516'],
    css: buildEditorialCss({
      rootBg: '#010102',
      articleBg: '#0f1011',
      titleColor: '#f7f8f8',
      bodyColor: '#d0d6e0',
      accent: '#828fff',
      accentSoft: '#18191a',
      border: '#34343a',
      muted: '#a8afbb',
      titleFont: '"Linear Display", -apple-system, BlinkMacSystemFont, sans-serif',
      bodyFont: '"Linear Text", -apple-system, BlinkMacSystemFont, sans-serif',
      articlePadding: '18px 16px 30px',
      articleRadius: '14px',
      h2Css: 'padding-bottom: 0.5em; border-bottom: 1px solid #34343a; color: #f7f8f8;',
      quoteCss: 'padding: 1em; border-left-color: #5e6ad2; border-radius: 8px; background: #141516; color: #d0d6e0;',
      imageCss: 'border-radius: 12px; border: 1px solid #23252a;',
    }),
  }),
  brandTheme({
    id: 'notion-workspace',
    name: 'Notion Workspace',
    description: 'Notion 的白底工作区、暖灰线条和多彩数据库标签感。',
    swatches: ['#ffffff', '#37352f', '#5645d4', '#f6f5f4', '#f9e79f'],
    css: buildEditorialCss({
      rootBg: '#ffffff',
      articleBg: '#ffffff',
      titleColor: '#1a1a1a',
      bodyColor: '#37352f',
      accent: '#5645d4',
      accentSoft: '#f6f5f4',
      border: '#e5e3df',
      muted: '#5d5b54',
      titleFont: '"Notion Sans", -apple-system, BlinkMacSystemFont, sans-serif',
      bodyFont: '"Notion Sans", -apple-system, BlinkMacSystemFont, sans-serif',
      articlePadding: '0 14px',
      h2Css: 'padding: 0.55em 0.75em; border-radius: 10px; background: #f9e79f; color: #1a1a1a;',
      h3Css: 'display: inline-block; padding: 0.18em 0.55em; border-radius: 6px; background: #e6e0f5; color: #391c57;',
      quoteCss: 'padding: 0.9em 1em; border-left-color: #5645d4; border-radius: 10px; background: #f6f5f4; color: #5d5b54;',
      imageCss: 'border-radius: 10px;',
    }),
  }),
  brandTheme({
    id: 'stripe-ledger',
    name: 'Stripe Ledger',
    description: 'Stripe 的金融级蓝紫、轻字重和冷调多层阴影感。',
    swatches: ['#ffffff', '#061b31', '#533afd', '#00d4ff'],
    css: buildEditorialCss({
      rootBg: '#f6f9fc',
      articleBg: '#ffffff',
      titleColor: '#061b31',
      bodyColor: '#243b53',
      accent: '#533afd',
      accentSoft: '#eef2ff',
      border: '#d9e2ef',
      muted: '#52687a',
      titleFont: 'sohne-var, -apple-system, BlinkMacSystemFont, sans-serif',
      bodyFont: 'sohne-var, -apple-system, BlinkMacSystemFont, sans-serif',
      titleWeight: '350',
      titleSize: '23px',
      articlePadding: '20px 16px 32px',
      articleRadius: '16px',
      h2Css: 'color: #061b31; font-weight: 450; border-bottom: 2px solid #533afd; padding-bottom: 0.35em;',
      h3Css: 'color: #533afd; font-weight: 500;',
      quoteCss: 'padding: 1em 1.1em; border-left-color: #533afd; border-radius: 12px; background: #eef2ff; color: #425466;',
      imageCss: 'border-radius: 14px; box-shadow: 0 12px 32px rgba(50,50,93,0.16);',
    }),
  }),
  brandTheme({
    id: 'airbnb-rausch',
    name: 'Airbnb Rausch',
    description: 'Airbnb 的白底、珊瑚红和人情味圆角，适合旅行和生活方式内容。',
    swatches: ['#ffffff', '#222222', '#ff385c', '#fff1f3'],
    css: buildEditorialCss({
      rootBg: '#ffffff',
      articleBg: '#ffffff',
      titleColor: '#222222',
      bodyColor: '#222222',
      accent: '#ff385c',
      accentSoft: '#fff1f3',
      border: '#dddddd',
      muted: '#5f5f5f',
      bodyFont: '"Airbnb Cereal VF", Circular, -apple-system, BlinkMacSystemFont, sans-serif',
      titleWeight: '600',
      h2Css: 'display: inline-block; padding: 0.28em 0.78em; border-radius: 999px; background: #fff1f3; color: #ff385c;',
      quoteCss: 'padding: 1em; border-left: 0; border-radius: 18px; background: #fff1f3; color: #5f5f5f;',
      imageCss: 'border-radius: 18px;',
    }),
  }),
  brandTheme({
    id: 'spotify-sessions',
    name: 'Spotify Sessions',
    description: 'Spotify 的暗色舞台、强绿色和粗体节奏，适合访谈与音乐文化。',
    swatches: ['#121212', '#ffffff', '#1db954', '#191414'],
    css: buildEditorialCss({
      rootBg: '#121212',
      articleBg: '#191414',
      titleColor: '#ffffff',
      bodyColor: '#e7e7e7',
      accent: '#1db954',
      accentSoft: '#102a1a',
      border: '#2a2a2a',
      muted: '#b3b3b3',
      titleFont: 'Circular, -apple-system, BlinkMacSystemFont, sans-serif',
      bodyFont: 'Circular, -apple-system, BlinkMacSystemFont, sans-serif',
      titleWeight: '800',
      titleSize: '23px',
      articlePadding: '20px 16px 34px',
      articleRadius: '18px',
      h2Css: 'color: #1db954; font-weight: 800;',
      h3Css: 'color: #ffffff; border-left: 4px solid #1db954; padding-left: 0.7em;',
      quoteCss: 'padding: 1em; border-left-color: #1db954; border-radius: 14px; background: #102a1a; color: #e7e7e7;',
      imageCss: 'border-radius: 16px;',
    }),
  }),
  brandTheme({
    id: 'wired-broadsheet',
    name: 'WIRED Broadsheet',
    description: 'WIRED 式纸白密排、杂志标题和墨蓝链接，适合评论与深度报道。',
    swatches: ['#fffdf8', '#111111', '#0057b8', '#e8e0d4'],
    css: buildEditorialCss({
      rootBg: '#fffdf8',
      articleBg: '#fffdf8',
      titleColor: '#111111',
      bodyColor: '#24201c',
      accent: '#0057b8',
      accentSoft: '#f3eee6',
      border: '#d8cfc2',
      muted: '#5c5348',
      titleFont: 'Newsreader, Georgia, "Times New Roman", serif',
      bodyFont: 'Georgia, "Times New Roman", serif',
      titleWeight: '700',
      titleSize: '24px',
      h2Css: 'font-family: Newsreader, Georgia, serif; font-weight: 700; border-top: 3px solid #111111; padding-top: 0.45em; color: #111111;',
      h3Css: 'font-family: ui-monospace, SFMono-Regular, monospace; color: #0057b8; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.92em;',
      quoteCss: 'padding: 0.1em 0 0.1em 1em; border-left-color: #111111; background: transparent; color: #5c5348;',
      imageCss: 'border-radius: 2px;',
    }),
  }),
  brandTheme({
    id: 'verge-signal',
    name: 'The Verge Signal',
    description: 'The Verge 的暗色媒体感、酸性薄荷和高对比章节，适合科技观点。',
    swatches: ['#131313', '#f5f5f5', '#d7ff4f', '#ff3bd4'],
    css: buildEditorialCss({
      rootBg: '#131313',
      articleBg: '#1b1b1b',
      titleColor: '#f5f5f5',
      bodyColor: '#e7e7e7',
      accent: '#d7ff4f',
      accentSoft: '#252a18',
      border: '#3a3a3a',
      muted: '#c8c8c8',
      titleFont: 'Manuka, "Arial Black", Impact, sans-serif',
      bodyFont: 'PolySans, -apple-system, BlinkMacSystemFont, sans-serif',
      titleWeight: '900',
      titleSize: '25px',
      titleTransform: 'uppercase',
      titleSpacing: '0.02em',
      articlePadding: '20px 16px 34px',
      h2Css: 'padding: 0.32em 0.45em; background: #d7ff4f; color: #131313; text-transform: uppercase;',
      h3Css: 'color: #ff3bd4; text-transform: uppercase;',
      quoteCss: 'padding: 1em; border-left-color: #d7ff4f; background: #252a18; color: #f5f5f5;',
      imageCss: 'border-radius: 0;',
    }),
  }),
  brandTheme({
    id: 'figma-canvas',
    name: 'Figma Canvas',
    description: 'Figma 的多彩协作感，白底、彩色标签和设计画布式分区。',
    swatches: ['#ffffff', '#1e1e1e', '#0acf83', '#a259ff', '#ff7262'],
    css: buildEditorialCss({
      rootBg: '#ffffff',
      articleBg: '#ffffff',
      titleColor: '#1e1e1e',
      bodyColor: '#2c2c2c',
      accent: '#0acf83',
      accentSoft: '#f2fbf7',
      border: '#e6e6e6',
      muted: '#5f6368',
      titleFont: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      bodyFont: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      h2Css: 'padding-left: 0.75em; border-left: 5px solid #a259ff; color: #1e1e1e;',
      h3Css: 'display: inline-block; padding: 0.18em 0.55em; border-radius: 999px; background: #e9f8ff; color: #1abcfe;',
      quoteCss: 'padding: 1em; border-left-color: #ff7262; border-radius: 10px; background: #fff2ef; color: #4a4a4a;',
      imageCss: 'border-radius: 12px; border: 1px solid #e6e6e6;',
    }),
  }),
  brandTheme({
    id: 'supabase-terminal',
    name: 'Supabase Terminal',
    description: 'Supabase 的深色文档、翡翠绿和代码优先气质。',
    swatches: ['#0f1512', '#e5efe9', '#3ecf8e', '#1c2420'],
    css: buildEditorialCss({
      rootBg: '#0f1512',
      articleBg: '#151d19',
      titleColor: '#e5efe9',
      bodyColor: '#c9d8d0',
      accent: '#3ecf8e',
      accentSoft: '#1c2b23',
      border: '#2b3a33',
      muted: '#9fb0a8',
      bodyFont: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      titleFont: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      articlePadding: '18px 16px 32px',
      articleRadius: '12px',
      h2Css: 'color: #e5efe9; border-bottom: 1px solid #2b3a33; padding-bottom: 0.45em;',
      h3Css: 'font-family: ui-monospace, SFMono-Regular, monospace; color: #3ecf8e;',
      quoteCss: 'padding: 1em; border-left-color: #3ecf8e; border-radius: 8px; background: #1c2b23; color: #c9d8d0;',
      imageCss: 'border-radius: 10px; border: 1px solid #2b3a33;',
    }),
  }),
  brandTheme({
    id: 'raycast-command',
    name: 'Raycast Command',
    description: 'Raycast 的深色命令面板、红色高亮和键盘优先的紧凑节奏。',
    swatches: ['#151517', '#f4f4f5', '#ff6363', '#2a2a2d'],
    css: buildEditorialCss({
      rootBg: '#151517',
      articleBg: '#202024',
      titleColor: '#f4f4f5',
      bodyColor: '#dadade',
      accent: '#ff6363',
      accentSoft: '#2a2020',
      border: '#333338',
      muted: '#b4b4bb',
      bodyFont: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      articlePadding: '18px 16px 32px',
      articleRadius: '16px',
      h2Css: 'padding: 0.45em 0.65em; border-radius: 10px; background: #2a2a2d; color: #f4f4f5; box-shadow: inset 0 0 0 1px #333338;',
      h3Css: 'color: #ff6363;',
      quoteCss: 'padding: 1em; border-left-color: #ff6363; border-radius: 10px; background: #2a2020; color: #dadade;',
      imageCss: 'border-radius: 14px;',
    }),
  }),
  brandTheme({
    id: 'runway-cinema',
    name: 'Runway Cinema',
    description: 'RunwayML 的暗色影像感、细线框和电影字幕式排版。',
    swatches: ['#0b0b0c', '#f2f2f0', '#b8ff5c', '#242426'],
    css: buildEditorialCss({
      rootBg: '#0b0b0c',
      articleBg: '#111113',
      titleColor: '#f2f2f0',
      bodyColor: '#d9d9d6',
      accent: '#b8ff5c',
      accentSoft: '#202418',
      border: '#323236',
      muted: '#a9a9a6',
      titleFont: 'ABC Diatype, -apple-system, BlinkMacSystemFont, sans-serif',
      bodyFont: 'ABC Diatype, -apple-system, BlinkMacSystemFont, sans-serif',
      articlePadding: '20px 16px 36px',
      articleRadius: '4px',
      h2Css: 'color: #f2f2f0; border: 1px solid #323236; padding: 0.45em 0.65em; letter-spacing: 0.04em;',
      h3Css: 'color: #b8ff5c; font-family: ui-monospace, SFMono-Regular, monospace;',
      quoteCss: 'padding: 1em; border-left-color: #b8ff5c; background: #202418; color: #d9d9d6;',
      imageCss: 'border-radius: 4px;',
    }),
  }),
  brandTheme({
    id: 'mastercard-orbit',
    name: 'Mastercard Orbit',
    description: 'Mastercard 的暖奶油画布、红橙轨道色和金融编辑温度。',
    swatches: ['#fff7ec', '#241c15', '#eb001b', '#ff5f00', '#f79e1b'],
    css: buildEditorialCss({
      rootBg: '#fff7ec',
      articleBg: '#fffaf2',
      titleColor: '#241c15',
      bodyColor: '#3b3028',
      accent: '#ff5f00',
      accentSoft: '#ffe7cc',
      border: '#edd9c2',
      muted: '#6d5b4b',
      titleFont: 'MarkForMC, -apple-system, BlinkMacSystemFont, sans-serif',
      bodyFont: 'MarkForMC, -apple-system, BlinkMacSystemFont, sans-serif',
      articlePadding: '20px 16px 32px',
      articleRadius: '20px',
      h2Css: 'position: relative; color: #241c15; padding-left: 0.9em; border-left: 6px solid #eb001b;',
      h3Css: 'color: #ff5f00;',
      quoteCss: 'padding: 1em; border-left-color: #f79e1b; border-radius: 16px; background: #ffe7cc; color: #6d5b4b;',
      imageCss: 'border-radius: 18px;',
    }),
  }),
  brandTheme({
    id: 'tesla-minimal',
    name: 'Tesla Minimal',
    description: 'Tesla 的极简工程感、低圆角和冷蓝 CTA，适合发布说明。',
    swatches: ['#f4f4f4', '#171a20', '#3e6ae1', '#e8e8e8'],
    css: buildEditorialCss({
      rootBg: '#f4f4f4',
      articleBg: '#ffffff',
      titleColor: '#171a20',
      bodyColor: '#393c41',
      accent: '#3e6ae1',
      accentSoft: '#eef3ff',
      border: '#d8d9da',
      muted: '#5c5e62',
      titleFont: '"Universal Sans Display", -apple-system, BlinkMacSystemFont, sans-serif',
      bodyFont: '"Universal Sans Text", -apple-system, BlinkMacSystemFont, sans-serif',
      titleWeight: '500',
      titleSize: '20px',
      articlePadding: '18px 16px 30px',
      articleRadius: '4px',
      h2Css: 'color: #171a20; border-bottom: 1px solid #d8d9da; padding-bottom: 0.4em;',
      h3Css: 'color: #3e6ae1;',
      quoteCss: 'padding: 0.85em 1em; border-left-color: #3e6ae1; border-radius: 4px; background: #eef3ff; color: #393c41;',
      imageCss: 'border-radius: 4px;',
    }),
  }),
  brandTheme({
    id: 'ferrari-corse',
    name: 'Ferrari Corse',
    description: 'Ferrari 的电影黑、Rosso Corsa 红和高端跑车编辑感。',
    swatches: ['#181818', '#ffffff', '#da291c', '#303030'],
    css: buildEditorialCss({
      rootBg: '#181818',
      articleBg: '#202020',
      titleColor: '#ffffff',
      bodyColor: '#d8d8d8',
      accent: '#da291c',
      accentSoft: '#321f1d',
      border: '#3a3a3a',
      muted: '#b8b8b8',
      titleFont: 'FerrariSans, -apple-system, BlinkMacSystemFont, sans-serif',
      bodyFont: 'FerrariSans, -apple-system, BlinkMacSystemFont, sans-serif',
      titleWeight: '500',
      titleTransform: 'uppercase',
      titleSpacing: '0.04em',
      articlePadding: '22px 16px 36px',
      h2Css: 'color: #ffffff; padding-left: 0.8em; border-left: 4px solid #da291c; text-transform: uppercase;',
      h3Css: 'color: #da291c; text-transform: uppercase;',
      quoteCss: 'padding: 1em; border-left-color: #da291c; background: #321f1d; color: #ffffff;',
      imageCss: 'border-radius: 2px;',
    }),
  }),
  brandTheme({
    id: 'lambo-night',
    name: 'Lambo Night',
    description: 'Lamborghini 的黑金舞台、方形按钮感和强烈大写标题。',
    swatches: ['#050505', '#ffffff', '#ffc000', '#202020'],
    css: buildEditorialCss({
      rootBg: '#050505',
      articleBg: '#101010',
      titleColor: '#ffffff',
      bodyColor: '#f2f2f2',
      accent: '#ffc000',
      accentSoft: '#241e08',
      border: '#313131',
      muted: '#c7c7c7',
      titleFont: 'LamboType, Roboto, Arial, sans-serif',
      bodyFont: 'LamboType, Roboto, Arial, sans-serif',
      titleTransform: 'uppercase',
      titleWeight: '500',
      titleSpacing: '0.06em',
      articlePadding: '22px 16px 36px',
      articleRadius: '0',
      h2Css: 'color: #ffc000; text-transform: uppercase; border: 1px solid #ffc000; padding: 0.42em 0.65em;',
      h3Css: 'color: #ffffff; text-transform: uppercase;',
      quoteCss: 'padding: 1em; border-left-color: #ffc000; background: #202020; color: #f2f2f2;',
      imageCss: 'border-radius: 0;',
    }),
  }),
  brandTheme({
    id: 'nvidia-compute',
    name: 'NVIDIA Compute',
    description: 'NVIDIA 的黑白绿工程系统、2px 圆角和高密度技术表格。',
    swatches: ['#ffffff', '#000000', '#76b900', '#f7f7f7'],
    css: buildEditorialCss({
      rootBg: '#ffffff',
      articleBg: '#ffffff',
      titleColor: '#1a1a1a',
      bodyColor: '#1a1a1a',
      accent: '#76b900',
      accentSoft: '#eef8df',
      border: '#cccccc',
      muted: '#5e5e5e',
      titleFont: 'NVIDIA-EMEA, Arial, sans-serif',
      bodyFont: 'NVIDIA-EMEA, Arial, sans-serif',
      titleWeight: '700',
      articleRadius: '2px',
      h2Css: 'padding: 0.5em 0.65em; background: #1a1a1a; color: #ffffff; border-left: 6px solid #76b900;',
      h3Css: 'color: #3f8500; font-weight: 700;',
      quoteCss: 'padding: 0.9em 1em; border-left-color: #76b900; border-radius: 2px; background: #eef8df; color: #1a1a1a;',
      imageCss: 'border-radius: 2px;',
    }),
  }),
  brandTheme({
    id: 'ibm-carbon',
    name: 'IBM Carbon',
    description: 'IBM Carbon 风格，方正网格、Plex Sans 轻字重和纯蓝强调。',
    swatches: ['#ffffff', '#161616', '#0f62fe', '#f4f4f4'],
    css: buildEditorialCss({
      rootBg: '#ffffff',
      articleBg: '#ffffff',
      titleColor: '#161616',
      bodyColor: '#262626',
      accent: '#0f62fe',
      accentSoft: '#edf5ff',
      border: '#e0e0e0',
      muted: '#525252',
      titleFont: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif',
      bodyFont: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif',
      titleWeight: '300',
      titleSize: '23px',
      articleRadius: '0',
      h2Css: 'padding: 0.55em 0; border-top: 1px solid #161616; border-bottom: 1px solid #e0e0e0; color: #161616; font-weight: 300;',
      h3Css: 'color: #0f62fe; font-weight: 400;',
      quoteCss: 'padding: 1em; border-left-color: #0f62fe; border-radius: 0; background: #f4f4f4; color: #525252;',
      imageCss: 'border-radius: 0;',
    }),
  }),
  brandTheme({
    id: 'shopify-night',
    name: 'Shopify Night',
    description: 'Shopify 的暗色商业叙事、明亮绿色和高端电商杂志感。',
    swatches: ['#0b0f0c', '#f6fff8', '#95bf47', '#142017'],
    css: buildEditorialCss({
      rootBg: '#0b0f0c',
      articleBg: '#121914',
      titleColor: '#f6fff8',
      bodyColor: '#dce9df',
      accent: '#95bf47',
      accentSoft: '#1f2c1a',
      border: '#2f3c30',
      muted: '#b6c3b9',
      titleFont: 'ShopifySans, -apple-system, BlinkMacSystemFont, sans-serif',
      bodyFont: 'ShopifySans, -apple-system, BlinkMacSystemFont, sans-serif',
      titleWeight: '300',
      titleSize: '23px',
      articlePadding: '22px 16px 36px',
      articleRadius: '18px',
      h2Css: 'color: #95bf47; font-weight: 400;',
      h3Css: 'color: #f6fff8; padding-left: 0.75em; border-left: 3px solid #95bf47;',
      quoteCss: 'padding: 1em; border-left-color: #95bf47; border-radius: 14px; background: #1f2c1a; color: #dce9df;',
      imageCss: 'border-radius: 16px;',
    }),
  }),
  brandTheme({
    id: 'pinterest-masonry',
    name: 'Pinterest Masonry',
    description: 'Pinterest 的图片优先、红色保存感和柔和瀑布流圆角。',
    swatches: ['#ffffff', '#111111', '#e60023', '#f7f7f7'],
    css: buildEditorialCss({
      rootBg: '#ffffff',
      articleBg: '#ffffff',
      titleColor: '#111111',
      bodyColor: '#333333',
      accent: '#e60023',
      accentSoft: '#fff0f2',
      border: '#e9e9e9',
      muted: '#5f5f5f',
      titleFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      bodyFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      h2Css: 'display: inline-block; padding: 0.3em 0.8em; border-radius: 999px; background: #e60023; color: #ffffff;',
      h3Css: 'color: #111111; border-left: 4px solid #e60023; padding-left: 0.65em;',
      quoteCss: 'padding: 1em; border-left: 0; border-radius: 18px; background: #fff0f2; color: #5f5f5f;',
      imageCss: 'border-radius: 20px;',
    }),
  }),
  brandTheme({
    id: 'starbucks-reserve',
    name: 'Starbucks Reserve',
    description: 'Starbucks Reserve 的深绿咖啡馆质感、暖金强调和柔和内容块。',
    swatches: ['#f7f3e8', '#1e3932', '#cba258', '#e6dfcf'],
    css: buildEditorialCss({
      rootBg: '#f7f3e8',
      articleBg: '#fffaf0',
      titleColor: '#1e3932',
      bodyColor: '#2d3f38',
      accent: '#006241',
      accentSoft: '#e8f1ec',
      border: '#dccfb9',
      muted: '#5c665f',
      titleFont: 'SoDoSans, -apple-system, BlinkMacSystemFont, sans-serif',
      bodyFont: 'SoDoSans, -apple-system, BlinkMacSystemFont, sans-serif',
      titleWeight: '600',
      articlePadding: '20px 16px 32px',
      articleRadius: '18px',
      h2Css: 'color: #1e3932; border-bottom: 2px solid #cba258; padding-bottom: 0.38em;',
      h3Css: 'color: #006241;',
      quoteCss: 'padding: 1em; border-left-color: #cba258; border-radius: 16px; background: #efe7d4; color: #4c574f;',
      imageCss: 'border-radius: 16px;',
    }),
  }),
  brandTheme({
    id: 'bugatti-atelier',
    name: 'Bugatti Atelier',
    description: 'Bugatti 的午夜蓝、银灰金属线和奢侈品工坊感。',
    swatches: ['#070b14', '#f4f6f8', '#4b6fba', '#c7ccd4'],
    css: buildEditorialCss({
      rootBg: '#070b14',
      articleBg: '#101622',
      titleColor: '#f4f6f8',
      bodyColor: '#d9dde5',
      accent: '#4b6fba',
      accentSoft: '#182235',
      border: '#303948',
      muted: '#b3bac7',
      titleFont: 'BugattiText, "Avenir Next", Arial, sans-serif',
      bodyFont: '"Avenir Next", -apple-system, BlinkMacSystemFont, sans-serif',
      titleWeight: '400',
      titleSpacing: '0.05em',
      articlePadding: '22px 16px 36px',
      articleRadius: '6px',
      h2Css: 'color: #f4f6f8; border-top: 1px solid #c7ccd4; padding-top: 0.55em; letter-spacing: 0.04em;',
      h3Css: 'color: #8ba7e8;',
      quoteCss: 'padding: 1em; border-left-color: #4b6fba; background: #182235; color: #d9dde5;',
      imageCss: 'border-radius: 6px; border: 1px solid #303948;',
    }),
  }),
  brandTheme({
    id: 'uber-movement',
    name: 'Uber Movement',
    description: 'Uber 的黑白移动系统、蓝色定位点和极低装饰密度。',
    swatches: ['#ffffff', '#000000', '#276ef1', '#f3f3f3'],
    css: buildEditorialCss({
      rootBg: '#ffffff',
      articleBg: '#ffffff',
      titleColor: '#000000',
      bodyColor: '#1f1f1f',
      accent: '#276ef1',
      accentSoft: '#eef4ff',
      border: '#e2e2e2',
      muted: '#545454',
      titleFont: 'UberMove, -apple-system, BlinkMacSystemFont, sans-serif',
      bodyFont: 'UberMoveText, -apple-system, BlinkMacSystemFont, sans-serif',
      titleWeight: '500',
      articleRadius: '0',
      h2Css: 'color: #000000; border-left: 5px solid #276ef1; padding-left: 0.75em;',
      h3Css: 'color: #000000; font-weight: 500;',
      quoteCss: 'padding: 1em; border-left-color: #276ef1; border-radius: 0; background: #f3f3f3; color: #545454;',
      imageCss: 'border-radius: 0;',
    }),
  }),
  brandTheme({
    id: 'webflow-studio',
    name: 'Webflow Studio',
    description: 'Webflow 的深色设计工作台、蓝色焦点和视觉编辑器边框。',
    swatches: ['#080808', '#ffffff', '#146ef5', '#1f1f23'],
    css: buildEditorialCss({
      rootBg: '#080808',
      articleBg: '#141417',
      titleColor: '#ffffff',
      bodyColor: '#e2e5ea',
      accent: '#146ef5',
      accentSoft: '#17233a',
      border: '#30323a',
      muted: '#aeb4c0',
      titleFont: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      bodyFont: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      articlePadding: '18px 16px 32px',
      articleRadius: '12px',
      h2Css: 'padding: 0.5em 0.7em; border: 1px solid #30323a; border-left: 5px solid #146ef5; color: #ffffff;',
      h3Css: 'color: #78a8ff;',
      quoteCss: 'padding: 1em; border-left-color: #146ef5; border-radius: 10px; background: #17233a; color: #e2e5ea;',
      imageCss: 'border-radius: 12px; border: 1px solid #30323a;',
    }),
  }),
  brandTheme({
    id: 'playstation-blue',
    name: 'PlayStation Blue',
    description: 'PlayStation 的深蓝舞台、荧光蓝层级和游戏发布节奏。',
    swatches: ['#000814', '#ffffff', '#0070cc', '#101a36'],
    css: buildEditorialCss({
      rootBg: '#000814',
      articleBg: '#081024',
      titleColor: '#ffffff',
      bodyColor: '#dce8ff',
      accent: '#0070cc',
      accentSoft: '#101a36',
      border: '#22365f',
      muted: '#b2c3df',
      titleFont: 'SST, Arial, sans-serif',
      bodyFont: 'SST, Arial, sans-serif',
      titleWeight: '600',
      articlePadding: '20px 16px 34px',
      articleRadius: '14px',
      h2Css: 'color: #ffffff; border-bottom: 2px solid #0070cc; padding-bottom: 0.4em;',
      h3Css: 'color: #66b7ff;',
      quoteCss: 'padding: 1em; border-left-color: #0070cc; border-radius: 12px; background: #101a36; color: #dce8ff;',
      imageCss: 'border-radius: 14px;',
    }),
  }),
  brandTheme({
    id: 'hashicorp-docs',
    name: 'HashiCorp Docs',
    description: 'HashiCorp 的文档站气质、紫黑命令块和基础设施手册风格。',
    swatches: ['#ffffff', '#1d1e20', '#844fba', '#f6f5f8'],
    css: buildEditorialCss({
      rootBg: '#ffffff',
      articleBg: '#ffffff',
      titleColor: '#1d1e20',
      bodyColor: '#2f3237',
      accent: '#844fba',
      accentSoft: '#f6f1fb',
      border: '#ded9e7',
      muted: '#5f6570',
      titleFont: '"Metro Sans", -apple-system, BlinkMacSystemFont, sans-serif',
      bodyFont: '"Metro Sans", -apple-system, BlinkMacSystemFont, sans-serif',
      h2Css: 'color: #1d1e20; border-left: 4px solid #844fba; padding-left: 0.75em;',
      h3Css: 'color: #844fba; font-family: ui-monospace, SFMono-Regular, monospace;',
      quoteCss: 'padding: 1em; border-left-color: #844fba; border-radius: 8px; background: #f6f5f8; color: #4b5058;',
      preCss: 'border-color: #ded9e7; background: #1d1e20;',
      codeCss: 'color: #844fba; background: #f6f1fb;',
      imageCss: 'border-radius: 8px; border: 1px solid #ded9e7;',
    }),
  }),
  brandTheme({
    id: 'coinbase-base',
    name: 'Coinbase Base',
    description: 'Coinbase 的干净金融蓝、白底和可信赖产品说明书感。',
    swatches: ['#ffffff', '#0a0b0d', '#0052ff', '#eef3ff'],
    css: buildEditorialCss({
      rootBg: '#ffffff',
      articleBg: '#ffffff',
      titleColor: '#0a0b0d',
      bodyColor: '#1f2937',
      accent: '#0052ff',
      accentSoft: '#eef3ff',
      border: '#dbe4f3',
      muted: '#536171',
      titleFont: 'CoinbaseDisplay, -apple-system, BlinkMacSystemFont, sans-serif',
      bodyFont: 'CoinbaseText, -apple-system, BlinkMacSystemFont, sans-serif',
      titleWeight: '500',
      h2Css: 'color: #0a0b0d; border-bottom: 2px solid #0052ff; padding-bottom: 0.35em;',
      h3Css: 'color: #0052ff;',
      quoteCss: 'padding: 1em; border-left-color: #0052ff; border-radius: 12px; background: #eef3ff; color: #344054;',
      imageCss: 'border-radius: 12px;',
    }),
  }),
  brandTheme({
    id: 'miro-board',
    name: 'Miro Board',
    description: 'Miro 的协作白板、多彩便签标题和轻快工作坊风格。',
    swatches: ['#fff8cc', '#050038', '#4262ff', '#ffdd33', '#ff6575'],
    css: buildEditorialCss({
      rootBg: '#fff8cc',
      articleBg: '#ffffff',
      titleColor: '#050038',
      bodyColor: '#1f1d3a',
      accent: '#4262ff',
      accentSoft: '#f1f4ff',
      border: '#e8e1ad',
      muted: '#5f5a7a',
      titleFont: 'Formular, -apple-system, BlinkMacSystemFont, sans-serif',
      bodyFont: 'Formular, -apple-system, BlinkMacSystemFont, sans-serif',
      articlePadding: '20px 16px 32px',
      articleRadius: '20px',
      h2Css: 'display: inline-block; padding: 0.35em 0.75em; border-radius: 8px; background: #ffdd33; color: #050038;',
      h3Css: 'display: inline-block; padding: 0.18em 0.55em; border-radius: 999px; background: #ffe5e9; color: #d8233f;',
      quoteCss: 'padding: 1em; border-left-color: #4262ff; border-radius: 14px; background: #f1f4ff; color: #4e4a68;',
      imageCss: 'border-radius: 16px; border: 1px solid #eee6b9;',
    }),
  }),
  brandTheme({
    id: 'mongodb-leaf',
    name: 'MongoDB Leaf',
    description: 'MongoDB 的森林绿、文档数据库卡片和开发者教程气质。',
    swatches: ['#f7fbf3', '#001e2b', '#00ed64', '#e3f6dc'],
    css: buildEditorialCss({
      rootBg: '#f7fbf3',
      articleBg: '#ffffff',
      titleColor: '#001e2b',
      bodyColor: '#17313d',
      accent: '#00a35c',
      accentSoft: '#e3f6dc',
      border: '#cfe3c7',
      muted: '#4f6670',
      titleFont: 'MongoDB Value Serif, Georgia, serif',
      bodyFont: '"MongoDB Value Sans", -apple-system, BlinkMacSystemFont, sans-serif',
      titleWeight: '500',
      articlePadding: '20px 16px 32px',
      articleRadius: '16px',
      h2Css: 'color: #001e2b; border-left: 5px solid #00ed64; padding-left: 0.75em;',
      h3Css: 'color: #00a35c;',
      quoteCss: 'padding: 1em; border-left-color: #00ed64; border-radius: 12px; background: #e3f6dc; color: #284552;',
      imageCss: 'border-radius: 14px;',
    }),
  }),
  brandTheme({
    id: 'airtable-grid',
    name: 'Airtable Grid',
    description: 'Airtable 的彩色数据表、清晰分区和运营工具感。',
    swatches: ['#ffffff', '#1f1f1f', '#18bfff', '#f82b60', '#fcb400'],
    css: buildEditorialCss({
      rootBg: '#f7f8fa',
      articleBg: '#ffffff',
      titleColor: '#1f1f1f',
      bodyColor: '#2c3440',
      accent: '#18bfff',
      accentSoft: '#eaf8ff',
      border: '#dfe3ea',
      muted: '#5b6472',
      titleFont: 'AirtableSans, -apple-system, BlinkMacSystemFont, sans-serif',
      bodyFont: 'AirtableSans, -apple-system, BlinkMacSystemFont, sans-serif',
      articlePadding: '18px 16px 30px',
      articleRadius: '12px',
      h2Css: 'padding: 0.45em 0.65em; border-radius: 8px; background: #eaf8ff; color: #0b5f84; border-left: 5px solid #18bfff;',
      h3Css: 'display: inline-block; padding: 0.18em 0.5em; border-radius: 6px; background: #fff4d6; color: #936300;',
      quoteCss: 'padding: 1em; border-left-color: #f82b60; border-radius: 10px; background: #fff0f5; color: #4a4f57;',
      imageCss: 'border-radius: 12px; border: 1px solid #dfe3ea;',
    }),
  }),
  brandTheme({
    id: 'nike-run',
    name: 'Nike Run',
    description: 'Nike 的黑白运动杂志、大号粗体标题和极速红强调。',
    swatches: ['#ffffff', '#111111', '#fa5400', '#f2f2f2'],
    css: buildEditorialCss({
      rootBg: '#ffffff',
      articleBg: '#ffffff',
      titleColor: '#111111',
      bodyColor: '#242424',
      accent: '#fa5400',
      accentSoft: '#fff1e9',
      border: '#dddddd',
      muted: '#5c5c5c',
      titleFont: 'Nike Futura, "Arial Black", Impact, sans-serif',
      bodyFont: 'Helvetica Neue, Arial, sans-serif',
      titleWeight: '900',
      titleSize: '25px',
      titleTransform: 'uppercase',
      h2Css: 'font-family: "Arial Black", Impact, sans-serif; text-transform: uppercase; color: #111111; border-top: 4px solid #111111; padding-top: 0.38em;',
      h3Css: 'color: #fa5400; text-transform: uppercase;',
      quoteCss: 'padding: 1em; border-left-color: #fa5400; background: #f2f2f2; color: #242424;',
      imageCss: 'border-radius: 0;',
    }),
  }),
  brandTheme({
    id: 'posthog-hog',
    name: 'PostHog Hog',
    description: 'PostHog 的暖黄产品手册、黑色边框和实验记录感。',
    swatches: ['#fff7d6', '#151515', '#f54e00', '#ffdf6b'],
    css: buildEditorialCss({
      rootBg: '#fff7d6',
      articleBg: '#fffaf0',
      titleColor: '#151515',
      bodyColor: '#28231d',
      accent: '#f54e00',
      accentSoft: '#ffe9c2',
      border: '#151515',
      muted: '#5a5045',
      titleFont: 'Matter, -apple-system, BlinkMacSystemFont, sans-serif',
      bodyFont: 'Matter, -apple-system, BlinkMacSystemFont, sans-serif',
      articlePadding: '18px 16px 32px',
      articleRadius: '8px',
      h2Css: 'padding: 0.45em 0.65em; border: 2px solid #151515; background: #ffdf6b; color: #151515;',
      h3Css: 'color: #f54e00;',
      quoteCss: 'padding: 1em; border: 2px solid #151515; border-left-width: 6px; border-radius: 8px; background: #ffe9c2; color: #28231d;',
      imageCss: 'border-radius: 8px; border: 2px solid #151515;',
    }),
  }),
  brandTheme({
    id: 'sentry-crash',
    name: 'Sentry Crash',
    description: 'Sentry 的深紫监控台、橙色异常提示和问题排查氛围。',
    swatches: ['#2b1d34', '#ffffff', '#f55442', '#3d2a48'],
    css: buildEditorialCss({
      rootBg: '#2b1d34',
      articleBg: '#34233e',
      titleColor: '#ffffff',
      bodyColor: '#eadff0',
      accent: '#f55442',
      accentSoft: '#4a2a37',
      border: '#574461',
      muted: '#c8b8d0',
      titleFont: 'Rubik, -apple-system, BlinkMacSystemFont, sans-serif',
      bodyFont: 'Rubik, -apple-system, BlinkMacSystemFont, sans-serif',
      articlePadding: '20px 16px 34px',
      articleRadius: '14px',
      h2Css: 'color: #ffffff; border-left: 5px solid #f55442; padding-left: 0.75em;',
      h3Css: 'color: #ff9b8f;',
      quoteCss: 'padding: 1em; border-left-color: #f55442; border-radius: 12px; background: #4a2a37; color: #eadff0;',
      imageCss: 'border-radius: 12px; border: 1px solid #574461;',
    }),
  }),
  brandTheme({
    id: 'binance-market',
    name: 'Binance Market',
    description: 'Binance 的黑金行情面板、高对比标签和市场快讯感。',
    swatches: ['#0b0e11', '#eaecef', '#f0b90b', '#1e2329'],
    css: buildEditorialCss({
      rootBg: '#0b0e11',
      articleBg: '#181a20',
      titleColor: '#eaecef',
      bodyColor: '#d6d9df',
      accent: '#f0b90b',
      accentSoft: '#2b2611',
      border: '#2b3139',
      muted: '#b7bdc6',
      titleFont: 'BinancePlex, -apple-system, BlinkMacSystemFont, sans-serif',
      bodyFont: 'BinancePlex, -apple-system, BlinkMacSystemFont, sans-serif',
      titleWeight: '600',
      articlePadding: '18px 16px 32px',
      articleRadius: '10px',
      h2Css: 'padding: 0.42em 0.65em; background: #f0b90b; color: #0b0e11; border-radius: 6px;',
      h3Css: 'color: #f0b90b;',
      quoteCss: 'padding: 1em; border-left-color: #f0b90b; border-radius: 8px; background: #2b2611; color: #d6d9df;',
      imageCss: 'border-radius: 10px;',
    }),
  }),
  brandTheme({
    id: 'spacex-launch',
    name: 'SpaceX Launch',
    description: 'SpaceX 的黑白航天发布、细线分隔和冷静任务简报感。',
    swatches: ['#000000', '#ffffff', '#8f9aa7', '#151515'],
    css: buildEditorialCss({
      rootBg: '#000000',
      articleBg: '#0b0b0b',
      titleColor: '#ffffff',
      bodyColor: '#e4e6e8',
      accent: '#8f9aa7',
      accentSoft: '#151515',
      border: '#2c2c2c',
      muted: '#b8bec6',
      titleFont: 'D-DIN, Arial, sans-serif',
      bodyFont: 'D-DIN, Arial, sans-serif',
      titleWeight: '700',
      titleTransform: 'uppercase',
      titleSpacing: '0.05em',
      articlePadding: '22px 16px 36px',
      articleRadius: '0',
      h2Css: 'color: #ffffff; border-top: 1px solid #8f9aa7; border-bottom: 1px solid #2c2c2c; padding: 0.5em 0; text-transform: uppercase;',
      h3Css: 'color: #b8bec6; text-transform: uppercase;',
      quoteCss: 'padding: 1em; border-left-color: #8f9aa7; background: #151515; color: #e4e6e8;',
      imageCss: 'border-radius: 0; border: 1px solid #2c2c2c;',
    }),
  }),
  brandTheme({
    id: 'dacomming-editorial',
    name: '大聪明',
    description: '公众号评论长文风格，白底、黑字、醒目小标题和轻量信息块，适合观点分析与知识型文章。',
    swatches: ['#ffffff', '#151515', '#2f5f8f', '#f7f7f4', '#fff3c4'],
    css: buildEditorialCss({
      rootBg: '#ffffff',
      articleBg: '#ffffff',
      titleColor: '#151515',
      bodyColor: '#252525',
      accent: '#2f5f8f',
      accentSoft: '#f7f7f4',
      border: '#e7e3d8',
      muted: '#5f5f5f',
      bodyFont: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
      titleSize: '22px',
      titleWeight: '700',
      titleSpacing: '0.01em',
      articlePadding: '18px 18px 34px',
      articleRadius: '0',
      h2Css: 'margin: 2.7em 0 1.2em; padding: 0.48em 0.72em; border-left: 5px solid #151515; background: #fff3c4; color: #151515; font-size: 19px; font-weight: 700; line-height: 1.55;',
      h3Css: 'margin: 2.1em 0 1em; padding-bottom: 0.35em; border-bottom: 1px solid #e7e3d8; color: #151515; font-size: 17px; font-weight: 700; line-height: 1.55;',
      quoteCss: 'margin: 1.5em 0; padding: 1em 1.1em; border-left: 0; border-radius: 8px; background: #f7f7f4; color: #4f4f4f;',
      codeCss: 'color: #2f5f8f; background: #f2f6fa;',
      preCss: 'border-color: #d8e1ea; background: #f7fafc;',
      imageCss: 'display: block; width: 100%; border-radius: 8px; margin: 1.55em 0;',
      extraCss: `
.wechat-export-article {
  max-width: 680px;
  margin: 0 auto;
}

.wechat-export-title {
  margin-bottom: 1.1em;
}

.wechat-export-content {
  font-size: 16.5px;
  line-height: 1.9;
  letter-spacing: 0;
  color: #252525;
}

.wechat-export-content > p {
  margin: 0;
  color: #252525;
  font-size: 16.5px;
  line-height: 1.9;
  letter-spacing: 0;
}

.wechat-export-content > p + p {
  margin-top: 1.35em;
}

.wechat-export-content > p[data-wechat-empty="true"] {
  margin: 0.95em 0 0;
  line-height: 1;
  letter-spacing: 0;
}

.wechat-export-content strong {
  color: #151515;
  font-weight: 700;
  background: linear-gradient(to top, #fff3c4 42%, transparent 42%);
}

.wechat-export-content a {
  color: #2f5f8f;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.wechat-export-content ul,
.wechat-export-content ol {
  margin: 1.2em 0;
  padding-left: 1.2em;
}

.wechat-export-content li + li {
  margin-top: 0.45em;
}

.wechat-export-content table {
  border-radius: 8px;
  overflow: hidden;
}

.wechat-export-content table th {
  background: #fff3c4;
}
`,
    }),
  }),
]

export const DEFAULT_WECHAT_EXPORT_THEME_CONFIG: WechatExportThemeConfig = {
  defaultThemeId: DEFAULT_THEME_ID,
  themes: WECHAT_EXPORT_BUILTIN_THEMES,
}

function normalizeThemeId(input: string, fallback = '') {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)

  return normalized || fallback
}

function normalizeSwatchColor(input: unknown) {
  const color = String(input || '').trim()
  return /^#[0-9a-f]{3}(?:[0-9a-f]{1})?(?:[0-9a-f]{2})?(?:[0-9a-f]{2})?$/i.test(color)
    ? color.toLowerCase()
    : ''
}

function normalizeThemeSwatches(input: unknown, fallback: string[] = []) {
  const values = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(',')
      : []

  const swatches = values
    .map(normalizeSwatchColor)
    .filter(Boolean)
    .slice(0, 6)

  return swatches.length > 0 ? swatches : fallback
}

function normalizeTheme(input: unknown, fallbackId: string): WechatExportTheme | null {
  if (!input || typeof input !== 'object') return null

  const record = input as Record<string, unknown>
  const id = normalizeThemeId(String(record.id || ''), fallbackId)
  const builtinTheme = WECHAT_EXPORT_BUILTIN_THEMES.find(theme => theme.id === id)
  const name = String(record.name || '').trim().slice(0, 48) || builtinTheme?.name || fallbackId
  const description = String(record.description || '').trim().slice(0, 160) || builtinTheme?.description || ''
  const css = String(record.css || '').trim() || builtinTheme?.css || ''
  const swatches = normalizeThemeSwatches(record.swatches, builtinTheme?.swatches)
  const builtin = Boolean(builtinTheme)

  if (!id) return null

  return {
    id,
    name,
    description,
    css,
    swatches,
    builtin,
  }
}

function parseStoredThemes(input: unknown) {
  if (Array.isArray(input)) return input
  if (input && typeof input === 'object' && Array.isArray((input as { themes?: unknown }).themes)) {
    return (input as { themes: unknown[] }).themes
  }
  return []
}

function parseStoredDefaultThemeId(input: unknown) {
  if (!input || typeof input !== 'object') return ''
  return String((input as { defaultThemeId?: unknown }).defaultThemeId || '')
}

export function resolveWechatExportThemeConfig(rawConfig?: string | null): WechatExportThemeConfig {
  let parsed: unknown = null

  if (rawConfig) {
    try {
      parsed = JSON.parse(rawConfig)
    } catch {
      parsed = null
    }
  }

  const themesById = new Map<string, WechatExportTheme>()
  for (const theme of WECHAT_EXPORT_BUILTIN_THEMES) {
    themesById.set(theme.id, theme)
  }

  parseStoredThemes(parsed).forEach((themeInput, index) => {
    const theme = normalizeTheme(themeInput, `custom-${index + 1}`)
    if (theme) themesById.set(theme.id, theme)
  })

  const themes = Array.from(themesById.values())
  const storedDefaultId = normalizeThemeId(parseStoredDefaultThemeId(parsed))
  const defaultThemeId = themes.some(theme => theme.id === storedDefaultId)
    ? storedDefaultId
    : DEFAULT_THEME_ID

  return {
    defaultThemeId,
    themes,
  }
}

export function getWechatExportTheme(config: WechatExportThemeConfig, themeId?: string | null) {
  const preferred = themeId ? normalizeThemeId(themeId) : ''
  return config.themes.find(theme => theme.id === preferred)
    || config.themes.find(theme => theme.id === config.defaultThemeId)
    || config.themes[0]
    || WECHAT_EXPORT_BUILTIN_THEMES[0]
}

export function serializeWechatExportThemeConfig(config: WechatExportThemeConfig) {
  const normalized = resolveWechatExportThemeConfig(JSON.stringify(config))
  return JSON.stringify({
    defaultThemeId: normalized.defaultThemeId,
    themes: normalized.themes,
  })
}
