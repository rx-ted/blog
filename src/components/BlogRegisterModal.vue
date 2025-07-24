<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue'
import { ElMessage, ElButton, ElInput, ElImage, ElCheckbox } from 'element-plus'

const props = defineProps<{ show: boolean; isDark: boolean }>()
const emit = defineEmits(['update:show', 'open-login'])

const username = ref('')
const password = ref('')

const agreed = ref(false)

const close = () => emit('update:show', false)

const register = () => {
    if (!agreed.value) {
        ElMessage.warning('请勾选协议')
        return
    }
    ElMessage.success(`注册成功：${username.value}`)
}
</script>

<template>
    <div v-if="props.show" class="custom-modal">
        <div class="custom-modal-content">
            <button class="close-btn" @click="close">✕</button>
            <div class="modal-body">
                <div class="left-pane">
                    <el-image :lazy="true" src="/imgs/i-wuv-you-i-luv-u.gif" />
                </div>

                <div class="right-pane">
                    <h3 class="modal-title">注册账号</h3>

                    <div class="input-group">
                        <el-input v-model="username" placeholder="请输入用户名" clearable class="input-field" />
                    </div>
                    <div class="input-group">
                        <el-input v-model="password" type="password" placeholder="请输入密码" clearable
                            class="input-field" />
                    </div>

                    <el-checkbox v-model="agreed" class="agree-checkbox">
                        已阅读并同意
                        <a href="/terms" target="_blank">使用说明</a> 和
                        <a href="/privacy" target="_blank">隐私政策</a>
                    </el-checkbox>

                    <el-button type="primary" class="action-btn" @click="register">注册</el-button>


                    <div class="switch-tip">
                        已有账号？<el-button type="text" @click="emit('open-login'); close()">去登录</el-button>
                    </div>


                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.custom-modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
}

.custom-modal-content {
    width: 800px;
    height: 400px;
    display: flex;
    overflow: hidden;
    position: relative;
    border-radius: 8px;
    background: #fff;
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
    font-size: 20px;
    border: none;
    background: transparent;
    cursor: pointer;
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
    align-items: center;
}

.modal-title {
    font-size: 20px;
    font-weight: bold;
    text-align: center;
    margin-bottom: 24px;
}

.sso-row {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-bottom: 16px;
}

.sso-btn {
    display: flex;
    align-items: center;
    padding: 0 16px;
}

.sso-icon {
    width: 20px;
    height: 20px;
    margin-right: 8px;
}

.divider {
    font-size: 12px;
    color: #999;
    margin: 16px 0;
    text-align: center;
}

.input-group {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-bottom: 12px;
}

.input-field {
    width: 90%;
    max-width: 400px;
}


.input-field :deep(.el-input__inner) {
    border: 2px solid #ccc;
    border-radius: 4px;
    transition: all 0.3s;
}

.input-field :deep(.el-input__inner):focus {
    border-color: #409EFF;
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
    background: #f0faff;
}

.custom-modal-content.dark-mode .input-field :deep(.el-input__inner) {
    background: #2a2a2a;
    color: #fff;
    border: 1px solid #555;
}

.custom-modal-content.dark-mode .input-field :deep(.el-input__inner):focus {
    border-color: #409EFF;
    background: #333;
}

.action-btn {
    width: 90%;
    margin: 12px 0;
}

.switch-tip {
    font-size: 12px;
    color: #999;
}

.agree-checkbox {
    margin-top: 8px;
    font-size: 12px;
}

.agree-checkbox a {
    color: #409EFF;
    text-decoration: underline;
}
</style>
