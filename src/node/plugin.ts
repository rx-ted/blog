import { pagefindPlugin } from "vitepress-plugin-pagefind"
import { type Theme } from "../types/theme"
import { coverImgTransform, providePageData, setThemeScript, themeReloadPlugin } from "./theme"
import { _require, aliasObjectToArray } from "./util"
import { RssPlugin } from "vitepress-plugin-rss"
import { UserConfig } from "vitepress"
import { tabsMarkdownPlugin } from "vitepress-plugin-tabs"
import timeline from 'vitepress-markdown-timeline'



export function getVitePlugins(cfg: Partial<Theme.BlogConfig> = {}) {
    const plugins: any[] = []

    // 处理 cover image 的路径（暂只支持自动识别的文章首图）
    plugins.push(coverImgTransform())

    // 处理自定义主题色
    if (cfg.themeColor) {
        plugins.push(setThemeScript(cfg.themeColor))
    }
    // 自动重载首页
    plugins.push(themeReloadPlugin())

    // 主题 pageData生成
    plugins.push(providePageData(cfg))

    // 内置 pagefind
    if (cfg && cfg.search !== false) {
        const ops = cfg.search instanceof Object ? cfg.search : {}
        plugins.push(
            pagefindPlugin({
                ...ops,
            })
        )
    }

    // 内置支持 Markdown 流程图 Mermaid
    // if (cfg?.mermaid !== false) {
    //     const { MermaidPlugin } = _require('vitepress-plugin-mermaid')
    //     plugins.push(inlineInjectMermaidClient())
    //     plugins.push(MermaidPlugin(cfg?.mermaid === true ? {} : (cfg?.mermaid ?? {})))
    // }

    // 内置支持RSS
    if (cfg?.RSS) {
        ;[cfg?.RSS].flat().forEach(rssConfig => plugins.push(RssPlugin(rssConfig)))
    }


    // 内置支持 group icon
    // if (cfg?.groupIcon !== false) {
    //     plugins.push(patchGroupIconPlugin())
    //     plugins.push(groupIconVitePlugin(cfg?.groupIcon))
    // }

    return plugins
}




export function registerVitePlugins(vpCfg: Partial<UserConfig>, plugins: any[]) {
    vpCfg.vite = {
        plugins,
        ...vpCfg.vite,
    }
}


export function taskCheckboxPlugin(ops?: Theme.TaskCheckbox) {
    return (md: any) => {
        md.use(_require('markdown-it-task-checkbox'), ops)
    }
}

export function registerMdPlugins(vpCfg: Partial<UserConfig>, plugins: any[]) {
    if (plugins.length) {
        vpCfg.markdown = {
            config(...rest: any[]) {
                plugins.forEach((plugin) => {
                    plugin?.(...rest)
                })
            }
        }
    }
}


export function getMarkdownPlugins(cfg?: Partial<Theme.BlogConfig>) {
    const markdownPlugin: any[] = []
    // tabs支持,默认开启
    if (cfg?.tabs !== false) {
        markdownPlugin.push(tabsMarkdownPlugin)
    }

    // 添加mermaid markdown 插件
    if (cfg?.mermaid !== false) {
        const { MermaidMarkdown } = _require('vitepress-plugin-mermaid')
        markdownPlugin.push(MermaidMarkdown)
    }

    if (cfg?.taskCheckbox !== false) {
        markdownPlugin.push(taskCheckboxPlugin(typeof cfg?.taskCheckbox === 'boolean' ? {} : cfg?.taskCheckbox))
    }

    if (cfg?.timeline !== false) {
        markdownPlugin.push(timeline)
    }
    return markdownPlugin
}



export function patchMermaidPluginCfg(config: any) {
    if (!config.vite.resolve)
        config.vite.resolve = {}
    if (!config.vite.resolve.alias)
        config.vite.resolve.alias = {}

    config.vite.resolve.alias = [
        ...aliasObjectToArray({
            ...config.vite.resolve.alias,
            'cytoscape/dist/cytoscape.umd.js': 'cytoscape/dist/cytoscape.esm.js',
            'mermaid': 'mermaid/dist/mermaid.esm.mjs'
        }),
        { find: /^dayjs\/(.*).js/, replacement: 'dayjs/esm/$1' }
    ]
}


export function patchOptimizeDeps(config: any) {
    if (!config.vite.optimizeDeps) {
        config.vite.optimizeDeps = {}
    }
    config.vite.optimizeDeps.exclude = ['vitepress-plugin-tabs']
    config.vite.optimizeDeps.include = ['element-plus']
}


