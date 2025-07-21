<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useBackToTopConfig, useOpenBackToTop } from '@/theme/blog'
import { useElementSize, useScroll } from '@vueuse/core'
import Icon from '@/components/Icon.vue'
import { backRoTopSVG } from '@/constants/svg'

function handleBackRoTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const $vpDoc = document.querySelector('.vp-doc')
const el = ref<any>($vpDoc)
const { width } = useElementSize(el)
const docWidth = computed(() => `${width.value}px`)

const backToTopConfig = useBackToTopConfig()
const open = useOpenBackToTop()

const { y } = useScroll(window)
const defaultTriggerHeight = 450
const triggerTop = computed(() => backToTopConfig.value?.top ?? defaultTriggerHeight)

const show = computed(() => width && y.value > triggerTop.value)

const iconSVGStr = computed(() => backToTopConfig?.value?.icon).value  || backRoTopSVG
</script>

<template>
  <div v-if="open" v-show="show" class="back-to-top">
    <span class="icon-wrapper" @click="handleBackRoTop">
      <Icon :size="20" :icon="iconSVGStr">
      </Icon>
    </span>
  </div>
</template>

<style lang="scss" scoped>
.back-to-top {
  position: fixed;
  width: v-bind(docWidth);
  text-align: right;
  bottom: 80px;
  font-size: 16px;
  transition: all 0.3s ease-in-out;
  opacity: 0.6;
  display: flex;
  justify-content: right;
  z-index: 200;

  &:hover {
    opacity: 1;
  }

  .icon-wrapper {
    cursor: pointer;
    border-radius: 50%;
    position: relative;
    right: -80px;
    background-color: var(--vp-c-bg);
    box-shadow: var(--box-shadow);
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--vp-c-brand-soft);
    color: var(--vp-c-brand-1);

    &:hover {
      box-shadow: var(--box-shadow-hover);
    }
  }
}

@media screen and (max-width: 1200px) {
  .back-to-top .icon-wrapper {
    border-radius: 50%;
    position: static;
  }
}
</style>
