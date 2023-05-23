---
title: hexo一定要了解的步骤
date: 2023-05-17 13:15:05
excerpt: 使用hexo概括一些command
tags: 前端
---

# command

## init 
新建一个网站
```bash
hexo init [folder]
```
## new
新建文章
```bash
hexo new [option] <title>
```
创建一篇文章名为“hexo create"
```bash
hexo new "hexo create"
```
|option|description|
|:-:|:-:|
|-p,--path|指定路径|
|-r,--repalce|替换文章|
|-s,--slug|发布文件名和url|

## generate
```bash
hexo generate
hexo g
```
|option|description|
|:-:|:-:|
|-d,--deploy|生成直接部署|
|-w,--watch|监视变动|
|-b,--bail|异常抛出|
|-f,--force|强制重新生成文件|
|-c,--concurrency|数量不限制|


## publish
发表草稿
```bash
hexo publish [option] [filename]
```

## server
启动网页服务
```bash
hexo server
hexo s
```
|option|description|
|:-:|:-:|
|-p,--port|端口|
|-s,--static|静态设置|
|-l,--log|日志记录|

## deploy
部署网站
```bash
hexo deploy
hexo d
```
## render 
渲染文件
```bash
hexo render <file1> [filex]
```
|option|description|
|:-:|:-:|
|-o,--output|设置输出路径|

## clean
清除缓存
```bash
hexo clean
hexo c
```

## list
列出网站资料
```bash
hexo list <type>
```

## version
查看版本
```bash
hexo version
hexo v
```
## 选项
```bash
hexo --safe # 安全模式
hexo --debug # 调试模式
hexo --silent # 简洁模式
hexo --draft # 显示草稿
```

