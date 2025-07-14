import type { Theme } from 'vitepress'
import { NProgress } from 'nprogress-v2/dist/index.js' // 进度条组件
import { inBrowser } from 'vitepress'
import googleAnalytics from 'vitepress-plugin-google-analytics'
import { enhanceAppWithTabs } from 'vitepress-plugin-tabs/client'

import DefaultTheme from 'vitepress/theme'
// import '@/styles/style.scss'

import BlogApp from './components/BlogApp.vue'
import { withConfigProvider } from './theme/blog'
// element-ui
// import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/base.css'
import 'element-plus/theme-chalk/el-button.css'
import 'element-plus/theme-chalk/el-tag.css'
import 'element-plus/theme-chalk/el-icon.css'
import 'element-plus/theme-chalk/el-avatar.css'

import './styles/index.scss'
import 'element-plus/theme-chalk/el-image.css'

import 'element-plus/theme-chalk/el-image-viewer.css'
import 'element-plus/theme-chalk/el-pagination.css'
import 'element-plus/theme-chalk/el-carousel.css'
import 'element-plus/theme-chalk/el-carousel-item.css'
import 'element-plus/theme-chalk/el-alert.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
// 引入时间线组件样式
import 'vitepress-markdown-timeline/dist/theme/index.css'
import 'nprogress-v2/dist/index.css' // 进度条样式

const components: Record<string, any> = {
  //     "BlogEditor": BlogEditor,
  //     "BlogTags": BlogTags,
}

export const BlogTheme: Theme = {
  ...DefaultTheme,
  Layout: withConfigProvider(BlogApp),
  enhanceApp({ app, router, siteData }) {
    if (inBrowser) {
      NProgress.configure({ showSpinner: false })
      router.onBeforeRouteChange = () => {
        NProgress.start() // 开始进度条
      }
      router.onAfterRouteChange = () => {
        NProgress.done() // 停止进度条
      }
    }

    enhanceAppWithTabs(app)
    DefaultTheme.enhanceApp({
      app,
      router,
      siteData,
    })
    googleAnalytics({
      id: 'G-KP3R6T6K3P', // 跟踪ID，在analytics.google.com注册即可
    })
    Object.keys(components).forEach((name) => {
      app.component(name, components[name])
    })
  },
}

export * from './theme'

export default BlogTheme
