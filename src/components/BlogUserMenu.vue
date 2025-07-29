<script setup lang="ts">
import { useData } from 'vitepress'
import { useAuthStore } from '@/stores/auth'
import { ElIcon, ElAvatar, ElDropdown, ElDropdownItem, ElDropdownMenu, ElButton } from 'element-plus'
import { UserFilled } from '@element-plus/icons-vue'
import { showNotification } from '@/utils/common'
import Icon from './Icon.vue'
import { userSVG } from '../constants/svg'
const { isDark } = useData()
const auth = useAuthStore()

const windowOpen = () => {
    if (!auth.user?.html_url) {
        showNotification("还没有主页，暂不能跳转！", "主页地址")
        return;
    }
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
                <el-avatar v-if="auth.isLoggedIn && auth.user?.avatar_url" :src="auth.user?.avatar_url" :size="24" />
                <Icon v-else-if="auth.isLoggedIn || auth.user?.avatar_url" :size="20" :icon="userSVG" />
                <el-icon v-else>
                    <UserFilled />
                </el-icon>
            </span>

            <template #dropdown>
                <el-dropdown-menu :class="{ dark: isDark }">
                    <template v-if="auth.isLoggedIn">
                        <div class="dropdown-avatar-wrap">
                            <el-avatar v-if="auth.user?.avatar_url" :src="auth.user?.avatar_url"
                                class="dropdown-avatar" />
                            <!-- <el-avatar v-else class="dropdown-avatar" /> -->
                            <div v-else class="dropdown-avatar">
                                <Icon :size="70" :icon="userSVG" />
                            </div>
                            <p><strong>{{ auth.user?.name || auth.user?.nickname }}</strong></p>
                            <p>{{ auth.user?.email }}</p>
                        </div>
                        <el-dropdown-item @click="windowOpen"> <span class="dropdown-item-content">主页</span>
                        </el-dropdown-item>
                        <el-dropdown-item divided @click="logout"> <span class="dropdown-item-content">注销</span>
                        </el-dropdown-item>
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
    width: 150px;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.dropdown-avatar {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
}

.dropdown-avatar-wrap p {
    margin: 4px 0;
    font-size: 14px;
    word-break: break-all;

}

.dropdown-item-content {
    display: block;
    width: 100%;
    text-align: center;
}

.el-dropdown-menu.dark {
    background: #333;
    color: #fff;
}

.el-dropdown-menu.dark .el-dropdown-menu__item:hover {
    background: #444;
}
</style>
