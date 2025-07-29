import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import data from '@/constants/data';
import axios from 'axios';
import { showNotification } from '@/utils/common';

export interface User {
    username: string;
    nickname?: string;
    description?: string;
    created_at: string;
    updated_at: string;
    login?: string;
    avatar_url?: string;
    name?: string;
    email?: string;
    html_url?: string;
}

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null);
    const isLoggedIn = computed(() => !!user.value);

    const fetchMe = async () => {
        const local_user = localStorage.getItem('user');
        if (!local_user) {
            try {
                const local_token = localStorage.getItem('token');
                if (!local_token) return;
                const response = await axios.get(data.user.get, {
                    headers: {
                        Authorization: `${local_token}`,
                    }
                });
                const resp = response.data.data;
                if (resp && resp.username) {
                    localStorage.setItem('user', JSON.stringify(resp));
                    user.value = resp;
                } else {
                    user.value = null;
                }
            } catch (err) {
                console.error('获取用户失败', err);
                user.value = null;
            }
        } else {
            const nickname = JSON.parse(local_user).nickname;
            showNotification('欢迎来到我的博客！随便转转，说不定有你喜欢的惊喜！', `Hello，${nickname} 👋`);
            user.value = JSON.parse(local_user);
        }

    };
    const logout = async () => {
        user.value = null;
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    };

    return {
        user,
        isLoggedIn,
        fetchMe,
        logout,
    };
});
