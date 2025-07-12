---
title: 基于hexo框架借助github开发博客网站
date: 2023-03-04 22:11:18
tags: 经验
description: 我为什么开发这个博客网站?加强记忆，学习新技能，提升写作能力；记录生活，记录自己都日常；偶尔记录下每个不同人生阶段的感悟；分享给更多有共同兴趣爱好的小伙伴一起参与自己做的事。
---

# 基于hexo框架借助github开发博客网站

## 概述

本文以hexo框架为基础，借助github pages的特点开发网站--博客  
首先感谢github、hexo和fluid的帮助。  
Fluid 是基于 Hexo 的一款 Material Design 风格的主题，由 [Fluid-dev](https://github.com/fluid-dev)负责开发与维护。  
主题教程 GitHub: [传送门](https://github.com/fluid-dev/hexo-theme-fluid)
预览网站： [rx-ted's blog](https://rx-ted.github.io/blog)|[Fluid's blog](https://hexo.fluid-dev.com/)| [zkqiang's blog](https://zkqiang.cn/)

### 我为什么开发这个博客网站

- 加强记忆，学习新技能，提升写作能力；
- 记录生活，记录自己都日常；
- 偶尔记录下每个不同人生阶段的感悟；
- 分享给更多有共同兴趣爱好的小伙伴一起参与自己做的事。

## 安装

- nodejs
- git
- hexo-cli
- hexo init
- hexo-theme-fluid
- 注册github或者新建仓库

### nodejs

下载：[node.js](https://nodejs.org/zh-cn/download/)
一般下载最新版本，向下兼容旧版本  
安装好了可以查看版本，如下命令：

```bash
npm --version
```

### git

下载：[git](http://git-scm.com/)
网上下载对应版本即可，下载完后有2个，分别是git bash （命令行）和 git gui（桌面）  
随便选一个，敲代码，如下：

```bash
git --version
```

### hexo-cli

可以在新建博客默认路径，如下路径：D:\blog (简称博客默认路径)  
打开博客默认路径，右击进入git bash，敲代码，如下：

```bash
# 可以选择2种，我选第一种
npm install -g hexo-cli # -g 代表全局保存，一般在%appdata%/npm/*
npm install --save hexo-cli  # 代表局部保存，一般在当前路径/npm下载路径/*
```

### hexo init

```bash
# 如果博客默认路径里面有内容，请删除内容
cd D:\blog
hexo init
# 等待一段时间，出现一些文件文件夹
# 试试运行看看效果
hexo server
# 但不喜欢主题，怎么可以自主选择，我选的是Fluid主题
```

### hexo-theme-fluid

下载方法很多，由你选择  

1. git clone

```bash
# 语法： git clone --branch tag号码 git下载路径
mkdir themes
cd themes
git clone --branch v1.9.4 https://github.com/fluid-dev/hexo-theme-fluid.git
```

2. npm install

```bash
npm install --save hexo-theme-fluid
```

### 注册github或者新建仓库

上网有很多教程，就不用我详细了。
注册好了，进入仓库-setting-page，里面会看到用户名.github.io.仓库名

## 参数

完成上述安装步骤，则可以修改一些参数

### 指定主题

打开博客默认路径-_config.yml  

```yaml
theme: fluid
language: zn-CN
```

### 设置网址

打开博客默认路径-_config.yml  

```yaml
deploy:
  type: git
  repo: https://github.com/<username>/<project>
  # example, https://github.com/hexojs/hexojs.github.io
  branch: gh-pages
```

### 全局覆盖主题

复制themes/hexo-theme-fluid/_config.yml到博客默认路径/_config.fluid.yml
[覆盖配置](https://hexo.fluid-dev.com/docs/guide/#%E8%A6%86%E7%9B%96%E9%85%8D%E7%BD%AE)

### 详细配置

需要你探索
[指导配置](https://hexo.fluid-dev.com/docs/guide)

## 上传网站

### 发布版本

```bash
git clone 仓库网址
# 下载好了，隐藏文件夹.git 把这个复制到博客默认路径
# 发布rag标签
# git tag 将要发布的新版本号
git tag v1.0.0
# 暂存
git add .
# 提交
git commit -m "输入描述"
# 推送
git push origin v1.0.0
# 就这样上传好了
```

### 博客生成

```bash
# 展示效果，先看看好不好
hexo server
# 清理
hexo clean
# 生成文章
hexo g
# 部署发布
hexo d
```

### 博客展示

部署好了，要等一段时间
可以打开网站，如： <https://github.com/hexojs/hexojs.github.io> （就是你默认仓库网址）
