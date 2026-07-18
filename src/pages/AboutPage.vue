<script setup lang="ts">
type Feature = {
  emoji: string;
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    emoji: '🔐',
    title: '认证系统',
    description:
      '支持密码登录、邮箱验证码、Google/GitHub SSO 多种方式。JWT 短生命周期 + token 版本控制，登出即可即时失效，安全可靠。',
  },
  {
    emoji: '📝',
    title: '内容管理',
    description:
      'Markdown 编辑器搭配分类与标签体系。支持公开、私密、密码保护三种可见性，以及草稿、发布、归档三态管理，灵活掌控内容生命周期。',
  },
  {
    emoji: '🔍',
    title: '全文搜索',
    description:
      '自研搜索引擎，支持标题、标签、分类、作者及拼音检索。搜索即用，无需接入任何第三方服务，数据完全自控。',
  },
  {
    emoji: '⚡',
    title: '缓存策略',
    description:
      'Redis Cache Aside 模式：写操作提交 DB 后清除缓存，读操作优先命中缓存。首页 60s TTL 自动刷新，控制台按需加载。',
  },
  {
    emoji: '🎨',
    title: '主题系统',
    description:
      '明暗双主题搭配 6 种主题色自由切换。基于 CSS 变量驱动，所有组件即时响应，Naive UI 深度集成。',
  },
  {
    emoji: '🛡️',
    title: '权限体系',
    description:
      'RBAC 角色权限模型，用户/角色/权限三级管理。API 层 AuthGuard 认证 + PermissionsGuard 鉴权双重校验，精细到每个接口。',
  },
  {
    emoji: '💬',
    title: '评论系统',
    description:
      '原生评论与 Giscus、Disqus 多驱动支持。树形线程展示、回复嵌套、展开收起，作者高亮标识。',
  },
  {
    emoji: '📊',
    title: '数据统计',
    description:
      '文章阅读量、点赞数、评论数全量统计。控制台可视化展示趋势数据，Metrics API 支持 P50/P95/P99 延迟分析。',
  },
];

const stackItems = [
  'Vue 3',
  'TypeScript',
  'Vite',
  'Pinia',
  'Naive UI',
  'Hono',
  'Drizzle ORM',
  'MySQL',
  'Redis',
  'pnpm Workspace',
  'Turborepo',
];

const architecture = [
  {
    label: 'Monorepo',
    desc: 'pnpm Workspace + Turborepo 管理，apps（前端博客 + 管理端 + API）+ packages（配置、日志、邮件、搜索）清晰分层',
  },
  {
    label: '认证',
    desc: 'JWT + scrypt 密码哈希 + OAuth 2.0（Google/GitHub）。AuthGuard + PermissionsGuard 双层守卫，token 版本支持即时吊销',
  },
  {
    label: '数据流',
    desc: '写路径：DB 提交 → 清除缓存；读路径：缓存命中 → 返回 / 未命中 → DB 查询 → 回填缓存。保证数据最终一致',
  },
  {
    label: '国际化',
    desc: '前端运行时切换中/英文，后端根据用户 preferred_locale 返回对应内容，覆盖全站文案',
  },
];
</script>

<template>
  <div class="about-page">
    <!-- Hero -->
    <section class="hero-section">
      <div class="hero-logo">B</div>
      <h1 class="hero-title">Fullstack Blog</h1>
      <p class="hero-subtitle">可扩展全栈博客系统 · 围绕内容、认证、权限、缓存与搜索能力构建</p>
    </section>

    <!-- Author -->
    <section class="card-section">
      <div class="author-card">
        <div class="author-avatar" />
        <div class="author-body">
          <h2 class="section-title">关于作者</h2>
          <p class="section-text">
            最开始只是想有个地方记录技术笔记。用 WordPress 搭过，用 Hexo 折腾过，用 Notion
            写过——但总感觉差了点什么。
          </p>
          <p class="section-text">
            直到有一天意识到：我缺的不是写作工具，而是一个
            <strong
              >完全属于自己的内容系统</strong
            >。这个项目从零开始，用自己最舒服的技术栈，打造了一个从底层到 UI 完全可控的博客平台。
          </p>
          <p class="section-text" style="margin-top:4px;">
            专注 Vue 3 / TypeScript / Node.js 技术栈，热衷于构建可靠、可扩展的 Web 应用。
            写作不是一次性产出，而是持续整理认知的过程。
          </p>
        </div>
      </div>
    </section>

    <!-- Why -->
    <section>
      <h2 class="section-title">为什么做这个项目</h2>
      <p class="section-text">
        市场上现成的博客平台要么功能受限，要么过度商业化。我想打造一个
        <strong
          >完全掌控</strong
        >的内容平台——从认证到权限、从缓存到搜索、从前端到后端，每一行代码都可定制、可扩展。
        同时也希望通过这个项目实践和验证全栈架构的最佳实践。
      </p>
    </section>

    <!-- Features -->
    <section>
      <h2 class="section-title">功能特性</h2>
      <div class="features-grid">
        <div v-for="f in features" :key="f.title" class="feature-card">
          <div class="feature-emoji">{{ f.emoji }}</div>
          <h3 class="feature-title">{{ f.title }}</h3>
          <p class="feature-desc">{{ f.description }}</p>
        </div>
      </div>
    </section>

    <!-- Tech Stack -->
    <section>
      <h2 class="section-title">技术栈</h2>
      <div class="stack-list">
        <span v-for="item in stackItems" :key="item" class="stack-tag">{{ item }}</span>
      </div>
    </section>

    <!-- Architecture -->
    <section>
      <h2 class="section-title">架构概览</h2>
      <div class="arch-list">
        <div v-for="item in architecture" :key="item.label" class="arch-row">
          <div class="arch-label">{{ item.label }}</div>
          <div class="arch-desc">{{ item.desc }}</div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.about-page {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding-bottom: 32px;
}

/* Hero */
.hero-section {
  text-align: center;
  padding: 48px 0 24px;
}
.hero-logo {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: var(--app-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 32px;
  font-weight: bold;
  margin: 0 auto 16px;
}
.hero-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
}
.hero-subtitle {
  margin: 8px auto 0;
  font-size: 14px;
  color: var(--app-text-secondary);
  max-width: 500px;
  line-height: 1.6;
}

/* Author */
.author-card {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  padding: 24px;
  border-radius: 16px;
  border: 1px solid var(--app-border);
  background: var(--app-bg-elevated);
}
.author-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--app-primary), var(--app-info));
  flex-shrink: 0;
}
.author-body {
  flex: 1;
  min-width: 0;
}

/* Shared */
.section-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 12px;
}
.section-text {
  font-size: 14px;
  color: var(--app-text-secondary);
  line-height: 1.8;
  margin: 0 0 8px;
}
.section-text:last-child {
  margin-bottom: 0;
}

/* Features Grid */
.features-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.feature-card {
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--app-border);
  transition: border-color 0.15s ease;
}
.feature-card:hover {
  border-color: var(--app-primary);
}
.feature-emoji {
  font-size: 24px;
  margin-bottom: 8px;
}
.feature-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 6px;
}
.feature-desc {
  font-size: 13px;
  color: var(--app-text-secondary);
  line-height: 1.7;
  margin: 0;
}

/* Tech Stack */
.stack-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.stack-tag {
  padding: 5px 14px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
  color: var(--app-primary);
  font-size: 13px;
  font-weight: 500;
}

/* Architecture */
.arch-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.arch-row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--app-border);
}
.arch-row:last-child {
  border-bottom: none;
}
.arch-label {
  width: 100px;
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text);
}
.arch-desc {
  font-size: 14px;
  color: var(--app-text-secondary);
  line-height: 1.6;
}

/* Responsive */
@media (max-width: 768px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
  .author-card {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .arch-row {
    flex-direction: column;
    gap: 4px;
  }
  .arch-label {
    width: auto;
  }
  .hero-section {
    padding: 32px 0 16px;
  }
  .hero-title {
    font-size: 24px;
  }
}
</style>
