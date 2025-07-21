import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import data from '@/constants/data';

export interface User {
    id: number
    login: string
    name: string
    email?: string
    avatar_url?: string
    html_url?: string
}

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null);
    const isLoggedIn = computed(() => !!user.value);
    const fetchMe = async () => {
        try {
            const session_token = localStorage.getItem('token');
            if (!session_token) return;
            const token_json = JSON.parse(session_token);
            const token = token_json.access_token;
            if (!token) return;
            const res = await fetch(data.github.get_user_url, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
                // credentials: 'include',
            });
            const resp = await res.json();
            if (resp && resp.id) {
                localStorage.setItem('user', JSON.stringify(resp));
                user.value = resp;
            } else {
                user.value = null;

            }
        } catch (err) {
            console.error('获取用户失败', err);
            user.value = null;
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
