import type { Theme } from '../config/theme'

const workConfig: Theme.UserWorks = {
  title: '个人项目/线上作品',
  description: '记录开发的点点滴滴',
  topTitle: '最近&积极维护🔥',
  list: [
    {
      top: 1,
      title: '博客主题',
      description: '基于 vitepress 实现的博客主题',
      time: {
        start: '2024/09/05'
      },
      github: {
        owner: 'rx-ted',
        repo: 'blog',
        branch: 'master',
        path: 'packages/theme'
      },
      status: {
        text: '积级维护'
      },
      url: 'https://rx-ted.github.io/blog',
      cover:
        'https://telegraph-image-659.pages.dev/file/48332b656ab6f42ad2d0e.jpg',
      tags: ['Vitepress', 'Vue'],
    },

  ]
}

export default workConfig
