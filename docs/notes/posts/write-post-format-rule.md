---
title: write post format rule
date: 2023-12-16 23:06:32
tags: [hexo]
categories: [technology]
---


# 页面配置📦
## 🧱 Front-matter 的基本认识

`Front-matter` 是 `markdown` 文件最上方以 `---` 分隔的区域，用于指定个别档案的变数。其中又分为两种 markdown 里

1. Page Front-matter 用于页面配置
2. Post Front-matter 用于文章页配置

::: tip
如果标注可选的参数，可根据自己需要添加，不用全部都写在 markdown 里
:::

:::code-group

```markdown [Page Front-matter]
title:
date:
updated:
type:
comments:
description:
keywords:
top_img:
mathjax:
katex:
aside:
aplayer:
highlight_shrink:
type:
top_single_background:
```

```markdown [Post Front-matter]
title:
date:
updated:
tags:
categories:
keywords:
description:
top_img:
comments:
cover:
toc:
toc_number:
toc_style_simple:
copyright:
copyright_author:
copyright_author_href:
copyright_url:
copyright_info:
mathjax:
katex:
aplayer:
highlight_shrink:
aside:
swiper_index: 1
top_group_index: 1
background: "#fff"
```
:::

## Page Front-matter

| 写法             | 解释                                                         |
| ---------------- | ------------------------------------------------------------ |
| title            | 【必需】页面标题                                             |
| date             | 【必需】页面创建日期                                         |
| type             | 【必需】标签、分类、关于、音乐馆、友情链接、相册、相册详情、朋友圈、即刻页面需要配置 |
| updated          | 【可选】页面更新日期                                         |
| description      | 【可选】页面描述                                             |
| keywords         | 【可选】页面关键字                                           |
| comments         | 【可选】显示页面评论模块(默认 true)                          |
| top_img          | 【可选】页面顶部图片                                         |
| mathjax          | 【可选】显示 mathjax(当设置 mathjax 的 per_page: false 时，才需要配置，默认 false) |
| katex            | 【可选】显示 katex(当设置 katex 的 per_page: false 时，才需要配置，默认 false) |
| aside            | 【可选】显示侧边栏 (默认 true)                               |
| aplayer          | 【可选】在需要的页面加载 aplayer 的 js 和 css,请参考文章下面的音乐 配置 |
| highlight_shrink | 【可选】配置代码框是否展开(true/false)(默认为设置中 highlight_shrink 的配置) |
| top_single_background | 【可选】部分页面的顶部模块背景图片 |

## Post Front-matter

| 写法                  | 解释                                                         |
| --------------------- | ------------------------------------------------------------ |
| title                 | 【必需】文章标题                                             |
| date                  | 【必需】文章创建日期                                         |
| updated               | 【可选】文章更新日期                                         |
| tags                  | 【可选】文章标签                                             |
| categories            | 【可选】文章分类                                             |
| keywords              | 【可选】文章关键字                                           |
| description           | 【可选】文章描述                                             |
| top_img               | 【可选】文章顶部图片                                         |
| cover                 | 【可选】文章缩略图(如果没有设置 top_img,文章页顶部将显示缩略图，可设为 false/图片地址/留空) |
| comments              | 【可选】显示文章评论模块(默认 true)                          |
| toc                   | 【可选】显示文章 TOC(默认为设置中 toc 的 enable 配置)        |
| toc_number            | 【可选】显示 toc_number(默认为设置中 toc 的 number 配置)     |
| toc_style_simple      | 【可选】显示 toc 简洁模式                                    |
| copyright             | 【可选】显示文章版权模块(默认为设置中 post_copyright 的 enable 配置) |
| copyright_author      | 【可选】文章版权模块的`文章作者`                             |
| copyright_author_href | 【可选】文章版权模块的`文章作者`链接                         |
| copyright_url         | 【可选】文章版权模块的`文章链接`链接                         |
| copyright_info        | 【可选】文章版权模块的版权声明文字                           |
| mathjax               | 【可选】显示 mathjax(当设置 mathjax 的 per_page: false 时，才需要配置，默认 false) |
| katex                 | 【可选】显示 katex(当设置 katex 的 per_page: false 时，才需要配置，默认 false) |
| aplayer               | 【可选】在需要的页面加载 aplayer 的 js 和 css,请参考文章下面的`音乐` 配置 |
| highlight_shrink      | 【可选】配置代码框是否展开(true/false)(默认为设置中 highlight_shrink 的配置) |
| aside                 | 【可选】显示侧边栏 (默认 true)                               |
| swiper_index          | 【可选】首页轮播图配置 index 索引，数字越小越靠前            |
| top_group_index       | 【可选】首页右侧卡片组配置, 数字越小越靠前                   |
| ai                    | 【可选】文章ai摘要                                           |
| main_color            | 【可选】文章主色，必须是16进制颜色且有6位，不可缩减，例如#ffffff 不可写成#fff |

1. 首页轮播图配置: `swiper_index`, 数字越小越靠前
2. 首页卡片配置: `top_group_index`, 数字越小越靠前
3. page 中`top_single_background`, 可配置部分页面的顶部背景图片

::: tip
只需要在你的文章顶部的`Front-matter`配置这`swiper_index`和`top_group_index`两个字段即可显示轮播图和推荐卡片
:::
