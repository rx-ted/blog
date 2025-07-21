
import { inBrowser, type Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { createPinia } from 'pinia';
import { NProgress } from 'nprogress-v2/dist/index.js'; // 进度条组件

// override style
import '@/styles/index.scss';

// element-ui
// import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/base.css';
import 'element-plus/theme-chalk/el-button.css';
import 'element-plus/theme-chalk/el-tag.css';
import 'element-plus/theme-chalk/el-icon.css';
import 'element-plus/theme-chalk/el-avatar.css';
import 'element-plus/theme-chalk/el-image.css';
import 'element-plus/theme-chalk/el-image-viewer.css';
import 'element-plus/theme-chalk/el-pagination.css';
import 'element-plus/theme-chalk/el-carousel.css';
import 'element-plus/theme-chalk/el-carousel-item.css';
import 'element-plus/theme-chalk/el-alert.css';
import 'element-plus/theme-chalk/dark/css-vars.css';

// 引入时间线组件样式
import 'vitepress-markdown-timeline/dist/theme/index.css';
// 进度条样式
import 'nprogress-v2/dist/index.css';
// see more details for https://vitepress-plugins.sapphi.red/tabs/
import { enhanceAppWithTabs } from 'vitepress-plugin-tabs/client';

import BlogApp from '@/components/BlogApp.vue';
import { withConfigProvider } from '@/theme/blog';

// components
import BlogTags from '@/components/BlogTags.vue';
import BlogEditor from '@/components/BlogEditor.vue';
import Callback from '@/components/Callback.vue';
import { App } from 'vue';

const components: Record<string, any> = {
    'BlogEditor': BlogEditor,
    'BlogTags': BlogTags,
    'Callback': Callback
};
const pinia = createPinia();

const BlogTheme: Theme = {
    ...DefaultTheme,
    Layout: withConfigProvider(BlogApp),

    enhanceApp({ app, router, siteData }) {
        const ctx = { app, router, siteData };

        if (inBrowser) {
            NProgress.configure({ showSpinner: false });
            router.onBeforeRouteChange = () => {
                NProgress.start(); // 开始进度条
            };
            router.onAfterRouteChange = () => {
                NProgress.done(); // 停止进度条
            };
        }

        app.use(pinia);

        enhanceAppWithTabs(app);

        DefaultTheme.enhanceApp(ctx);

        Object.keys(components).forEach((name) => {
            app.component(name, components[name]);
        });
    },

};

export default BlogTheme;

