---
tags:
  - vitepress
  - vue
---

# vitepress-plugin-tabs

A plugin that adds syntax for showing content in tabs.

## Installation

:::tabs
== npm

```bash [npm]
npm i -D vitepress-plugin-tabs
```

== yarn

```bash [yarn]
yarn add --dev vitepress-plugin-tabs
```

== pnpm

```bash [pnpm]
pnpm add -D vitepress-plugin-tabs
```

== bun

```bash [bun]
bun add --dev vitepress-plugin-tabs
```

:::

## Tabs with non-shared selection state

:::tabs
== tab a
a content
== tab b
b content
:::

:::tabs
== tab a
a content 2
== tab b
b content 2
:::

## Tabs with shared selection state

:::tabs key:ab
== tab a
a content
== tab b
b content
:::

:::tabs key:ab
== tab a
a content 2
== tab b
b content 2
:::
