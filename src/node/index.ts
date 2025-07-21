import { type UserConfig } from "vitepress"
import { type Theme } from "../types/theme"
import { checkConfig, patchVPConfig, patchVPThemeConfig } from "./theme"
import { getMarkdownPlugins, getVitePlugins, patchMermaidPluginCfg, patchOptimizeDeps, registerMdPlugins, registerVitePlugins } from "./plugin"
import path from "path"


export const getThemeConfig = (cfg: Partial<Theme.BlogConfig>) => {
    checkConfig(cfg)

    const pagesData: Theme.PageData[] = []


    const extraVPConfig: Partial<UserConfig> = {
        vite: {
            publicDir: '../public',
            // see https://sass-lang.com/documentation/breaking-changes/legacy-js-api/
            css: {
                preprocessorOptions: {
                    scss: {
                        api: 'modern',
                    },
                },
            },
            build: {
                // https://vite.dev/config/build-options.html#build-chunksizewarninglimit
                chunkSizeWarningLimit: 2048,
                minify: 'esbuild', // 默认已启用

            },
            resolve: {
                alias: {
                    "@": path.resolve(__dirname, '..')
                }
            }
        },

    }

    const vitePlugins = getVitePlugins(cfg)

    // 注册Vite插件
    registerVitePlugins(extraVPConfig, vitePlugins)

    // 获取要加载的markdown插件
    const markdownPlugin = getMarkdownPlugins(cfg)
    // 注册markdown插件
    registerMdPlugins(extraVPConfig, markdownPlugin)

    // patch extraVPConfig
    if (cfg?.mermaid !== false) {
        patchMermaidPluginCfg(extraVPConfig)
    }
    patchOptimizeDeps(extraVPConfig)
    patchVPConfig(extraVPConfig, cfg)

    return {
        themeConfig: {
            blog: {
                pagesData, // 插件里补全
                ...cfg
            },
            // 补充一些额外的配置用于继承
            ...patchVPThemeConfig(cfg)
        },
        ...extraVPConfig
    }



}


/**
 * defineConfig Helper
 */
export function defineConfig(config: UserConfig<Theme.Config>): any {
    return config
}