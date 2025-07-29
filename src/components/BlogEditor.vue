<script lang="ts" setup>
import { useWindowSize } from '@vueuse/core'
import { MdEditor } from 'md-editor-v3'
import { useData } from 'vitepress'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { TEXT_web_editor_markdown } from '@/constants/text'
import 'md-editor-v3/lib/style.css'
import BlogEditorSaveDialog from './BlogEditorSaveDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { getYYYYMMDD, showNotification } from '@/utils/common'
import axios from 'axios'
import data from '@/constants/data'

const { isDark } = useData()
const { width, height } = useWindowSize()

const themeMode = computed(() => isDark.value ? 'dark' : 'light')

const state = reactive({
  text: TEXT_web_editor_markdown,
})

const isMobile = ref(false)
const message = ref('📱 请在桌面端访问以获得更好体验')
const blockHeight = ref('85vh')

function update() {
  isMobile.value = width.value < 768
  blockHeight.value = `${height.value * 0.85}px`
}

let token: string = '';
onMounted(() => {
  update()
  window.addEventListener('resize', update)

  if (!auth.user?.name) {
    showNotification("需要登陆或者绑定GitHub后才可以操作保存文件", "登陆")
  }
  const localToken = localStorage.getItem('token');
  if (localToken) {
    token = localToken;
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', update)
})

const saveDialogRef = ref<InstanceType<typeof BlogEditorSaveDialog>>()
const auth = useAuthStore();

function onSave() {
  saveDialogRef.value?.show(state.text)
}

function onFinalSubmit(formData: {
  filename: string
  tags: string[]
  category: string
  author: string
  date: Date
}) {

  const form = new FormData();
  const file = new File([state.text], formData.filename.endsWith('.md') ? formData.filename : formData.filename + '.md', {
    type: "text/markdown",
    lastModified: Date.now(),
  });
  const filename = `${getYYYYMMDD}/${file.name}`;
  form.append('file', file);
  form.append('filename', 'notes/posts/articles/' + filename);
  form.append('owner', 'rx-ted');
  form.append('repo', 'blog');
  form.append('isCover', "false");
  form.append('useDatePrefix', "false");

  axios.post(data.github.upload_file,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `${token}`
      },
    }).then(response => {
      if (response.data.success === true) {
        showNotification("保存成功,请稍等几分钟，就可以看文章。", "文章");
        // 延迟 5 秒后跳转到首页
        setTimeout(() => {
          window.location.href = "/";  // 或者使用 window.location.replace("/")
        }, 5000);
      }
    }).catch(error => {
      console.log(error)
      showNotification("保存失败，请重试", "文章");
    })
}
const uploadInfo = {
  owner: "rx-ted",
  repo: "picx-images-hosting",
  isCover: false,
  useDatePrefix: false
}
// 
const onUploadImg = async (files: File[], callback: Function) => {
  const res = await Promise.all(
    files.map((file: File) => {
      return new Promise((rev, rej) => {

        // 20240123/${file.name}
        const filename = `${getYYYYMMDD}/${file.name}`;

        const form = new FormData();
        form.append('file', file);
        form.append('filename', filename);
        form.append('owner', uploadInfo.owner);
        form.append('repo', uploadInfo.repo);
        form.append('isCover', String(uploadInfo.isCover));
        form.append('useDatePrefix', String(uploadInfo.useDatePrefix));

        axios
          .post(`${data.github.upload_file}`, form, {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `${token}`,
            },
          })
          .then((res) => {
            if (res.data.success === true) {
              rev({
                url: `https://${uploadInfo.owner}.github.io/${uploadInfo.repo}/${filename}`
              })
            }
          })
          .catch((error) => {
            console.log(error)
            rej(error)

          });
      });
    })
  );
  callback(res.map((item: any) => item.url));
};
</script>

<template>
  <div class="container">
    <div v-if="isMobile" class="mobile-block" :class="{ dark: isDark }" :style="{ height: blockHeight }">
      <div class="mobile-message">
        {{ message }}
      </div>
    </div>
    <div v-else>
      <MdEditor v-model="state.text" :theme="themeMode" :style="{ height: blockHeight }" @on-save="onSave()"
        @on-upload-img="onUploadImg" />
      <BlogEditorSaveDialog ref="saveDialogRef" @confirm="onFinalSubmit" />


    </div>
  </div>
</template>

<style lang="scss" scoped>
.container {
  background: rgba(var(--bg-gradient-home));

}

.mobile-block {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.mobile-message {
  font-size: 1.5rem;
  color: #333;
  text-align: center;
  padding: 2rem;
  border: 2px dashed #888;
  border-radius: 12px;
  max-width: 80%;
}

.mobile-block.dark .mobile-message {
  color: #eee;
  border-color: #666;
}
</style>
