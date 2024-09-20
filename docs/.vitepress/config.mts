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
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.png',

    nav: [
      { text: 'Index', link: '/' },
      {
        text: `v${packageJSON.version}`,
        link: '/notes/changelog'
      },
      {
        text: 'Tags',
        link: '/notes/article/tags'
      },
      {
        text: 'Editor',
        link: '/notes/work/editor'
      },


      {
        text: 'work',
        // link:'/notes/work'
        items: [
          {
            text: '个人图床',
            link: 'https://telegraph-image-659.pages.dev'
          },
          {
            text: 'ChatGPT',
            link: 'https://wechat-bot.pages.dev/'
          },
        ]
      },
      {
        text: 'About',
        link: '/notes/about'
      }
    ],
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/rx-ted',
      },
    ],
    editLink: {
      pattern:
        'https://github.com/rx-ted',
      text: '去 GitHub 上编辑内容'
    },
    lastUpdatedText: '上次更新于',
    outline: {
      level: "deep",
      label: '目录'
    },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '相关推荐'
  }
})
