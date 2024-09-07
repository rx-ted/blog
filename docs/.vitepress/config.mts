import { defineConfig } from 'vitepress'
import { blogTheme, extraHead, getUrl } from './blog-theme'
import packageJSON from '../../package.json'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Blog",
  description: "blog, recording",
  lastUpdated: true,
  cleanUrls: false,
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
        text: 'Notes',
        items: [{
          text: 'Archives',
          link: '/notes/archives'
        },
        {
          text: 'Tags',
          link: '/notes/tags'
        },
        {
          text: 'Categories',
          link: '/notes/categories'
        },
        ]
      },

      {
        text: '线上作品',
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
          {
            text: 'Editor',
            link: '/notes/work/editor'
          }
        ]
      },

      {
        text: 'Friend',
        link: '/notes/friend'
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
      level: [2, 3],
      label: '目录'
    },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '相关推荐'
  }
})
