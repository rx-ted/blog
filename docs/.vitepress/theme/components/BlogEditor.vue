<template>
  <div v-if="isMobile" class="mobile-block" :class="{ dark: isDark }" :style="{ height: blockHeight }">
    <div class="mobile-message">{{ message }}</div>
  </div>
  <div v-else>
    <MdEditor v-model="state.text" :theme="themeMode" :style="{ height: blockHeight }" />
  </div>

</template>

<script lang="ts" setup>
import 'md-editor-v3/lib/style.css';
import { computed, reactive, onMounted, ref, onUnmounted } from 'vue';
import {  useWindowSize } from '@vueuse/core'
import { useData } from 'vitepress'
import { TEXT_web_editor_markdown } from "../constants/text";

import { MdEditor } from 'md-editor-v3';
const { isDark } = useData()
const { width,height } = useWindowSize()

const themeMode = computed(() => isDark.value ? "dark" : 'light');


const state = reactive({
  text: TEXT_web_editor_markdown,
});

const isMobile = ref(false);
const message = ref("📱 请在桌面端访问以获得更好体验")
const blockHeight = ref('85vh')

const update = () => {
  isMobile.value = width.value < 768
  blockHeight.value = `${height.value * 0.85}px`
}


onMounted(() => {
  update()
  window.addEventListener('resize', update)
})

onUnmounted(() => {
  window.removeEventListener('resize', update)
})

</script>

<style lang="scss" scoped>
.mobile-block {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  background: #f0f0f0;
  /* 默认亮色 */
}

.mobile-block.dark {
  background: #111;
  /* 暗色模式背景 */
}

.mobile-message {
  font-size: 1.5rem;
  color: #333;
  text-align: center;
  padding: 2rem;
  border: 2px dashed #888;
  border-radius: 12px;
  background: #fff;
  max-width: 80%;
}

.mobile-block.dark .mobile-message {
  background: #222;
  /* 暗色块 */
  color: #eee;
  /* 暗色文字 */
  border-color: #666;
}
</style>