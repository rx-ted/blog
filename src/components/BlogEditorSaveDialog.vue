<template>
    <el-dialog v-model="dialogVisible" title="保存文章" width="500px" :close-on-click-modal="false">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
            <el-form-item label="文件名" prop="filename">
                <el-input v-model="form.filename" placeholder="请输入文章标题" />
            </el-form-item>

            <el-form-item label="标签">
                <el-select v-model="form.tags" multiple filterable allow-create default-first-option
                    placeholder="请输入或选择标签">
                    <el-option v-for="tag in form.tags" :key="tag" :label="tag" :value="tag" />
                </el-select>
            </el-form-item>

            <el-form-item label="分类" prop="category">
                <el-select v-model="form.category" placeholder="请选择分类">
                    <el-option label="随笔" value="随笔" />
                    <el-option label="生活" value="生活" />
                </el-select>
            </el-form-item>

            <el-form-item label="作者">
                <el-input v-model="form.author" placeholder="请输入作者名" />
            </el-form-item>

            <el-form-item label="日期">
                <el-date-picker v-model="form.date" type="date" disabled />
            </el-form-item>
        </el-form>

        <template #footer>
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="handleConfirm">确认</el-button>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, defineExpose } from 'vue'
import { ElMessage, FormInstance, ElDialog, ElForm, ElFormItem, ElInput, ElDatePicker, ElSelect, ElOption, ElButton, } from 'element-plus'
import { parseMD } from '@/utils/common';
import { useAuthStore } from '@/stores/auth';

const emit = defineEmits<{
    (e: 'confirm', data: typeof form): void
}>()

const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const auth = useAuthStore()
const form = reactive({
    filename: '',
    tags: [] as string[],
    category: '',
    author: '',
    date: new Date(),
})

const rules = {
    filename: [{ required: true, message: '请输入文件名', trigger: 'blur' }],
    category: [{ required: true, message: '请选择分类', trigger: 'change' }],
}

function show(content: string) {
    const result = parseMD(content);

    form.filename = result.attributes.title || ""
    form.tags = result.attributes.tags || []
    form.category = '随笔'
    form.author = result.attributes.author || auth.user?.name || ''
    form.date = new Date()
    dialogVisible.value = true
}

function handleConfirm() {
    formRef.value?.validate((valid) => {
        if (valid) {
            emit('confirm', { ...form })
            dialogVisible.value = false
        } else {
            ElMessage.warning('请填写完整信息')
        }
    })
}

defineExpose({ show })
</script>
