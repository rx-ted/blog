<template>
    <div class="card">
        <div class="cursor-style cursor" :style="{ marginLeft: isLogin ? '200px' : 0 }">
            <div class="pic">
                <img :style="{ opacity: isLogin ? 1 : 0 }" src="/imgs/flower1.png" alt="" class="register-img">
                <img :style="{ opacity: isLogin ? 0 : 1 }" src="/imgs/flower2.png" alt="" class="login-img">
            </div>
            <div class="btn">
                <div @click="changeStatus" class="change">{{ !isLogin ? "登录" : "注册" }}</div>
            </div>
        </div>
        <div class="cursor-style cursor-shadow-1" :style="{ marginLeft: isLogin ? '200px' : 0 }"></div>
        <div class="cursor-style cursor-shadow-2" :style="{ marginLeft: isLogin ? '200px' : 0 }"></div>
        <div class="content">
            <div class="form login">
                <div class="title"><span>登</span><span>录</span></div>
                <div class="content">
                    <el-form :rules="userRules" ref="LoginFormRef" :model="loginForm" class="data-form" status-icon>
                        <el-form-item prop="username">
                            <el-input v-model="loginForm.username" clearable placeholder="请输入用户名" class="input" />
                        </el-form-item>
                        <el-form-item prop="password">
                            <el-input v-model="loginForm.password" clearable placeholder="请输入密码" show-password
                                class="input" />
                        </el-form-item>
                        <div class="captcha-con">
                            <el-form-item prop="captcha">
                                <el-input v-model="loginForm.captcha" clearable placeholder="请输入验证码" class="input" />
                            </el-form-item>
                            <el-form-item>
                                <el-button type="primary" @click="getCaptchaByUsername(loginForm.username)"
                                    style="height: 30px;font-size: 14px;width: 50px;"
                                    :disabled="countOfCaptchaByUsername !== 0">{{
                                        countOfCaptchaByUsername === 0 ? "获取" : countOfCaptchaByUsername }}</el-button>
                            </el-form-item>
                        </div>
                        <el-form-item>
                            <el-button type="primary" style="height: 34px;font-size: 16px;width: 100%;"
                                @click="formSubmit(LoginFormRef, props.doLogin, loginForm)">登录</el-button>
                        </el-form-item>
                    </el-form>
                </div>
            </div>
            <div class="form register">
                <div class="title"><span>注</span><span>册</span></div>
                <div class="content">
                    <el-form ref="RegisterFormRef" :rules="userRules" :model="registerForm" class="data-form"
                        status-icon>
                        <el-form-item prop="username">
                            <el-input v-model="registerForm.username" clearable placeholder="请输入用户名" class="input" />
                        </el-form-item>
                        <el-form-item prop="email">
                            <el-input v-model="registerForm.email" clearable placeholder="请输入邮箱" class="input" />
                        </el-form-item>
                        <el-form-item prop="nickname">
                            <el-input v-model="registerForm.nickname" clearable placeholder="请输入昵称" class="input" />
                        </el-form-item>
                        <el-form-item prop="password">
                            <el-input v-model="registerForm.password" clearable placeholder="请输入密码" show-password
                                class="input" />
                        </el-form-item>
                        <div class="captcha-con">
                            <el-form-item prop="captcha">
                                <el-input v-model="registerForm.captcha" clearable placeholder="请输入验证码" class="input" />
                            </el-form-item>
                            <el-form-item>
                                <el-button type="primary" @click="getCaptchaByEmail(registerForm.email)"
                                    style="height: 30px;font-size: 14px;width: 50px;"
                                    :disabled="countOfCaptchaByEmail !== 0">{{
                                        countOfCaptchaByEmail === 0 ? "获取" : countOfCaptchaByEmail }}</el-button>
                            </el-form-item>
                        </div>
                        <el-form-item>
                            <el-button type="primary" style="height: 34px;font-size: 16px;width: 100%;"
                                @click="formSubmit(RegisterFormRef, props.doRegister, registerForm)">注册</el-button>
                        </el-form-item>
                    </el-form>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ElMessage, FormInstance, FormRules, ElForm, ElFormItem,ElInput,ElButton } from 'element-plus';
import { reactive, ref, defineProps } from 'vue';

const LoginFormRef = ref<FormInstance>();
const RegisterFormRef = ref<FormInstance>();

const isLogin = ref<boolean>(true);
let couldChangeStatus = true;
const changeStatus = () => {
    if (couldChangeStatus) {
        isLogin.value = !isLogin.value;
        couldChangeStatus = false;
        setTimeout(() => {
            couldChangeStatus = true;
            if (isLogin.value) {
                clearUserForm(registerForm);
                RegisterFormRef.value?.clearValidate();
            } else {
                clearUserForm(loginForm);
                LoginFormRef.value?.clearValidate();
            }
        }, 500);
    }
}

function clearUserForm(form: IUserForm) {
    form.captcha = "";
    form.username = "";
    form.password = "";
    form.email = "";
    form.nickname = "";
}

// 登录
export interface IUserForm {
    username: string;
    password: string;
    captcha: string;
    nickname: string;
    email: string;
}
const props = defineProps({
    UsernamePattern: {
        default: /^[a-zA-Z0-9]{6,18}$/,
        type: RegExp
    },
    PasswordPattern: {
        default: /^[a-zA-Z0-9]{6,18}$/,
        type: RegExp,
    },
    CaptchaPattern: {
        default: /^[a-zA-Z0-9]{6}$/,
        type: RegExp,
    },
    EmailPattern: {
        default: /^[A-Za-z0-9\u4e00-\u9fa5]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/,
        type: RegExp,
    },
    NicknamePattern: {
        default: /^.{6,18}$/,
        type: RegExp,
    },
    // 通过用户名获取验证码
    doGetCaptchaByUsername: {
        default: (username: string): boolean => {
            console.log(`通过用户名：${username}发送成功！`);
            return true;
        },
        type: Function
    },
    // 通过邮箱获取验证码
    doGetCaptchaByEmail: {
        default: (email: string): boolean => {
            console.log(`通过邮箱：${email}发送成功！`)
            return true;
        },
        type: Function
    },
    //注册提交
    doRegister: {
        default: (data: IUserForm) => console.log("注册数据:", data),
        type: Function
    },
    //登录提交
    doLogin: {
        default: (data: IUserForm) => console.log("登录数据:", data),
        type: Function
    },
    //验证码获取间隔
    captchaInterval: {
        default: 30,
        type: Number
    }
})

const userRules = reactive<FormRules<IUserForm>>({
    username: [
        { required: true, message: '请输入用户名', trigger: 'blur' },
        { pattern: props.UsernamePattern, message: '用户名格式错误', trigger: 'blur' },
    ],
    password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { pattern: props.PasswordPattern, message: '密码格式错误', trigger: 'blur' },
    ],
    captcha: [
        { required: true, message: '请输入验证码', trigger: 'blur' },
        { pattern: props.CaptchaPattern, message: '验证码格式错误', trigger: 'blur' },
    ],
    nickname: [
        { required: true, message: '请输入昵称', trigger: 'blur' },
        { pattern: props.NicknamePattern, message: '昵称格式错误', trigger: 'blur' },
    ],
    email: [
        { required: true, message: '请输入邮箱', trigger: 'blur' },
        { pattern: props.EmailPattern, message: '邮箱格式错误', trigger: 'blur' },
    ]
})

const loginForm = reactive<IUserForm>({} as IUserForm);
const countOfCaptchaByUsername = ref(0);
let lastGetCaptchaByUsername = 0;
let timerOfCaptchaByUsername: NodeJS.Timeout;
async function getCaptchaByUsername(username: string) {
    if (countOfCaptchaByUsername.value !== 0) return;
    if (props.UsernamePattern.test(username) && username !== undefined) {
        if (await props.doGetCaptchaByUsername(username))
            startCountingOfUsername();
    } else {
        ElMessage.warning("请输入正确的用户名");
    }
}

function startCountingOfUsername() {
    lastGetCaptchaByUsername = Date.now();
    clearInterval(timerOfCaptchaByUsername);
    timerOfCaptchaByUsername = setInterval(() => {
        countOfCaptchaByUsername.value = props.captchaInterval - Math.floor((Date.now() - lastGetCaptchaByUsername) / 1000);
        if (countOfCaptchaByUsername.value <= 0) {
            clearInterval(timerOfCaptchaByUsername);
        }
    }, 500)
}

async function formSubmit(form: FormInstance | undefined, action: Function, args: IUserForm) {
    if (!form) return
    await form.validate((valid) => {
        if (valid) {
            action(args)
        } else {
            ElMessage.warning("请检查数据")
        }
    })
}

// 注册
const registerForm = reactive<IUserForm>({} as IUserForm);
const countOfCaptchaByEmail = ref(0);
let lastGetCaptchaByEmail = 0;
let timerOfCaptchaByEmail: NodeJS.Timeout;
async function getCaptchaByEmail(email: string) {
    if (countOfCaptchaByEmail.value !== 0) return;
    if (props.EmailPattern.test(email) && email !== undefined) {
        if (await props.doGetCaptchaByEmail(email))
            startCountingOfEmail();
    } else {
        ElMessage.warning("请输入正确的邮箱");
    }
}

function startCountingOfEmail() {
    lastGetCaptchaByEmail = Date.now();
    clearInterval(timerOfCaptchaByEmail);
    timerOfCaptchaByEmail = setInterval(() => {
        countOfCaptchaByEmail.value = props.captchaInterval - Math.floor((Date.now() - lastGetCaptchaByEmail) / 1000);
        if (countOfCaptchaByEmail.value <= 0) {
            clearInterval(timerOfCaptchaByEmail);
        }
    }, 500)
}

</script>
<style scoped>
.card {
    width: 400px;
    aspect-ratio: 1;
    position: relative;
    background: linear-gradient(to bottom right, #9EDBC8, rgb(255, 233, 192));
    border-radius: 5px;

    .cursor-style {
        width: 180px;
        height: 400px;
        position: absolute;
        top: -20px;
        left: 10px;
        border-radius: 5px;
        z-index: 99;
        background: linear-gradient(to bottom right, #C5DB53, rgb(255, 217, 192));
    }

    .cursor-shadow-1 {
        opacity: 0.8;
        transition: all 0.5s linear;
        z-index: 88;
    }

    .cursor-shadow-2 {
        opacity: 0.6;
        transition: all 0.6s linear;
        z-index: 77;
    }

    .cursor {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-sizing: border-box;
        padding: 20px 10px;
        transition: all 0.4s linear;
        z-index: 99;

        .pic {
            width: 100%;
            height: 80%;
            box-sizing: border-box;
            position: relative;
            filter: saturate(1.7);

            img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: all 0.5s linear;
                position: absolute;
            }
        }

        .btn {
            width: 100%;
            height: 15%;
            border-top: solid 1px #666;
            box-sizing: border-box;
            display: flex;
            justify-content: center;
            align-items: center;

            .change {
                font-size: 20px;
                color: #333;
                padding: 0 10px;
                border-bottom: solid 1px #333;

                &:hover {
                    cursor: pointer;
                    color: #000;
                    border-color: #000;
                }
            }
        }
    }

    >.content {
        width: 100%;
        height: 100%;
        display: flex;
        position: relative;

        &::after {
            content: "";
            display: block;
            width: 1px;
            height: 90%;
            background-color: #333;
            position: absolute;
            left: 50%;
            top: 5%;
        }

        .form {
            width: 50%;
            box-sizing: border-box;
            padding: 10px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;

            .title {
                width: 100%;
                height: 20%;
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 30px;
                gap: 20px;
                position: relative;

                &::after {
                    content: "";
                    display: block;
                    width: 100%;
                    height: 1.5px;
                    background-color: #333;
                    position: absolute;
                    bottom: 0;
                    animation: baiLoginTitleAnim 3s linear infinite alternate;
                }
            }

            .content {
                width: 100%;
                height: 76%;
                box-sizing: border-box;
                overflow: hidden;
                display: flex;
                align-items: center;

                .data-form {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 0 10px;

                    .input {
                        height: 30px;
                        font-size: 14px;
                    }

                    .captcha-con {
                        width: 100%;
                        display: flex;
                        gap: 10px;
                    }
                }
            }
        }
    }
}

@keyframes baiLoginTitleAnim {
    from {
        width: 20px;
    }

    to {
        width: 100%;
    }
}
</style>