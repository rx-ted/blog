<script setup lang="ts">

import { onMounted } from 'vue'
import data from '@/constants/data'
import { showNotification } from '@/utils/common'
import axios from 'axios'

onMounted(async () => {
    const url = new URL(window.location.href)
    const type = url.searchParams.get('type')

    if (type === 'github') {
        const code = url.searchParams.get('code')
        if (code) {
            const res = await axios.post(data.auth.login, {
                code,
                type: 'github'
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            console.log(res);
            const resp = await res.data.data
            if (resp.token) {
                localStorage.setItem('token', resp.token)
                window.opener.postMessage({ type: 'login-success' }, '*')
                window.close()
            } else {
                console.error('授权失败: ', resp)
            }
        }
    }
    else {
        showNotification()
    }


})
</script>

<template>
    <div style="text-align:center;margin-top:100px;">
        <p>正在完成授权，请稍候...</p>
    </div>
</template>
