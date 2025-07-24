<script setup lang="ts">
import { useData } from 'vitepress'
import { useAuthStore } from '@/stores/auth'
import { ElIcon, ElAvatar, ElDropdown, ElDropdownItem, ElDropdownMenu, ElButton } from 'element-plus'
import { UserFilled } from '@element-plus/icons-vue'

const { isDark } = useData()
const auth = useAuthStore()

const windowOpen = () => {
    window.open(auth.user?.html_url, '_blank')
}

const logout = () => {
    auth.logout()
}

const goToLogin = () => {
    window.open('/modules/utils/login', '_self')
}

window.addEventListener('message', (event) => {
    if (event.data.type === 'login-success') {
        auth.fetchMe()
        window.open('/', '_self')
    }
})
</script>

<template>
    <div class="user-menu">
        <el-dropdown trigger="click" placement="bottom-end">
            <span class="avatar-wrapper">
                <el-avatar v-if="auth.isLoggedIn" :src="auth.user?.avatar_url" :size="24" />
                <el-icon v-else>
                    <UserFilled />
                </el-icon>
            </span>

            <template #dropdown>
                <el-dropdown-menu :class="{ dark: isDark }">
                    <template v-if="auth.isLoggedIn">
                        <div class="dropdown-avatar-wrap">
                            <el-avatar :src="auth.user?.avatar_url" class="dropdown-avatar" />
                            <p><strong>{{ auth.user?.name }}</strong></p>
                            <p>{{ auth.user?.email }}</p>
                        </div>
                        <el-dropdown-item @click="windowOpen">主页</el-dropdown-item>
                        <el-dropdown-item divided @click="logout">注销</el-dropdown-item>
                    </template>

                    <template v-else>
                        <div class="dropdown-avatar-wrap">
                            <p>您尚未登录</p>
                            <el-button type="primary" size="small" @click="goToLogin">
                                立即登录
                            </el-button>
                        </div>
                    </template>
                </el-dropdown-menu>
            </template>
        </el-dropdown>
    </div>
</template>

<style scoped>
.user-menu {
    display: inline-flex;
    align-items: center;
    position: relative;
    margin: 0 8px;
}

.user-menu::before {
    content: "";
    display: inline-block;
    width: 1px;
    height: 24px;
    background-color: rgba(226, 226, 227, 0.2);
    margin: 0 8px;
}

.avatar-wrapper {
    cursor: pointer;
    display: inline-flex;
}

.dropdown-avatar-wrap {
    text-align: center;
    padding: 12px;
}

.dropdown-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    margin-bottom: 8px;
}

.dropdown-avatar-wrap p {
    margin: 4px 0;
    font-size: 14px;
    word-break: break-all;
}

.el-dropdown-menu.dark {
    background: #333;
    color: #fff;
}

.el-dropdown-menu.dark .el-dropdown-menu__item:hover {
    background: #444;
}
</style>
