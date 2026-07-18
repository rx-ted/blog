<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePostDetailStore } from '@/stores/postDetail';
import { MdPreview } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';
import { NSpin, NAlert, NButton } from 'naive-ui';
import SeoHead from '@/components/seo/SeoHead.vue';
import { headingId } from '@/utils/headingId';
import { useTheme } from '../theme/useTheme';

const route = useRoute();
const router = useRouter();
const detailStore = usePostDetailStore();
const { item, loading, error } = storeToRefs(detailStore);

const { themeMode } = useTheme();

const slug = computed(() => String(route.params.slug || ''));

watch(
  slug,
  async (newSlug) => {
    if (newSlug) {
      await detailStore.fetchBySlug(newSlug);
    }
  },
  { immediate: true },
);
</script>

<template>
  <SeoHead
    v-if="item"
    :title="`${item.title} - rx-ted's Blog`"
    :description="item.title"
    :keywords="item.tags"
    type="article"
    :author="item.author"
    :published-time="item.createdAt"
    :modified-time="item.updatedAt"
    :url="`/post/${slug}`"
  />
  <article class="post-detail">
    <n-spin :show="loading">
      <n-alert v-if="error" type="error" :show-icon="false" class="alert">
        {{ error }}
        <br><br>
        <n-button @click="router.push('/posts')">返回文章列表</n-button>
      </n-alert>

      <template v-else-if="item">
        <!-- Cover image -->
        <div v-if="item.coverImage" class="post-cover">
          <img :src="item.coverImage ?? ''" :alt="item.title">
        </div>

        <!-- Content -->
        <div v-if="item.content" class="post-content">
          <MdPreview
            editorId="post-detail"
            :theme="themeMode"
            :mdHeadingId="headingId"
            :modelValue="item.content ?? ''"
            previewTheme="github"
            codeTheme="github"
            :noKatex="false"
            :noMermaid="false"
          />
        </div>
        <pre v-else class="content-plain">{{ item.content }}</pre>

        <!-- Footer tags -->
        <div v-if="item.tags?.length" class="post-footer-tags">
          <span v-for="tag in item.tags" :key="tag" class="tag-chip-outline">{{ tag }}</span>
        </div>
      </template>
    </n-spin>
  </article>
</template>

<style lang="scss" scoped>
.post-detail {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 24px;
}

.alert {
  margin-bottom: 16px;
}

.post-cover {
  margin-bottom: 40px;
  border-radius: 16px;
  overflow: hidden;
}

.post-cover img {
  width: 100%;
  height: auto;
  display: block;
}

.tag-chip-outline {
  font-size: 13px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--app-border);
  color: var(--app-text-secondary);
  white-space: nowrap;
}

.post-content {
  font-size: 17px;
  line-height: 1.85;
  color: var(--app-text);
}

.post-footer-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 32px;
  margin-top: 48px;
  border-top: 1px solid var(--app-border);
}

.content-plain {
  white-space: pre-wrap;
  line-height: 1.7;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  padding: 20px;
  border-radius: 12px;
  background: var(--app-bg-muted);
  border: 1px solid var(--app-border);
}

@media (max-width: 768px) {
  .post-detail {
    padding: 0 16px;
  }

  .post-content {
    font-size: 16px;
  }
}
</style>
