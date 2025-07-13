<script setup>
import { useData, withBase } from 'vitepress'
import { computed } from 'vue'
import { useBlogConfig } from '../config/blog'

const { home } = useBlogConfig()
const { frontmatter, site } = useData()
const author = computed(() =>
  frontmatter.value.author
  ?? frontmatter.value?.blog?.author
  ?? home?.author
  ?? site.value.themeConfig?.blog?.author
)

const authorImgUrl =computed(() =>
  frontmatter.value?.authorImgUrl
  ?? frontmatter.value?.blog?.authorImgUrl
  ?? home?.authorImgUrl
  ?? site.value?.themeConfig?.authorImgUrl
  ?? '/imgs/author.jpg'
)

const show = computed(() => author.value || authorImgUrl.value)
</script>

<template>
  <div v-if="show" class="blog-author">
    <img v-if="authorImgUrl" :src="withBase(authorImgUrl)" alt="avatar">
    <p v-if="author">
      {{ author }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.blog-author {
  margin-bottom: 20px;

  img {
    display: block;
    margin: 10px auto;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background-color: rgba(var(--bg-gradient-home));
  }

  img:hover {
    transform: rotate(666turn);
    transition-duration: 59s;
    transition-timing-function: cubic-bezier(.34, 0, .84, 1)
  }

  p {
    text-align: center;
  }
}
</style>
