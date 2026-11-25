'use client'

import {
  Command as SlashCommand,
  createSuggestionItems,
  renderItems,
  type SuggestionItem,
} from 'novel'
import { PanelsTopLeft } from 'lucide-react'
import { createDefaultTableContent } from '@/lib/editor-utils'
import {
  type InputModalDetail,
  type TriggerCollageModalDetail,
  type TriggerImageGenerationDetail,
  TRIGGER_COLLAGE_MODAL_EVENT,
  TRIGGER_FILE_UPLOAD_EVENT,
  TRIGGER_IMAGE_GENERATION_EVENT,
  TRIGGER_IMAGE_UPLOAD_EVENT,
  TRIGGER_INPUT_MODAL_EVENT,
} from '@/lib/editor-events'
import {
  createWechatBadgeGroupContent,
  createWechatCalloutContent,
  createWechatImageSliderContent,
  createWechatInfoGridContent,
  createWechatProfileContent,
  createWechatQRCodeContent,
} from '@/lib/editor/nodes/wechat/wechat-editor-nodes'

export function CommandIcon({ label }: { label: string }) {
  return (
    <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-[var(--editor-line)] bg-[var(--editor-panel)] px-2 text-[11px] font-semibold tracking-wide text-[var(--editor-ink)]">
      {label}
    </span>
  )
}

export const suggestionItems = createSuggestionItems([
  {
    title: '正文',
    description: '切回普通段落继续写作。',
    searchTerms: ['text', 'paragraph', 'p'],
    icon: <CommandIcon label="T" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run()
    },
  },
  {
    title: '二级标题',
    description: '插入中等层级的小节标题。',
    searchTerms: ['heading', 'h2', 'subtitle'],
    icon: <CommandIcon label="H2" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run()
    },
  },
  {
    title: '三级标题',
    description: '插入更细一级的小标题。',
    searchTerms: ['heading', 'h3', 'small'],
    icon: <CommandIcon label="H3" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run()
    },
  },
  {
    title: '项目列表',
    description: '创建无序列表。',
    searchTerms: ['bullet', 'list', 'unordered'],
    icon: <CommandIcon label="•" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run()
    },
  },
  {
    title: '编号列表',
    description: '创建带顺序的编号列表。',
    searchTerms: ['ordered', 'list', 'number'],
    icon: <CommandIcon label="1." />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run()
    },
  },
  {
    title: '待办列表',
    description: '插入可以勾选的任务清单。',
    searchTerms: ['todo', 'task', 'checkbox'],
    icon: <CommandIcon label="[]" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run()
    },
  },
  {
    title: '引用',
    description: '高亮一段需要单独强调的话。',
    searchTerms: ['quote', 'blockquote'],
    icon: <CommandIcon label='"' />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setParagraph()
        .toggleBlockquote()
        .run()
    },
  },
  {
    title: '代码块',
    description: '插入一段多行代码。',
    searchTerms: ['code', 'snippet', 'codeblock'],
    icon: <CommandIcon label="</>" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
    },
  },
  {
    title: 'Mermaid 流程图',
    description: '插入可渲染的 Mermaid 图表代码块。',
    searchTerms: ['mermaid', 'diagram', 'flowchart', '流程图', '图表'],
    icon: <CommandIcon label="M" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'codeBlock',
          attrs: { language: 'mermaid' },
          content: [{ type: 'text', text: 'graph TD\n  A --> B' }],
        })
        .run()
    },
  },
  {
    title: '表格',
    description: '插入一个 3×3 的表格。',
    searchTerms: ['table', 'grid'],
    icon: <CommandIcon label="▦" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(createDefaultTableContent())
        .run()
    },
  },
  {
    title: '公众号提示块',
    description: '发布到公众号时渲染为醒目的提示卡片。',
    searchTerms: ['wechat', 'note', 'callout', 'alert', '提示', '公众号'],
    icon: <CommandIcon label="!" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(createWechatCalloutContent('note'))
        .run()
    },
  },
  {
    title: '公众号警告块',
    description: '发布到公众号时渲染为风险或注意事项卡片。',
    searchTerms: [
      'wechat',
      'warning',
      'risk',
      'alert',
      '注意',
      '风险',
      '公众号',
    ],
    icon: <CommandIcon label="⚠" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(createWechatCalloutContent('warning'))
        .run()
    },
  },
  {
    title: '公众号结论块',
    description: '发布到公众号时渲染为结论强调块。',
    searchTerms: ['wechat', 'conclusion', 'summary', '结论', '总结', '公众号'],
    icon: <CommandIcon label="✓" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(createWechatCalloutContent('conclusion'))
        .run()
    },
  },
  {
    title: '作者卡',
    description: '插入公众号作者介绍卡。',
    searchTerms: ['wechat', 'profile', 'author', '作者', '名片', '公众号'],
    icon: <CommandIcon label="乔" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(createWechatProfileContent())
        .run()
    },
  },
  {
    title: '二维码卡',
    description: '插入公众号二维码引导卡。',
    searchTerms: ['wechat', 'qr', 'qrcode', '二维码', '关注', '公众号'],
    icon: <CommandIcon label="QR" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(createWechatQRCodeContent())
        .run()
    },
  },
  {
    title: '徽章组',
    description: '插入适合公众号摘要信息的标签徽章。',
    searchTerms: ['wechat', 'badge', 'tag', '标签', '徽章', '公众号'],
    icon: <CommandIcon label="#" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(createWechatBadgeGroupContent())
        .run()
    },
  },
  {
    title: '信息网格',
    description: '插入发布到公众号时更好读的信息卡组。',
    searchTerms: ['wechat', 'grid', 'info', 'card', '信息', '卡片', '公众号'],
    icon: <CommandIcon label="▤" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(createWechatInfoGridContent())
        .run()
    },
  },
  {
    title: '滑动图组',
    description: '插入发布到公众号时可横向滑动的图片组。',
    searchTerms: [
      'wechat',
      'slider',
      'gallery',
      'image',
      '图集',
      '滑动',
      '公众号',
    ],
    icon: <CommandIcon label="⇄" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(createWechatImageSliderContent())
        .run()
    },
  },
  {
    title: '分隔线',
    description: '用一条线把内容切成两个段落。',
    searchTerms: ['divider', 'hr', 'line'],
    icon: <CommandIcon label="—" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run()
    },
  },
  {
    title: '生成图片',
    description: '调用 AI 生图并插入当前位置。',
    searchTerms: [
      'generate',
      'image',
      'ai',
      'illustration',
      '生图',
      '生成图片',
      '插图',
      'mondo',
    ],
    icon: <CommandIcon label="AI" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()

      window.dispatchEvent(
        new CustomEvent<TriggerImageGenerationDetail>(
          TRIGGER_IMAGE_GENERATION_EVENT,
          {
            detail: {
              insertPos: range.from,
              selectedText: '',
            },
          },
        ),
      )
    },
  },
  {
    title: '图片',
    description: '从本地上传图片。',
    searchTerms: ['image', 'photo', 'picture', 'upload', '图片'],
    icon: <CommandIcon label="🖼" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()
      window.dispatchEvent(new CustomEvent(TRIGGER_IMAGE_UPLOAD_EVENT))
    },
  },
  {
    title: '拼图',
    description: '合成多张图片后插入。',
    searchTerms: [
      'collage',
      'compose',
      'canvas',
      '拼图',
      '合图',
      '组图',
      '长图',
      '图片拼接',
    ],
    icon: <PanelsTopLeft className="h-4 w-4 text-[var(--editor-ink)]" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()
      window.dispatchEvent(
        new CustomEvent<TriggerCollageModalDetail>(
          TRIGGER_COLLAGE_MODAL_EVENT,
          {
            detail: {
              insertPos: range.from,
            },
          },
        ),
      )
    },
  },
  {
    title: 'YouTube',
    description: '嵌入 YouTube 视频。',
    searchTerms: ['youtube', 'video', '视频'],
    icon: <CommandIcon label="▶" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()
      window.dispatchEvent(
        new CustomEvent<InputModalDetail>(TRIGGER_INPUT_MODAL_EVENT, {
          detail: {
            title: '嵌入 YouTube 视频',
            placeholder: '请粘贴 YouTube 视频链接',
            callback: (url) => editor.commands.setYoutubeVideo({ src: url }),
          },
        }),
      )
    },
  },
  {
    title: 'Twitter',
    description: '嵌入 Twitter/X 推文。',
    searchTerms: ['twitter', 'tweet', 'x', '推文'],
    icon: <CommandIcon label="𝕏" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()
      window.dispatchEvent(
        new CustomEvent<InputModalDetail>(TRIGGER_INPUT_MODAL_EVENT, {
          detail: {
            title: '嵌入 Twitter/X 推文',
            placeholder: '请粘贴推文链接',
            callback: (url) =>
              editor.commands.insertContent({
                type: 'twitter',
                attrs: { src: url },
              }),
          },
        }),
      )
    },
  },
  {
    title: '上传文件',
    description: '上传视频、音频、PDF、电子书等文件。',
    searchTerms: [
      'file',
      'upload',
      'video',
      'audio',
      'pdf',
      'epub',
      '文件',
      '视频',
      '音频',
      '上传',
    ],
    icon: <CommandIcon label="📎" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()
      window.dispatchEvent(new CustomEvent(TRIGGER_FILE_UPLOAD_EVENT))
    },
  },
  {
    title: '数学公式',
    description: '插入 LaTeX 数学公式。',
    searchTerms: ['math', 'formula', 'latex', 'katex', '公式', '数学'],
    icon: <CommandIcon label="∑" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()
      editor.commands.insertContent({
        type: 'mathBlock',
        attrs: { latex: '', displayMode: true },
      })
    },
  },
] satisfies SuggestionItem[])

export const slashCommand = SlashCommand.configure({
  suggestion: { items: () => suggestionItems, render: renderItems },
})
