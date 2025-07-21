<script setup lang="ts">

import { onMounted } from 'vue'
import data from '@/constants/data'

onMounted(async () => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    if (code) {
        const res = await fetch(data.github.access_token_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // credentials: 'include',
            body: JSON.stringify({ code }),
        })
        const resp = await res.json()
        if (resp) {
            localStorage.setItem('token', JSON.stringify(resp))
            window.opener.postMessage({ type: 'github-auth-success' }, '*')
            window.close()
        } else {
            console.error('授权失败: ', resp)
        }
    }
})
</script>

<template>
    <div style="text-align:center;margin-top:100px;">
        <p>正在完成授权，请稍候...</p>
    </div>
</template>
