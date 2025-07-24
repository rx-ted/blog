<script lang="ts" setup>
import { useWindowSize } from '@vueuse/core'
import { MdEditor } from 'md-editor-v3'
import { useData } from 'vitepress'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { TEXT_web_editor_markdown } from '@/constants/text'
import 'md-editor-v3/lib/style.css'

const { isDark } = useData()
const { width, height } = useWindowSize()

const themeMode = computed(() => isDark.value ? 'dark' : 'light')

const state = reactive({
  text: TEXT_web_editor_markdown,
})

const isMobile = ref(false)
const message = ref('📱 请在桌面端访问以获得更好体验')
const blockHeight = ref('85vh')

function update() {
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

function onSave() {
  console.log(1111)
  // uploadImg()
}
async function onUploadImg() {

}
</script>

<template>
  <div class="container">
    <div v-if="isMobile" class="mobile-block" :class="{ dark: isDark }" :style="{ height: blockHeight }">
      <div class="mobile-message">
        {{ message }}
      </div>
    </div>
    <div v-else>
      <MdEditor v-model="state.text" :theme="themeMode" :style="{ height: blockHeight }" @on-save="onSave()"
        @on-upload-img="onUploadImg" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.container {
  background: rgba(var(--bg-gradient-home));

}

.mobile-block {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.mobile-message {
  font-size: 1.5rem;
  color: #333;
  text-align: center;
  padding: 2rem;
  border: 2px dashed #888;
  border-radius: 12px;
  max-width: 80%;
}

.mobile-block.dark .mobile-message {
  color: #eee;
  border-color: #666;
}
</style>
