<script setup lang="ts">
import { defineProps, defineEmits, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, ElButton, ElImage } from 'element-plus'
import data from '@/constants/data'

const props = defineProps<{ show: boolean; isDark: boolean }>()
const emit = defineEmits(['update:show'])

const close = () => {
    emit('update:show', false)
}

const loginWithGithub = () => {
    ElMessage({
        message: '我们不收集任何信息，请放心登录，谢谢。',
        type: 'info',
        duration: 3000,
    })
    const github_url = `${data.github.get_authorize_url}?client_id=${data.github.client_id}&redirect_uri=${data.github.redirect_uri}`
    window.open(github_url, '_blank')
}

const onMessage = (event: MessageEvent) => {
    if (event.data.type === 'github-auth-success') {
        emit('update:show', false)
    }
}

onMounted(() => {
    window.addEventListener('message', onMessage)
})
onBeforeUnmount(() => {
    window.removeEventListener('message', onMessage)
})
</script>

<template>
    <div v-if="props.show" class="custom-modal">
        <div class="custom-modal-content" :class="{ 'dark-mode': props.isDark }">
            <!-- 右上角关闭按钮 -->
            <button class="close-btn" @click="close">✕</button>

            <div class="modal-body">
                <!-- 左栏 -->
                <div class="left-pane">
                    <el-image :lazy=true src="/imgs/i-wuv-you-i-luv-u.gif" />
                </div>

                <!-- 右栏 -->
                <div class="right-pane">
                    <h3>使用 GitHub 登录</h3>
                    <el-button type="primary" size="large" @click="loginWithGithub">
                        GitHub 登录
                    </el-button>
                    <p class="tip">我们不收集任何信息，请放心登录，谢谢。</p>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.custom-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
}

.custom-modal-content {
    position: relative;
    width: 800px;
    height: 400px;
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    color: #333;
}

.custom-modal-content.dark-mode {
    background: #1e1e1e;
    color: #ddd;
}

.close-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    border: none;
    background: transparent;
    font-size: 20px;
    cursor: pointer;
    color: inherit;
}

.modal-body {
    display: flex;
    width: 100%;
    height: 100%;
}

.left-pane {
    flex: 1;
    background: #f5f5f5;
}

.custom-modal-content.dark-mode .left-pane {
    background: #333;
}

.right-pane {
    flex: 1;
    padding: 40px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.right-pane h3 {
    margin-bottom: 24px;
}

.tip {
    margin-top: 40px;
    font-size: 12px;
    color: #999;
    text-align: center;
}

.custom-modal-content.dark-mode .tip {
    color: #aaa;
}
</style>
