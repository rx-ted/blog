<template>
  <div v-if="isMobile" class="mobile-block" :class="{ dark: isDark }" :style="{ height: blockHeight }">
    <div class="mobile-message">{{ message }}</div>
  </div>
  <div v-else>
    <MdEditor v-model="state.text" :theme="themeMode" :style="{ height: blockHeight }" @on-save="onSave()"
      @on-upload-img="onUploadImg" />
  </div>

</template>

<script lang="ts" setup>
import 'md-editor-v3/lib/style.css';
import { computed, reactive, onMounted, ref, onUnmounted } from 'vue';
import { useWindowSize } from '@vueuse/core'
import { useData } from 'vitepress'
import { TEXT_web_editor_markdown } from "../constants/text";
import axios from 'axios'
import { MdEditor } from 'md-editor-v3';
import { uploadImg } from '../utils/common';
import { useBlogConfig } from '../config/blog';
const { isDark } = useData()
const { width, height } = useWindowSize()

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

const onSave = () => {
  console.log(1111)
  const config = useBlogConfig().github
  console.log(config)
  // uploadImg()
}
const onUploadImg = async (files, callback) => {
  const res = await Promise.all(
    files.map((file) => {
      return new Promise((rev, rej) => {
        const form = new FormData();
        form.append('file', file);
        axios
          .post('/api/img/upload', form, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          })
          .then((res) => rev(res))
          .catch((error) => rej(error));
      });
    }))
}

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