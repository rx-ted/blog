import { defineConfig } from 'vitepress'
import { blogTheme } from './blog-theme'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Blog",
  description: "blog, recording",
  extends: blogTheme,

  lastUpdated: true,
  cleanUrls: false,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.png',

    nav: [
      { text: 'Index', link: '/' },
      {
        text: 'Notes',
        items: [{
          text: 'Archives',
          link: 'notes/archives'
        },
        {
          text: 'Tags',
          link: 'notes/tags'
        },
        {
          text: 'Categories',
          link: 'notes/categories'
        },
        {
          text: 'Work',
          link: 'notes/work'
        },
        ]
      },

      {
        text: '线上作品',
        items: [
          {
            text: '个人图床',
            link: 'https://telegraph-image-659.pages.dev'
          },
        ]
      },
      {
        text: 'About',
        link: 'about'
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
