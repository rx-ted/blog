import { getThemeConfig } from './theme/config/theme'
import workConfig from './works'
import { loadEnv } from 'vitepress'


export const blogTheme = getThemeConfig({
  works: workConfig,
  article: {
    analyzeTitles: {
      inlineWordCount: '{{value}} word counts',
      inlineReadTime: '{{value}} min read time',
      wordCount: 'Total word count',
      readTime: 'Total read time',
      author: 'Author',
      publishDate: 'Published on',
      lastUpdated: 'Last updated on',
      tag: 'Tags',
    }
  },
  formatShowDate: {
    justNow: '不久前',
    minutesAgo: ' minutes ago',
  },
  authorList: [
    {
      nickname: 'rx-ted',
      url: 'https://rx-ted.github.io/blog/about/',
      des: '人生如戏 生活如诗 祸福难料 把握眼前'
    }
  ],
  recommend: {
    nextText: '下一页',
    sort(a, b) {
      return +new Date(b.meta.date) - +new Date(a.meta.date)
    },
  },
  //  RSS,
  // oml2d,   
  friend: [
    {
      nickname: '粥里有勺糖',
      des: '你的指尖,拥有改变世界的力量',
      avatar:
        'https://img.cdn.sugarat.top/mdImg/MTY3NDk5NTE2NzAzMA==674995167030',
      url: 'https://sugarat.top'
    },
    {
      nickname: 'Vitepress',
      des: 'Vite & Vue Powered Static Site Generator',
      avatar: 'https://vitepress.dev/vitepress-logo-large.webp',
      url: 'https://vitepress.dev/'
    }
  ],
  // 文章默认作者
  author: 'rx-ted',
  authorImgUrl: "/author.jpg",
  search: {
    pageResultCount: 5
  },
  // 评论
  comment: {
    type: 'giscus',
    options: {
      repo: 'rx-ted/blog',
      repoId: 'R_kgDOI-QZwQ',
      category: 'Announcements',
      categoryId: 'DIC_kwDOI-QZwc4CiHz6',
      inputPosition: 'top',
    },
  },
  buttonAfterArticle: {
    openTitle: '投"币"支持',
    closeTitle: '下次一定',
    content: '<img src="https://telegraph-image-659.pages.dev/file/5580b67229af032279924.jpg">',
    icon: 'wechatPay',
  },
  popover: {
    title: '公告',
    body: [
      { type: 'text', content: '👇 微信 👇' },
      {
        type: 'image',
        src: 'https://telegraph-image-659.pages.dev/file/cddf30e15e6b5f724a788.jpg'
      },
      {
        type: 'text',
        content: '欢迎大家私信交流'
      },
      {
        type: 'button',
        content: '作者博客',
        link: 'https://rx-ted.github.io/blog'
      },
      {
        type: 'button',
        content: '加我交流',
        props: {
          type: 'success'
        },
        link: getUrl() + '/notes/about/wechat',
      }
    ],
    duration: 0
  },
  footer: {
    copyright: 'MIT License | rx-ted',
  }
})

export function getUrl() {
  const env = loadEnv('', process.cwd());
  return env?.VITE_BASE_URL === undefined ? "" : env?.VITE_BASE_URL
}

export const extraHead
  = [
    ['link',
      {
        href: getUrl() + '/logo.png',
        type: "image/x-icon",
        rel: "shortcut icon"
      }
    ],
    [
      'script',
      {
        charset: 'UTF-8',
        id: 'LA_COLLECT',
        src: '//sdk.51.la/js-sdk-pro.min.js'
      },
    ],
    [
      'script',
      {},
      `LA.init({id:"3JYAa4Wu44u52ZV9",ck:"3JYAa4Wu44u52ZV9"})`
    ],
  ]

