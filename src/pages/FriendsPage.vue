<template>
  <div class="friends-page">
    <div class="page-header">
      <h1 class="page-title">友情链接</h1>
      <p class="page-subtitle">共 {{ links.length }} 个友链</p>
    </div>

    <div v-if="loading" class="loading-state">加载中...</div>

    <div v-else-if="!links.length" class="empty-state">暂无友情链接</div>

    <div v-else class="links-grid">
      <a
        v-for="link in links"
        :key="link.id"
        :href="link.url"
        class="link-card"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div class="card-logo">
          <img v-if="link.logo" :src="link.logo" :alt="link.name">
          <span v-else class="logo-fallback">{{ link.name.charAt(0) }}</span>
        </div>
        <div class="card-body">
          <h3 class="card-name">{{ link.name }}</h3>
          <p v-if="link.description" class="card-desc">{{ link.description }}</p>
        </div>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { http } from '@/http';

interface FriendLink {
  id: number;
  name: string;
  url: string;
  logo: string | null;
  description: string | null;
}

const loading = ref(false);
const links = ref<FriendLink[]>([]);

onMounted(async () => {
  loading.value = true;
  try {
    const body = await http.get<{ data: FriendLink[] }>('/friend-links');
    links.value = Array.isArray(body.data) ? body.data : [];
  } catch {
    links.value = [];
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.friends-page {
  padding: 32px 0;
}
.page-header {
  margin-bottom: 28px;
}
.page-title {
  font-size: 26px;
  font-weight: 700;
  margin: 0;
}
.page-subtitle {
  font-size: 14px;
  color: var(--app-text-secondary);
  margin: 6px 0 0;
}
.loading-state,
.empty-state {
  padding: 48px 0;
  text-align: center;
  color: var(--app-text-tertiary);
}
.links-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
@media (max-width: 640px) {
  .links-grid {
    grid-template-columns: 1fr;
  }
}
.link-card {
  display: flex;
  gap: 14px;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  background: var(--app-bg-container);
  text-decoration: none;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}
.link-card:hover {
  transform: translateY(-2px);
  border-color: var(--app-primary);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--app-primary) 10%, transparent);
}
.card-logo {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  overflow: hidden;
  background: color-mix(in srgb, var(--app-primary) 8%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.logo-fallback {
  font-size: 20px;
  font-weight: 700;
  color: var(--app-primary);
}
.card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
}
.card-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text);
  margin: 0;
}
.card-desc {
  font-size: 12px;
  color: var(--app-text-tertiary);
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
