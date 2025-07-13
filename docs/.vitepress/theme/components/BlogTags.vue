<script lang="ts" setup>
import { ElButton, ElTag, ElLink } from 'element-plus'
import { useData } from 'vitepress'
import { useBlogConfig, useArticles, useConfig } from '../config/blog'
import { onMounted, nextTick, onBeforeUnmount, computed, ref } from 'vue'
import { envConfig } from '../config/env'

const { frontmatter, site } = useData()
const { home } = useBlogConfig()

const homeTagsConfig = useConfig()?.config?.blog?.homeTags
const title = computed(() =>
    typeof homeTagsConfig === 'boolean' || !homeTagsConfig?.title
        ? `🏷️ 标签`
        : homeTagsConfig?.title
)

const tagType: string[] = ['', 'info', 'success', 'warning', 'danger']
const docs = useArticles()

const author = computed(
    () =>
        frontmatter.value.author ??
        frontmatter.value?.blog?.author ??
        home?.author ??
        site.value.themeConfig?.blog?.author
)

interface ArticleConfig {
    title: string
    author: string
    date: string
    original: boolean
    route: string
    type: 'danger' | 'primary'
    tags: string
}

interface TagListConfig {
    [key: string]: ArticleConfig[]
}

const tagList: TagListConfig = {}

docs.value.forEach(v => {
    if (!v.meta.tag || v.meta.tag.length === 0) return

    const tags = v.meta.tag
    const title = v.meta.title
    const date = v.meta.date
    const original = v.meta.original === undefined || v.meta.original === true

    const baseUrl = envConfig.baseUrl.endsWith('/')
        ? envConfig.baseUrl.slice(0, -1)
        : envConfig.baseUrl

    const route = v.route.endsWith('.html')
        ? baseUrl + v.route
        : baseUrl + v.route + '.html'

    tags.forEach(tagName => {
        if (!tagList[tagName]) {
            tagList[tagName] = []
        }
        tagList[tagName].push({
            date,
            title,
            author: v.meta.author ?? author.value,
            original,
            type: original ? 'danger' : 'primary',
            route,
            tags: tags.join('·'),
        })
    })
})

const dataList = Object.keys(tagList).map(name => ({
    name,
    value: tagList[name].length,
}))

// WordCloud
let wordCloud: any

onMounted(() => {
    nextTick(async () => {
        const g2plot = await import('@antv/g2plot')
        wordCloud = new g2plot.WordCloud('wordcloud-container', {
            data: dataList,
            wordField: 'name',
            weightField: 'value',
            colorField: 'name',
            height: 150,
            wordStyle: {
                fontFamily: 'Verdana',
                fontSize: [14, 35],
                rotation: 0,
            },
            random: () => 0.5,
        })
        wordCloud.render()
    })
})

onBeforeUnmount(() => {
    wordCloud?.destroy()
})

// 点击标签
const selectTag = ref<null | string>(null)
function toggleTag(tag: string) {
    selectTag.value = selectTag.value === tag ? null : tag
}
</script>

<template>
    <div class="main-container">
        <span class="title" v-html="title" />

        <div id="wordcloud-container" class="wordcloud" />

        <div class="tag-buttons">
            <ElButton v-for="(value, tag_name, idx) in tagList" :key="tag_name"
                :type="tagType[idx % tagType.length] || 'primary'" round @click="toggleTag(tag_name)">
                {{ tag_name }} {{ value.length }}
            </ElButton>
        </div>

        <div v-if="selectTag" class="tag-articles">
            <div class="summary">
                共 {{ tagList[selectTag].length }} 篇文章
            </div>

            <div v-for="item in tagList[selectTag]" :key="item.route" class="info-container">
                <div class="info-part">
                    <ElLink :href="item.route" target="_blank">
                        {{ item.title }}
                    </ElLink>
                    <div class="badge-list">
                        <span class="split">
                            <ElTag :type="item.type">
                                {{ item.original ? '原创' : '转载' }}
                            </ElTag>
                        </span>
                        <span class="split" v-if="item.author">{{ item.author }}</span>
                        <span class="split">{{ item.date }}</span>
                        <span class="split">{{ item.tags }}</span>
                    </div>
                </div>
                <div class="dashed"></div>
            </div>
        </div>

        <div v-else class="no-select">
            <b>点击任意标签查看对应文章</b>
        </div>
    </div>
</template>
<style lang="scss" scoped>
.main-container {
    max-width: 800px;
    margin: 0 auto;
    text-align: center;

    .title {
        font-size: 20px;
        font-weight: 600;
        display: flex;
        margin: 20px 0;
    }

    .wordcloud {
        margin: 0 auto;
    }

    .tag-buttons {
        margin-top: 20px;

        .el-button {
            margin: 5px 8px;
        }
    }

    .tag-articles {
        margin-top: 30px;

        .summary {
            font-size: 16px;
            margin-bottom: 10px;
            text-align: left;
        }

        .info-container {
            border-top: 1px dashed var(--el-border-color);
            padding: 10px 0;

            .info-part {
                text-align: left;

                a {
                    display: inline-block;
                    font-weight: 600;
                    font-size: 16px;
                    color: var(--el-link-color);
                }
            }
        }
    }

    .badge-list {
        font-size: 13px;
        margin-top: 6px;

        .split:not(:last-child)::after {
            content: '';
            display: inline-block;
            width: 1px;
            height: 10px;
            margin: 0 8px;
            background-color: #4e5969;
        }
    }

    .no-select {
        margin-top: 20px;
        color: red;
    }
}
</style>
