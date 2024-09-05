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

import DefaultTheme from 'vitepress/theme'
import { Theme } from 'vitepress'
import { withConfigProvider } from './config/blog'
import { enhanceAppWithTabs } from 'vitepress-plugin-tabs/client'
import UserWorks from './components/UserWorks.vue'
import BlogApp from './components/BlogApp.vue'
import { h } from 'vue'


const components = {
    'UserWorks': UserWorks,
};

export const BlogTheme: Theme = {
    ...DefaultTheme,
    Layout: withConfigProvider(BlogApp),
    enhanceApp(ctx) {
        enhanceAppWithTabs(ctx.app)
        DefaultTheme.enhanceApp(ctx)
        Object.keys(components).forEach(name => {
            ctx.app.component(name, components[name])
        })

    }
}


export default BlogTheme