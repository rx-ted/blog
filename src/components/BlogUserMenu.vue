<script setup lang="ts">
import { ref } from 'vue'
import { useData } from 'vitepress'
import { useAuthStore } from '@/stores/auth'
import BlogLoginModal from './BlogLoginModal.vue'
import { UserFilled } from '@element-plus/icons-vue'
import { ElIcon, ElAvatar } from 'element-plus'

const { isDark } = useData()

const showLogin = ref(false)
const showDropdown = ref(false)

const auth = useAuthStore()

const toggleLogin = () => {
    showLogin.value = true
}

const logout = () => {
    auth.logout()
    showDropdown.value = false
}

window.addEventListener('message', (event) => {
    if (event.data.type === 'github-auth-success') {
        auth.fetchMe()
    }
})

const windowOpen = () => {
    window.open(auth.user?.html_url, '_blank')
}

</script>

<template>
    <div class="user-menu">
        <template v-if="auth.isLoggedIn">
            <div class="avatar-wrapper" @mouseenter="showDropdown = true" @mouseleave="showDropdown = false">
                <el-avatar :src="auth.user?.avatar_url" :size="24" />
                <div v-if="showDropdown" class="dropdown" :class="{ dark: isDark }">
                    <el-avatar :src="auth.user?.avatar_url" class="dropdown-avatar" />
                    <p><strong>{{ auth.user?.name }}</strong></p>
                    <p>{{ auth.user?.email }}</p>
                    <div class="actions">
                        <button @click="windowOpen">主页</button>
                        <button @click="logout">注销</button>
                    </div>
                </div>
            </div>
        </template>

        <template v-else>
            <div class="avatar-wrapper" @click="toggleLogin">
                <el-icon>
                    <UserFilled />
                </el-icon>
            </div>
        </template>

        <BlogLoginModal v-model:show="showLogin" :isDark="isDark" />
    </div>
</template>

<style scoped>
.user-menu {
    display: inline-flex;
    align-items: center;
    position: relative;
    margin: 0px 8px;
}

.user-menu::before {
    content: "";
    display: inline-block;
    width: 1px;
    height: 24px;
    background-color: rgba(226, 226, 227, 0.2);
    margin-right: 8px;
    margin-left: 8px;
}

.avatar-wrapper {
    position: relative;
    cursor: pointer;
    display: inline-flex;
}

.dropdown {
    position: absolute;
    top: 40px;
    right: 0;
    width: 200px;
    background: #fff;
    border: 1px solid #eee;
    border-radius: 6px;
    padding: 16px;
    text-align: center;
    z-index: 100;
}

.dropdown.dark {
    background: #333;
    color: #fff;
    border-color: #555;
}

.dropdown-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    margin-bottom: 8px;
}

.dropdown p {
    margin: 4px 0;
    font-size: 14px;
    word-break: break-all;
}

.actions {
    margin-top: 12px;
    display: flex;
    justify-content: space-between;
}

.actions button {
    background: none;
    border: none;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 12px;
    border-radius: 4px;
    transition: background 0.2s;
}

.actions button:hover {
    background: #f0f0f0;
}

.dropdown.dark .actions button:hover {
    background: #444;
}
</style>
