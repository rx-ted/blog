# Layout 架构

```
layouts/
├── index.vue           ← 入口 orchestrator（替代 LayoutResolver）
│                       按 route.meta.layout 分发 + 注入响应式 / forceNoAside
├── FullLayout.vue      ← 主布局：TopBar + AnnouncementBar + 可选双 aside（组件注册表驱动）+ Footer
├── DocLayout.vue       ← 文档布局：TopBar + 可选 TopAd + 可选双 aside + Footer
├── SimpleLayout.vue    ← 简洁布局：TopBar + Content + Footer，无 aside
└── BlankLayout.vue     ← 空白布局：纯空壳，无 chrome（保留未来使用）
```

## 布局选择

| layout 值 | 组件 | Chrome | Aside | 用途 |
|-----------|------|--------|-------|------|
| `'full'` | FullLayout | TopBar + AnnouncementBar + Footer | 可选 Left / Right | 首页、文章列表、Dashboard、Editor |
| `'doc'` | DocLayout | TopBar + Footer | Right 默认开，Left 可选 | 文章详情 |
| `'simple'` | SimpleLayout | TopBar + Footer | 无 | 登录、注册、找回密码、404 |
| `'blank'` | BlankLayout | 无 | 无 | 未来扩展（全屏/嵌入） |

## 组件注册表

`config/component-registry.ts` 维护 `ASIDE_COMPONENT_REGISTRY` 和 `CONTENT_COMPONENT_REGISTRY`，Key 为组件标识符，Value 为组件引用。

Layout 渲染时根据配置的组件名数组（如 `['tag-cloud', 'recent-posts']`）从注册表查找到对应组件，动态渲染。

## 响应式

`composables/useResponsive.ts` 提供 `isMobile` / `forceNoAside` 状态。
- 移动端（<768px）`forceNoAside = true`，Layout 强制不渲染 aside
- `index.vue` 向 Layout 组件传入 `:force-no-aside` prop
