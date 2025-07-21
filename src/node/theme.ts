import { HeadConfig, SiteConfig, UserConfig } from "vitepress";
import { type Theme } from "../types/theme";
import type { PluginOption, ResolvedConfig } from 'vite'
import { debounce, isBase64ImageURL, isEqual } from "./util";

import fs from 'fs'
import { formatDate } from "../utils/date";
import { getDefaultTitle, getFileLastModifyTime, getTextSummary, grayMatter, joinPath } from '../utils/fs'
import { getVitePressPages, renderDynamicMarkdown } from '../utils/vitepress'

import path from "path";



// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function checkConfig(cfg?: Partial<Theme.BlogConfig>) {
    // 保留
    // console.log(cfg)
}




export function coverImgTransform(): PluginOption {
    return {} as PluginOption
}



export function setThemeScript(
    themeColor: Theme.ThemeColor
) {
    let resolveConfig: ResolvedConfig
    const pluginOps: PluginOption = {
        name: '@sugarat/theme-plugin-theme-color-script',
        enforce: 'pre',
        configResolved(config: any) {
            if (resolveConfig) {
                return
            }
            resolveConfig = config

            const vitepressConfig: SiteConfig = config.vitepress
            if (!vitepressConfig) {
                return
            }
            // 通过 head 添加额外的脚本注入
            const selfTransformHead = vitepressConfig.transformHead
            vitepressConfig.transformHead = async (ctx) => {
                const selfHead = (await Promise.resolve(selfTransformHead?.(ctx))) || []
                return selfHead.concat([
                    ['script', { type: 'text/javascript' }, `;(function() {
            document.documentElement.setAttribute("theme", "${themeColor}");
          })()`]
                ] as HeadConfig[])
            }
        }
    }
    return pluginOps
}


export function themeReloadPlugin() {
    let blogConfig: Theme.BlogConfig
    let vitepressConfig: SiteConfig
    let docsDir: string

    const generateRoute = (filepath: string) => {
        return filepath.replace(docsDir, '').replace('.md', '')
    }

    return {
        name: '@rx/theme-reload',
        apply: 'serve',
        configureServer(server) {
            const restart = debounce(() => {
                server.restart()
            }, 500)
            server.watcher.on('add', async (path) => {
                // TODO: rewrite 和 动态路由兼容
                const route = generateRoute(path)
                const meta = await getArticleMeta(path, route, blogConfig?.timeZone)
                blogConfig.pagesData.push({
                    route,
                    meta
                })
                restart()
            })

            server.watcher.on('change', async (path: string) => {
                const route = generateRoute(path)
                const fileContent = await fs.promises.readFile(path, 'utf-8')
                const { data: frontmatter } = grayMatter(fileContent, {
                    excerpt: true,
                })
                const meta = await getArticleMeta(path, route, blogConfig?.timeZone)
                const matched = blogConfig.pagesData.find(v => v.route === route)

                // 自动生成的部分属性不参与比较，避免刷新频繁
                const excludeKeys = ['date', 'description'].filter(key => !frontmatter[key])
                // 主题不关心的属性不参与比较，避免刷新频繁
                const inlineKeys = [
                    // vitepress 默认主题 https://vitepress.dev/zh/reference/frontmatter-config
                    'lang',
                    'outline',
                    'head',
                    'layout',
                    'hero',
                    'features',
                    'navbar',
                    'sidebar',
                    'aside',
                    'lastUpdated',
                    'editLink',
                    'footer',
                    'pageClass',
                    // 本主题扩展 https://theme.sugarat.top/config/frontmatter.html
                    'hiddenCover',
                    'readingTime',
                    'buttonAfterArticle'
                ]
                if (matched && !isEqual(matched.meta, meta, inlineKeys.concat(excludeKeys))) {
                    matched.meta = meta
                    restart()
                }
            })

            server.watcher.on('unlink', (path) => {
                const route = generateRoute(path)
                const idx = blogConfig.pagesData.findIndex(v => v.route === route)
                if (idx >= 0) {
                    blogConfig.pagesData.splice(idx, 1)
                    restart()
                }
            })
        },
        configResolved(config: any) {
            vitepressConfig = config.vitepress
            docsDir = vitepressConfig.srcDir
            blogConfig = config.vitepress.site.themeConfig.blog
        },
    } as PluginOption
}



const defaultTimeZoneOffset = new Date().getTimezoneOffset() / -60


export async function getArticleMeta(filepath: string, route: string, timeZone = defaultTimeZoneOffset, baseContent?: string) {
    const fileContent = baseContent || await fs.promises.readFile(filepath, 'utf-8')

    const { data: frontmatter, excerpt, content } = grayMatter(fileContent, {
        excerpt: true,
    })

    const meta: Partial<Theme.PageMeta> = {
        ...frontmatter
    }

    if (!meta.title) {
        meta.title = getDefaultTitle(content)
    }
    const utcValue = timeZone >= 0 ? `+${timeZone}` : `${timeZone}`
    const date = await (
        (meta.date
            && new Date(`${new Date(meta.date).toUTCString()}${utcValue}`))
        || getFileLastModifyTime(filepath)
    )
    // 无法获取时兜底当前时间
    meta.date = formatDate(date || new Date(), 'yyyy/MM/dd hh:mm:ss')

    // 处理tags和categories,兼容历史文章
    meta.categories
        = typeof meta.categories === 'string'
            ? [meta.categories]
            : meta.categories
    meta.tags = typeof meta.tags === 'string' ? [meta.tags] : meta.tags
    meta.tag = [meta.tag || []]
        .flat()
        .concat([
            ...new Set([...(meta.categories || []), ...(meta.tags || [])])
        ])

    // 获取摘要信息
    // TODO：摘要生成优化
    meta.description
        = meta.description || getTextSummary(content, 100) || excerpt

    // 获取封面图
    // TODO: 耦合信息优化
    meta.cover
        = meta.cover
        ?? (getFirstImagURLFromMD(fileContent, route))

    // 是否发布 默认发布
    if (meta.publish === false) {
        meta.hidden = true
        meta.recommend = false
    }
    return meta as Theme.PageMeta
}


const imageRegex = /!\[.*?\]\((.*?)\s*(".*?")?\)/

/**
 * 从文档内容中提取封面
 * @param content 文档内容
 */
export function getFirstImagURLFromMD(content: string, route: string) {
    const url = content.match(imageRegex)?.[1]
    const isHTTPSource = url && url.startsWith('http')
    if (!url) {
        return ''
    }

    if (isHTTPSource || isBase64ImageURL(url)) {
        return url
    }

    const paths = joinPath('/', route).split('/')
    paths.splice(paths.length - 1, 1)
    const relativePath = url.startsWith('/') ? url : path.join(paths.join('/') || '', url)

    return joinPath('/', relativePath)
}



export async function getArticles(cfg: Partial<Theme.BlogConfig>, vpConfig: SiteConfig) {
    const pages = getVitePressPages(vpConfig)
    const metaResults = pages.reduce((prev, value) => {
        const { page, route, originRoute, filepath, isDynamic, dynamicRoute } = value

        const metaPromise = (isDynamic && dynamicRoute)
            ? getArticleMeta(filepath, originRoute, cfg?.timeZone, renderDynamicMarkdown(filepath, dynamicRoute.params, dynamicRoute.content))
            : getArticleMeta(filepath, originRoute, cfg?.timeZone)

        // 提前获取，有缓存取缓存
        prev[page] = {
            route,
            metaPromise
        }
        return prev
    }, {} as Record<string, {
        route: string
        metaPromise: Promise<Theme.PageMeta>
    }>)

    const pageData: Theme.PageData[] = []

    for (const page of pages) {
        const { route, metaPromise } = metaResults[page.page]
        const meta = await metaPromise
        if (meta.layout === 'home') {
            continue
        }
        pageData.push({
            route,
            meta
        })
    }
    return pageData
}



export function providePageData(cfg: Partial<Theme.BlogConfig>) {
    return {
        name: '@rx/theme-plugin-provide-page-data',
        async config(config: any, env) {
            const vitepressConfig: SiteConfig = config.vitepress
            const pagesData = await getArticles(cfg, vitepressConfig)
            if (vitepressConfig.site.locales && Object.keys(vitepressConfig.site.locales).length > 1) {
                if (!vitepressConfig.site.themeConfig.blog.locales) {
                    vitepressConfig.site.themeConfig.blog.locales = {}
                }
                // 兼容国际化
                const localeKeys = Object.keys(vitepressConfig.site.locales)
                localeKeys.forEach((localeKey) => {
                    if (!vitepressConfig.site.themeConfig.blog.locales[localeKey]) {
                        vitepressConfig.site.themeConfig.blog.locales[localeKey] = {}
                    }

                    vitepressConfig.site.themeConfig.blog.locales[localeKey].pagesData = pagesData.filter((v) => {
                        const { route } = v
                        const isRoot = localeKey === 'root'
                        if (isRoot) {
                            return !localeKeys.filter(v => v !== 'root').some(k => route.startsWith(`/${k}`))
                        }
                        return route.startsWith(`/${localeKey}`)
                    })
                })
                if (env.mode === 'production') {
                    return
                }
            }
            vitepressConfig.site.themeConfig.blog.pagesData = pagesData
        },
    } as PluginOption
}


export function patchVPConfig(vpConfig: Partial<UserConfig>, cfg?: Partial<Theme.BlogConfig>) {
    vpConfig.head = vpConfig.head || []
    // Artalk 资源地址
    if (cfg?.comment && 'type' in cfg.comment && cfg?.comment?.type === 'artalk') {
        const server = cfg.comment?.options?.server
        if (server) {
            vpConfig.head.push(['link', { href: `${server} /dist/Artalk.css`, rel: 'stylesheet' }])
            vpConfig.head.push(['script', { src: `${server} /dist/Artalk.js`, id: 'artalk-script' }])
        }
    }
}


export function patchVPThemeConfig(
    cfg?: Partial<Theme.BlogConfig>,
    vpThemeConfig: any = {}
) {
    // 用于自定义sidebar卡片slot
    vpThemeConfig.sidebar = patchDefaultThemeSideBar(cfg)?.sidebar

    return vpThemeConfig
}


export function patchDefaultThemeSideBar(cfg?: Partial<Theme.BlogConfig>) {
    return cfg?.blog !== false && cfg?.recommend !== false
        ? {
            sidebar: [
                {
                    text: '',
                    items: []
                }
            ]
        }
        : undefined
}
