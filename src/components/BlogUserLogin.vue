<template>
    <div class="container">
        <div class="form-box">
            <div class="form-header">
                <p class="title">欢迎登录</p>
                <p class="subtitle">每一次登录都是与你の邂逅。</p>
            </div>
            <form class="form-content">
                <div class="input-group">
                    <input placeholder="用户名" type="text" />
                </div>
                <div class="input-group">
                    <input placeholder="密码" type="password" />
                </div>
                <div class="options">
                    <label class="remember">
                        <input type="checkbox" />
                        <span>记住密码</span>
                    </label>
                    <div class="links">
                        <a href="#">忘记密码</a>
                        <span> / </span>
                        <a href="./register">注册</a>
                    </div>
                </div>
                <div class="submit-group">
                    <button type="submit">登 录</button>
                </div>

                <!-- ✅ 新增 自动登录 复选框 -->
                <div class="auto-login">
                    <label>
                        <input type="checkbox" />
                        <span>未注册账号后自动登录，且代表您已同意
                            <a href="#"> 用户使用和隐私</a>
                        </span>
                    </label>
                </div>

                <div class="sso-line">
                    <span class="sso-label">SSO 登录</span>
                    <div class="sso-icons">
                        <button type="button" class="sso-icon-btn" aria-label="GitHub 登录" @click="openGithub">
                            <img src="/imgs/github.svg" alt="GitHub" />
                        </button>
                        <button type="button" class="sso-icon-btn" aria-label="Gitee 登录" @click="openGitee">
                            <img src="/imgs/gitee.svg" alt="Gitee" />
                        </button>
                        <button type="button" class="sso-icon-btn" aria-label="Google 登录" @click="openGoogle">
                            <img src="/imgs/google.svg" alt="Google" />
                        </button>
                    </div>
                </div>
            </form>
        </div>
        <div class="image-box">
            <img src="/imgs/i-wuv-you-i-luv-u.gif" alt="" />
        </div>
    </div>
</template>

<script setup>
import data from '@/constants/data'
import { ElNotification } from 'element-plus'
import { showNotification } from '@/utils/common'

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

        input {
            width: 100%;
            padding: 12px 16px;
            border: var(--input-border);
            border-radius: 8px;
            outline: none;
            font-size: 1rem;
            transition: border-color 0.2s;

            &:focus {
                border-color: var(--input-border-focus);
                box-shadow: 0 0 0 1px var(--input-border-focus);
            }
        }
    }

    .options {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        flex-wrap: wrap;

        .remember {
            display: flex;
            align-items: center;

            input {
                margin-right: 8px;
            }

            span {
                color: #64748b;
            }
        }

        .links {
            a {
                color: var(--color-primary);
                text-decoration: none;

                &:hover {
                    text-decoration: underline;
                    color: var(--color-primary-hover);
                }
            }

            span {
                margin: 0 5px;
                color: #64748b;
            }
        }
    }

    .submit-group {
        button {
            width: 100%;
            padding: 12px 0;
            background: var(--color-primary);
            color: #fff;
            border: none;
            border-radius: 8px;
            font-size: 1.25rem;
            cursor: pointer;
            transition: background 0.2s;

            &:hover,
            &:focus {
                background: var(--color-primary-hover);
            }
        }
    }

    .auto-login {
        margin-top: 15px;

        label {
            display: flex;
            align-items: center;
            font-size: 0.875rem;
            color: #64748b;

            input {
                margin-right: 8px;
            }

            span {
                a {
                    color: var(--color-primary);

                    &:hover,
                    &:focus {
                        color: var(--color-primary-hover);
                    }
                }

            }


        }
    }

    .sso-line {
        margin-top: 30px;
        display: flex;
        align-items: center;
        justify-content: space-between;

        .sso-label {
            font-size: 1rem;
            color: var(--title-primary);
        }

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
                background: var(--icon-bg);
                cursor: pointer;
                transition: background 0.2s;

                img {
                    width: 20px;
                    height: 20px;
                }

                &:hover {
                    background: var(--icon-bg-hover);
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
