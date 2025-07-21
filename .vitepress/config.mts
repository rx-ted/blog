import { defineConfig } from 'vitepress'
import { blogTheme, extraHead } from './blog-theme'
import packageJSON from "../package.json"

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Blog',
  description: 'blog, recording',
  lastUpdated: true,
  cleanUrls: true,
  metaChunk: true,
  srcDir: "./notes",
  // sitemap: {
  //   hostname: 'https://rx-ted.github.io',
  // },
  base: '',
  lang: 'zh-cn',
  head: [...extraHead],
  extends: blogTheme,

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/imgs/logo.png',
    nav: [
      { text: '🏠 首页', link: '/' },
      {
        text: '✍️ 写作',
        link: '/modules/editor',
      },
      {
        text: '🔍 探索',
        items: [
          {
            text: `🚀 v${packageJSON.version}`,
            link: '/modules/changelog/zh',
          },
          {
            text: '📂 归档',
            link: '/modules/article/archives',
          },
          {
            text: '🏷️ 标签',
            link: '/modules/article/tags',
          },
          // {
          //   text: "🕰️ 时间轴",
          //   link: "/modules/timeline"
          // }
        ],
      },
      {
        text: '🛠️ 工具',
        items: [
          {
            text: '🤖 个人图床',
            link: 'https://picx.xpoet.cn',
          },
          {
            text: '🖼️ ChatGPT',
            link: 'https://rx-ted-wechat-bot.deno.dev',
          },
        ],
      },
      {
        text: '👤 关于',
        link: '/modules/about',
      },
      {
        text: '💬 留言',
        link: '/modules/comment',
      },
    ],
    // editLink: {
    //   pattern:
    //     'https://github.com/rx-ted',
    //   text: '去 GitHub 上编辑内容'
    // },
    lastUpdatedText: '上次更新于',
    outline: {
      level: 'deep',
      label: '目录',
    },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '相关推荐',
  },

  markdown: {
    lineNumbers: true,
    container: {
      infoLabel: 'ℹ️',
      noteLabel: '📝',
      tipLabel: '💡',
      warningLabel: '⚠️',
      dangerLabel: '🔥',
      detailsLabel: '📂',
      importantLabel: '📌',
      cautionLabel: '☢️',
    },
  },

})
