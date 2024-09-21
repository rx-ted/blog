<script lang="ts" setup>
import { ElButton, ElTag } from 'element-plus'
import { useData } from 'vitepress'
import { useBlogConfig } from '../config/blog'
import {
    useArticles,
    useConfig,
} from '../config/blog'
import { onMounted, nextTick, onBeforeUnmount, computed, ref } from 'vue';
import { tagsSvg } from '../constants/svg'
import { envConfig } from "../config/env";
const { frontmatter, site } = useData()
const { home } = useBlogConfig()
const homeTagsConfig = useConfig()?.config?.blog?.homeTags
const title = computed(() => (typeof homeTagsConfig === 'boolean' || !homeTagsConfig?.title)
    ? `${tagsSvg} 标签`
    : homeTagsConfig?.title
)
const tagType: any = ['', 'info', 'success', 'warning', 'danger']
const docs = useArticles()
const author = computed(() =>
    frontmatter.value.author
    ?? frontmatter.value?.blog?.author
    ?? home?.author
    ?? site.value.themeConfig?.blog?.author
)

interface articleConfig {
    title: string
    author: string
    date: string
    original: boolean
    route: string
    type: "danger" | 'primary'
    tags: string
}

interface tagListConfig {
    [key: string]: articleConfig[]
}

const tagList: tagListConfig = {}
docs.value.map(v => {
    if (v.meta.tag === undefined || v.meta.tag.length === 0) { return; }
    const tags = v.meta.tag;
    const title = v.meta.title
    const date = v.meta.date
    let original = false
    if (v.meta.original === undefined || v.meta.original === true) {
        original = true
    }
    let baseUrl;
    if (envConfig.baseUrl.endsWith('/')) {
        baseUrl = envConfig.baseUrl.slice(0, -1)
    }
    const route = baseUrl + v.route
    tags.forEach((tagName) => {
        if (!(tagName in tagList)) {
            tagList[tagName] = []
        }
        tagList[tagName].push({
            date: date,
            title: title,
            author: v.meta.author === undefined ? author.value : v.meta.author,
            original: original,
            type: original ? "danger" : "primary",
            route: route,
            tags: tags.join('·')
        });
    })
})

const dataList: { name: string, value: number }[] = []
Object.keys(tagList).forEach(name => {
    dataList.push({
        "name": name,
        "value": tagList[name].length
    });
})

// 渲染 WordCloud
let wordCloud;
onMounted(() => {
    nextTick(async () => {
        const g2plot = await import('@antv/g2plot')
        wordCloud = new g2plot.WordCloud("wordcloud-container", {
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
        });
        wordCloud.render();
    })
});


onBeforeUnmount(() => {
    if (wordCloud)
        wordCloud.destroy();
});

// 点击指定Tag后进行选中
let selectTag = ref<null | string>(null)
function toggleTag(tagTitle) {
    if (selectTag.value && selectTag.value == tagTitle) {
        selectTag.value = null;
    } else {
        selectTag.value = tagTitle;
    }
}

</script>

<template>
    <div class="main-container-tag">
        <!-- 头部 -->
        <span class="title svg-icon" v-html="title" />
        <!-- 标签云 -->
        <div id="wordcloud-container"></div>
        <div>
            <ElButton style="margin-left: 0px; margin-right: 10px; margin-top: 20px;"
                :type="tagType[idx % tagType.length] || 'primary'" round v-for="(value, tag_name, idx) in tagList"
                @click="toggleTag(tag_name)">{{ tag_name
                }} {{ value.length }}
            </ElButton>
        </div>
        <br>
        <div v-if="selectTag != null">
            <div>
                <span style="font-size:larger;">共 {{ tagList[selectTag].length }} 篇文章</span>
            </div>
            <div v-for="(item) in tagList[selectTag]">
                <div class="info-container">
                    <!-- 左侧信息 -->
                    <div class="info-part">
                        <!-- 标题 -->
                        <p class="title">
                            <a :href="item.route" target="_blank">{{ item.title }}</a>
                        </p>
                        <div class="badge-list">
                            <span class="split">
                                <ElTag :type="item.type">
                                    {{ item.original ? "原创" : "转载" }}
                                </ElTag>
                            </span>
                            <span v-show="item.author" class="split">{{ item.author }}</span>
                            <span class="split">{{ item.date }}</span>
                            <span class="split">{{ item.tags }}</span>
                        </div>
                    </div>
                </div>

                <div class="dashed"></div>
            </div>
        </div>
        <div v-else><b style="color:red">点击任意标签即可查看对应的文章。</b></div>
    </div>

</template>

<style lang="scss" scoped>
.info-container {
    display: flex;
    align-items: center;
    justify-content: flex-start;
}

.info-part {
    flex: 1;
}

.title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
}

.badge-list {
    font-size: 13px;
    color: var(--badge-font-color);
    margin-top: 8px;
    height: auto;

    .split:not(:last-child) {
        &::after {
            content: '';
            display: inline-block;
            width: 1px;
            height: 8px;
            margin: 0 10px;
            background-color: #4e5969;
        }
    }
}

.dashed {
    border-top: 1px dashed var(--el-border-color);
    margin-top: 10px;
    margin-bottom: 10px;
}
</style>
