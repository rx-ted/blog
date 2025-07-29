-- Active: 1753160770755@@mysql2.sqlpub.com@3307@db_blog_for_rx_ted
<template>
    <div class="container">
        <div class="form-box">
            <div class="form-header">
                <p class="title">欢迎登录</p>
                <p class="subtitle">每一次登录都是与你の邂逅。</p>
            </div>

            <el-form class="form-content" :model="userForm">
                <el-form-item class="input-group" :error="usernameError">
                    <el-input size="large" v-model="userForm.username" placeholder="用户名" type="text"
                        @input="validateUsername" />
                </el-form-item>
                <el-form-item class="input-group" :error="passwordError">
                    <el-input size="large" v-model="userForm.password" placeholder="密码" type="password" show-password
                        @input="validatePassword" />
                </el-form-item>
                <el-form-item class="options">
                    <div class="options-inner">
                        <div class="left">
                            <el-checkbox v-model="userForm.isRemeber"><el-text>记住密码</el-text></el-checkbox>
                        </div>

                        <div class="right">
                            <el-link href="#" @click="forgetPassword" type="primary">忘记密码</el-link>
                            <span> / </span>
                            <el-link href="./register" @click="forgetPassword" type="primary">注册</el-link>
                        </div>

                    </div>

                </el-form-item>

                <el-button size="large" class="submit-group" type="primary" @click="handleSubmit">登 录</el-button>

                <div class="auto-login">
                    <el-checkbox v-model="userForm.isRead" />
                    <el-text class="auto-login-text">
                        未注册账号后自动登录，且代表您已同意
                    </el-text>
                    <el-link href="#" type="primary">用户使用和隐私说明</el-link>
                </div>

                <div class="sso-line">
                    <el-text>SSO 登录</el-text>
                    <div class="sso-icons">

                        <el-button circle @click="openGithub" aria-label="GitHub 登录" class="sso-icon-btn">
                            <img src="/imgs/github.svg" alt="GitHub" class="sso-icon-img" />
                        </el-button>

                        <el-button circle @click="openGitee" aria-label="Gitee 登录" class="sso-icon-btn">
                            <img src="/imgs/gitee.svg" alt="Gitee" class="sso-icon-img" />
                        </el-button>

                        <el-button circle @click="openGoogle" aria-label="Google 登录" class="sso-icon-btn">
                            <img src="/imgs/google.svg" alt="Google" class="sso-icon-img" />
                        </el-button>

                    </div>
                </div>
            </el-form>
        </div>
        <div class="image-box">
            <img src="/imgs/i-wuv-you-i-luv-u.gif" alt="" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";
import { ElForm, ElFormItem, ElInput, ElCheckbox, ElLink, ElButton, ElText } from "element-plus";
import data from '@/constants/data'
import { showNotification } from '@/utils/common'
import axios from "axios";
import { useAuthStore } from "@/stores/auth";

const userForm = reactive({
    username: '',
    password: '',
    isRemeber: false,
    isRead: true
});

const openGithub = () => {
    const redirectWithType = `${data.github.redirect_uri}?type=github`
    const github_url = `${data.github.get_authorize_url}?client_id=${data.github.client_id}&redirect_uri=${redirectWithType}`
    window.open(github_url, '_blank')
}

const openGitee = () => {
    showNotification()
}

const openGoogle = () => {
    showNotification()
}

const forgetPassword = () => {
    showNotification()
}



const usernameError = ref('')
const passwordError = ref('')


const validateUsername = () => {
    const pattern = /^[A-Za-z0-9_]{4,20}$/

    if (userForm.username === '') {
        usernameError.value = '请输入用户名'
        return false
    }

    if (!pattern.test(userForm.username)) {
        usernameError.value = '用户名只能包含字母、数字、下划线，且长度 4~20'
        return false
    } else {
        usernameError.value = ''
        return true
    }
}


// 密码校验
const validatePassword = () => {
    const pattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+=-]{6,20}$/

    if (userForm.password === '') {
        passwordError.value = '请输入密码'
        return false
    }

    if (!pattern.test(userForm.password)) {
        passwordError.value = '密码需包含字母和数字，长度 6~20'
        return false
    } else {
        passwordError.value = ''
        return true
    }
}


const handleSubmit = async () => {
    if (!validateUsername() || !validatePassword()) return


    const jsonData = {
        type: "password",
        username: userForm.username,
        password: userForm.password,

    }
    console.log(jsonData)
    const response = await axios.post(data.auth.login, jsonData)

    if (response.status !== 200) {
        showNotification("无效请求");
        return;
    }

    localStorage.setItem('token', JSON.stringify(response.data))
    window.open('/', "_self")
}

onMounted(() => {
    const auth = useAuthStore();
    console.log(auth.user)
    if (!auth.user) {
        auth.fetchMe()
    }
    if (auth.user)
        window.open('/', '_self');
});

</script>

<style lang="scss" scoped>
.container {
    display: flex;
    max-width: 1024px;
    margin: 100px auto;
    box-shadow: var(--box-shadow);
    border-radius: 10px;
    overflow: visible;
}

.form-box {
    flex: 1;
    padding: 40px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: var(--bg-gradient-home);
}

.form-header {
    margin-bottom: 30px;

    .title {
        font-size: 2rem;
        color: var(--title-primary);
        margin-bottom: 10px;
    }

    .subtitle {
        color: var(--title-secondary);
    }
}

.form-content {
    display: flex;
    flex-direction: column;

    .input-group {
        margin-bottom: 20px;
    }

    .options {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        flex-wrap: wrap;

        .options-inner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;

            .left {
                display: flex;
                align-items: center;
            }

            .right {
                display: flex;
                align-items: center;
                gap: 4px;
            }
        }
    }

    .auto-login {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        font-size: 14px;
        margin-top: 10px;

        .auto-login-text {
            margin: 0 10px;
        }

    }

    .sso-line {
        margin-top: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;

        .sso-icons {
            display: flex;
            gap: 12px;

            .sso-icon-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 40px;
                border: 1px solid var(--input-border);
                border-radius: 50%;
                cursor: pointer;
                transition: background 0.2s;

                img {
                    width: 20px;
                    height: 20px;
                }
            }
        }
    }
}

.image-box {
    flex: 1;
    background: var(--bg-gradient);
    display: none;

    @media (min-width: 1024px) {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    img {
        width: 100%;
        margin-top: -10rem;
    }
}
</style>
