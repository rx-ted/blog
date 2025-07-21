import type { EnhanceAppContext, MarkdownOptions } from 'vitepress';

export interface PluginConfig {
    /** 插件配置 */
    markdown?: MarkdownOptions
}

/**
 * VitePress 插件接口
 */
export interface VitePressPlugin {
    /** 插件名称 */
    name: string
    /** 是否启用插件（默认 true） */
    enabled?: boolean
    /** 插件初始化逻辑 */
    setup?: (ctx: EnhanceAppContext) => void | Promise<void>

    /** 插件配置 */
    config?: PluginConfig
}

/**
 * 插件管理器配置
 */
export interface PluginManagerOptions {
    /** 默认启用的插件列表 */
    defaultPlugins?: VitePressPlugin[]
    /** 允许用户自定义插件 */
    allowCustomPlugins?: boolean
}