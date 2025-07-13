import { defineConfig } from 'vitepress'
import { blogTheme, extraHead, getUrl } from './blog-theme'
import packageJSON from '../../package.json'


// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Blog",
  description: "blog, recording",
  lastUpdated: true,
  cleanUrls: true,
  metaChunk: true,
  sitemap: {
    hostname: 'https://rx-ted.github.io/blog',
  },
  base: getUrl(),
  lang: 'zh-cn',
  head: [...extraHead],
  extends: blogTheme,
  vite: {
    // https://vitejs.dev/config/shared-options.html#css-postcss
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern', // ["modern-compiler", "modern", "legacy"]
        }
      }
    }
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.png',

    nav: [
      { text: '🏠 首页', link: '/' },
      {
        text: '🔍 探索',
        items: [
          {
            text: `🚀 v${packageJSON.version}`,
            link: '/modules/changelog'
          },
          {
            text: '📂 归档',
            link: '/modules/article/archives'
          },
          {
            text: '🏷️ 标签',
            link: '/modules/article/tags'
          },
          {
            text: '✍️ Editor',
            link: '/modules/editor'
          },
          {
            text: "🕰️ 时间轴",
            link: "/modules/timeline"
          }
        ]
      },
      {
        text: '🛠️ 工具',
        items: [
          {
            text: '🤖 个人图床',
            link: 'https://telegraph-image-659.pages.dev'
          },
          {
            text: '🖼️ ChatGPT',
            link: 'https://wechat-bot.pages.dev/'
          },
        ]
      },
      {
        text: '👤 关于',
        link: '/modules/about'
      },
      {
        text: "💬 留言",
        link: '/modules/comment'
      },
    ],
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/rx-ted',
      },
    ],
    // editLink: {
    //   pattern:
    //     'https://github.com/rx-ted',
    //   text: '去 GitHub 上编辑内容'
    // },
    lastUpdatedText: '上次更新于',
    outline: {
      level: "deep",
      label: '目录'
    },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '相关推荐'
  },
  markdown: {
    container: {
      infoLabel: "ℹ️",
      noteLabel: "📝",
      tipLabel: "💡",
      warningLabel: "⚠️",
      dangerLabel: "🔥",
      detailsLabel: "📂",
      importantLabel: "📌",
      cautionLabel: "☢️",
    }
  }
})
