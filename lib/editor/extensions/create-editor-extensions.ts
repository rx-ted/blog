import {
  CharacterCount,
  Color,
  HighlightExtension,
  StarterKit,
  TaskItem,
  TaskList,
  TextStyle,
  TiptapUnderline,
  createImageUpload,
  handleCommandNavigation,
  handleImageDrop,
  handleImagePaste,
} from 'novel'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import Youtube from '@tiptap/extension-youtube'
import GlobalDragHandle from 'tiptap-extension-global-drag-handle'
import AutoJoiner from 'tiptap-extension-auto-joiner'
import { Markdown } from 'tiptap-markdown'
import { DOMParser as PMDOMParser, DOMSerializer } from '@tiptap/pm/model'
import type { EditorView } from '@tiptap/pm/view'
import { TwitterNode } from '@/lib/editor/nodes/embeds/twitter-extension'
import { ResizableImage, type ResizableImageActionHandlers } from '@/lib/editor/nodes/image/resizable-image'
import { InlineMathNode, MathNode } from '@/lib/editor/nodes/math/math-extension'
import { AudioNode } from '@/lib/editor/nodes/media/audio-extension'
import { VideoNode } from '@/lib/editor/nodes/media/video-extension'
import { EditorLink } from '@/lib/editor-link'
import { hasMarkdownTable } from '@/lib/editor-utils'
import { hasEditorMarkdownMath, renderMarkdownToEditorHtml } from '@/lib/markdown'
import { shouldRunEditorCommandNavigation } from '@/lib/editor-keyboard'
import {
  WechatBadgeGroupNode,
  WechatCalloutNode,
  WechatImageSliderNode,
  WechatInfoGridNode,
  WechatProfileNode,
  WechatQRCodeNode,
} from '@/lib/editor/nodes/wechat/wechat-editor-nodes'
import { slashCommand } from '@/lib/editor/menus/suggestion-items'

const lowlight = createLowlight(common)
const COPY_URL_ATTRIBUTES = [
  ['img', 'src'],
  ['a', 'href'],
  ['audio', 'src'],
  ['video', 'src'],
  ['source', 'src'],
  ['iframe', 'src'],
] as const

function getEditorCopyBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || window.location.origin
}

function shouldAbsolutizeCopiedUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith('#')) return false
  if (/^(?:[a-z]+:|\/\/)/i.test(trimmed)) return false
  return true
}

function absolutizeCopiedHtmlUrls(root: HTMLElement, baseUrl: string) {
  for (const [selector, attribute] of COPY_URL_ATTRIBUTES) {
    for (const element of Array.from(root.querySelectorAll<HTMLElement>(selector))) {
      const value = element.getAttribute(attribute)
      if (!value || !shouldAbsolutizeCopiedUrl(value)) continue
      element.setAttribute(attribute, new URL(value, baseUrl).toString())
    }
  }
}

function handleEditorCopy(view: EditorView, event: ClipboardEvent) {
  const { state } = view
  const { selection } = state
  if (selection.empty || !event.clipboardData) return false

  const slice = selection.content()
  const container = document.createElement('div')
  const serializer = DOMSerializer.fromSchema(state.schema)
  container.appendChild(serializer.serializeFragment(slice.content, { document }))
  absolutizeCopiedHtmlUrls(container, getEditorCopyBaseUrl())

  const html = container.innerHTML
  if (!html.trim()) return false

  event.preventDefault()
  event.clipboardData.setData('text/html', html)
  event.clipboardData.setData('text/plain', state.doc.textBetween(selection.from, selection.to, '\n\n'))
  return true
}

export interface EditorExtensionOptions {
  imageActions?: ResizableImageActionHandlers
}

export function createEditorExtensions(options: EditorExtensionOptions = {}) {
  return [
    StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: false }),
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: 'plaintext',
      HTMLAttributes: { class: 'code-block-lowlight' },
    }),
    TextStyle,
    Color,
    HighlightExtension,
    CharacterCount,
    ResizableImage.configure({ imageActions: options.imageActions ?? {} } as never),
    TiptapUnderline,
    EditorLink.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: false, HTMLAttributes: { class: 'tiptap-table' } }),
    TableRow,
    TableCell,
    TableHeader,
    Youtube.configure({
      inline: false,
      ccLanguage: 'zh',
      interfaceLanguage: 'zh',
    }),
    TwitterNode,
    MathNode,
    InlineMathNode,
    AudioNode,
    VideoNode,
    WechatCalloutNode,
    WechatProfileNode,
    WechatQRCodeNode,
    WechatBadgeGroupNode,
    WechatInfoGridNode,
    WechatImageSliderNode,
    Markdown.configure({ html: true, transformPastedText: true, transformCopiedText: true }),
    GlobalDragHandle.configure({
      dragHandleWidth: 36,
      scrollTreshold: 100,
      customNodes: [
        'image',
        'video',
        'audio',
        'twitter',
        'math',
        'wechatCallout',
        'wechatProfile',
        'wechatQRCode',
        'wechatBadgeGroup',
        'wechatInfoGrid',
        'wechatImageSlider',
      ],
    }),
    AutoJoiner.configure({
      elementsToJoin: ['bulletList', 'orderedList'],
    }),
    slashCommand,
  ]
}

export const editorExtensions = createEditorExtensions()

export function buildEditorProps(
  onImageUpload?: (file: File) => Promise<string>,
  onNonImageFile?: (file: File) => void,
  contentClassName = '',
  onCompositionEnd?: (view: EditorView) => void,
) {
  const collectFiles = (listLike: FileList | File[] | null | undefined) => {
    if (!listLike) return [] as File[]

    const files = Array.from(listLike)
    const seen = new Set<string>()

    return files.filter((file) => {
      const key = `${file.name}:${file.size}:${file.type}:${file.lastModified}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  const getClipboardFiles = (event: ClipboardEvent) => {
    const files: File[] = []
    const items = event.clipboardData?.items

    if (items) {
      for (const item of Array.from(items)) {
        if (item.kind !== 'file') continue
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }

    return collectFiles(files.length > 0 ? files : event.clipboardData?.files)
  }

  const getDroppedFiles = (event: DragEvent) => collectFiles(event.dataTransfer?.files)

  const uploadFn = onImageUpload
    ? createImageUpload({
        onUpload: async (file) => {
          const url = await onImageUpload(file)
          return url
        },
      })
    : undefined

  return {
    handlePaste: (view: EditorView, event: ClipboardEvent) => {
      const files = getClipboardFiles(event)
      if (files.length > 0) {
        if (onNonImageFile) {
          event.preventDefault()
          event.stopPropagation()
          files.forEach((currentFile) => onNonImageFile(currentFile))
          return true
        }

        const [file] = files

        if (files.length === 1 && file.type.startsWith('image/') && file.size <= 100 * 1024 * 1024 && uploadFn) {
          if (handleImagePaste(view, event, uploadFn)) return true
        }

        event.preventDefault()
        event.stopPropagation()
        return true
      }

      const plainText = event.clipboardData?.getData('text/plain') ?? ''
      if (hasMarkdownTable(plainText) || hasEditorMarkdownMath(plainText)) {
        event.preventDefault()
        const html = renderMarkdownToEditorHtml(plainText)
        const { state, dispatch } = view
        const wrapper = document.createElement('div')
        wrapper.innerHTML = html
        const slice = PMDOMParser.fromSchema(state.schema).parseSlice(wrapper)
        const tr = state.tr.replaceSelection(slice)
        dispatch(tr)
        return true
      }

      const htmlContent = event.clipboardData?.getData('text/html') ?? ''
      if (htmlContent && (
        htmlContent.includes('<style') ||
        htmlContent.includes('class=') ||
        htmlContent.includes('mso-') ||
        htmlContent.includes('data-') ||
        /style\s*=\s*["'][^"']*["']/.test(htmlContent)
      )) {
        event.preventDefault()
        const wrapper = document.createElement('div')
        wrapper.innerHTML = htmlContent
        const allElements = wrapper.querySelectorAll('*')
        allElements.forEach((el) => {
          el.removeAttribute('style')
          el.removeAttribute('class')
          el.removeAttribute('id')
          Array.from(el.attributes).forEach((attr) => {
            if (attr.name.startsWith('data-')) {
              el.removeAttribute(attr.name)
            }
          })
        })

        wrapper.querySelectorAll('style').forEach((el) => el.remove())

        const { state, dispatch } = view
        const slice = PMDOMParser.fromSchema(state.schema).parseSlice(wrapper)
        const tr = state.tr.replaceSelection(slice)
        dispatch(tr)
        return true
      }

      return false
    },
    handleDrop: (view: EditorView, event: DragEvent, _slice: unknown, moved: boolean) => {
      const files = getDroppedFiles(event)
      if (files.length === 0) return false

      if (onNonImageFile) {
        event.preventDefault()
        event.stopPropagation()
        files.forEach((currentFile) => onNonImageFile(currentFile))
        return true
      }

      const [file] = files

      if (files.length === 1 && file.type.startsWith('image/') && file.size <= 100 * 1024 * 1024 && uploadFn) {
        if (handleImageDrop(view, event, moved, uploadFn)) return true
      }

      event.preventDefault()
      event.stopPropagation()
      return true
    },
    handleDOMEvents: {
      compositionend: (view: EditorView) => {
        if (onCompositionEnd) queueMicrotask(() => onCompositionEnd(view))
        return false
      },
      keydown: (_view: unknown, event: KeyboardEvent) => handleEditorCommandNavigation(event),
      copy: (view: EditorView, event: ClipboardEvent) => handleEditorCopy(view, event),
      click: (_view: unknown, event: MouseEvent) => {
        if (event.metaKey || event.ctrlKey) {
          const target = event.target as HTMLElement
          const anchor = target.closest('a[href]')
          if (anchor) {
            event.preventDefault()
            window.open((anchor as HTMLAnchorElement).href, '_blank', 'noopener')
          }
        }
      },
    },
    attributes: { class: ['novel-prose', contentClassName].filter(Boolean).join(' ') },
  }
}

function handleEditorCommandNavigation(event: KeyboardEvent) {
  if (!shouldRunEditorCommandNavigation(event)) return false
  return handleCommandNavigation(event) ?? false
}
