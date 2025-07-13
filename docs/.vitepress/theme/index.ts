// element-ui
// import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/base.css'
import 'element-plus/theme-chalk/el-button.css'
import 'element-plus/theme-chalk/el-tag.css'
import 'element-plus/theme-chalk/el-icon.css'
import 'element-plus/theme-chalk/el-avatar.css'
import 'element-plus/theme-chalk/el-image.css'
import 'element-plus/theme-chalk/el-image-viewer.css'
import 'element-plus/theme-chalk/el-pagination.css'
import 'element-plus/theme-chalk/el-carousel.css'
import 'element-plus/theme-chalk/el-carousel-item.css'
import 'element-plus/theme-chalk/el-alert.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
// 引入时间线组件样式
import 'vitepress-markdown-timeline/dist/theme/index.css'
import './styles/index.scss'
// import './styles/style.scss'

import DefaultTheme from 'vitepress/theme'
import { inBrowser, Theme } from 'vitepress'
import { withConfigProvider } from './config/blog'
import { enhanceAppWithTabs } from 'vitepress-plugin-tabs/client'
import googleAnalytics from 'vitepress-plugin-google-analytics'
import { NProgress } from 'nprogress-v2/dist/index.js' // 进度条组件
import 'nprogress-v2/dist/index.css' // 进度条样式

import BlogApp from './components/BlogApp.vue'
import BlogEditor from './components/BlogEditor.vue'
import BlogTags from './components/BlogTags.vue'

const components = {
    "BlogEditor": BlogEditor,
    "BlogTags": BlogTags,
};

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
            app, router, siteData
        })
        googleAnalytics({
            id: 'G-KP3R6T6K3P'  //跟踪ID，在analytics.google.com注册即可
        })
        Object.keys(components).forEach(name => {
            app.component(name, components[name])
        })
    },
}


export default BlogTheme