'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Fragment } from '@tiptap/pm/model'
import { DOMSerializer } from '@tiptap/pm/model'
import {
  AlignLeft,
  Braces,
  CheckSquare,
  Code2,
  Copy,
  FileUp,
  Heading2,
  Heading3,
  ImageIcon,
  ImagePlus,
  Library,
  List,
  ListOrdered,
  MessageSquareText,
  PanelTop,
  Pilcrow,
  Plus,
  Quote,
  Sigma,
  Sparkles,
  Table2,
  Trash2,
  WandSparkles,
} from 'lucide-react'
import { useEditor, type EditorInstance } from 'novel'
import { useToast } from '@/components/Toast'
import {
  type InputModalDetail,
  type TriggerAIModalDetail,
  type TriggerImageToolDetail,
  TRIGGER_AI_MODAL_EVENT,
  TRIGGER_FILE_UPLOAD_EVENT,
  TRIGGER_IMAGE_TOOL_EVENT,
  TRIGGER_IMAGE_UPLOAD_EVENT,
  TRIGGER_INPUT_MODAL_EVENT,
} from '@/lib/editor-events'
import { formatChineseCopywritingInEditor } from '@/lib/editor-extensions'
import { getTopLevelTargetFromDoc, type BlockActionTarget } from '@/lib/editor-block-target'
import { createDefaultTableContent, normalizeUrl } from '@/lib/editor-utils'
import {
  createWechatBadgeGroupContent,
  createWechatCalloutContent,
  createWechatImageSliderContent,
  createWechatInfoGridContent,
  createWechatProfileContent,
  createWechatQRCodeContent,
} from '@/lib/editor/nodes/wechat/wechat-editor-nodes'

type BlockMenuState = {
  open: boolean
  x: number
  y: number
  target: BlockActionTarget | null
}

type InsertPlacement = 'above' | 'below'

type PendingHandlePress = {
  handle: HTMLElement
  startX: number
  startY: number
  target: BlockActionTarget
}

const CLOSED_MENU: BlockMenuState = {
  open: false,
  x: 0,
  y: 0,
  target: null,
}

const BLOCK_MENU_WIDTH = 292
const BLOCK_INSERT_MENU_WIDTH = 244
const BLOCK_MENU_MAX_HEIGHT = 560
const HANDLE_CLICK_MOVE_THRESHOLD = 5

function clampMenuPosition(x: number, y: number, width = BLOCK_MENU_WIDTH) {
  if (typeof window === 'undefined') return { x, y }

  return {
    x: Math.max(12, Math.min(x, window.innerWidth - width - 12)),
    y: Math.max(12, Math.min(y, window.innerHeight - BLOCK_MENU_MAX_HEIGHT - 12)),
  }
}

function resolveBlockActionTarget(editor: EditorInstance, handle: HTMLElement): BlockActionTarget | null {
  const handleRect = handle.getBoundingClientRect()
  const editorRect = editor.view.dom.getBoundingClientRect()
  const y = handleRect.top + handleRect.height / 2
  const leftInset = Math.min(96, Math.max(24, editorRect.width * 0.08))
  const attempts = [
    { left: editorRect.left + leftInset, top: y },
    { left: editorRect.left + Math.min(220, Math.max(48, editorRect.width / 3)), top: y },
    { left: editorRect.left + editorRect.width / 2, top: y },
    { left: Math.max(editorRect.left + 12, handleRect.right + 24), top: y },
  ]

  for (const coords of attempts) {
    const result = editor.view.posAtCoords(coords)
    if (!result) continue

    const target = getTopLevelTargetFromDoc(editor.state.doc, result.inside >= 0 ? result.inside : result.pos)
    if (target) return target
  }

  return null
}

function getTargetText(editor: EditorInstance, target: BlockActionTarget) {
  const from = Math.max(target.contentFrom, target.pos)
  const to = Math.max(from, target.contentTo)
  return editor.state.doc.textBetween(from, to, '\n\n').trim()
}

function focusTarget(editor: EditorInstance, target: BlockActionTarget) {
  editor.chain().focus().setTextSelection(target.textPos).run()
}

function getInsertPos(target: BlockActionTarget, placement: InsertPlacement) {
  return placement === 'above' ? target.pos : target.pos + target.node.nodeSize
}

function createInsertContent(kind: string) {
  switch (kind) {
    case 'paragraph':
      return { type: 'paragraph' }
    case 'h2':
      return { type: 'heading', attrs: { level: 2 } }
    case 'h3':
      return { type: 'heading', attrs: { level: 3 } }
    case 'bullet':
      return {
        type: 'bulletList',
        content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
      }
    case 'ordered':
      return {
        type: 'orderedList',
        content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
      }
    case 'quote':
      return { type: 'blockquote', content: [{ type: 'paragraph' }] }
    case 'codeBlock':
      return { type: 'codeBlock' }
    case 'table':
      return createDefaultTableContent()
    case 'math':
      return { type: 'mathBlock', attrs: { latex: '', displayMode: true } }
    case 'wechatNote':
      return createWechatCalloutContent('note')
    case 'wechatWarning':
      return createWechatCalloutContent('warning')
    case 'wechatConclusion':
      return createWechatCalloutContent('conclusion')
    case 'wechatProfile':
      return createWechatProfileContent()
    case 'wechatQRCode':
      return createWechatQRCodeContent()
    case 'wechatBadges':
      return createWechatBadgeGroupContent()
    case 'wechatGrid':
      return createWechatInfoGridContent()
    case 'wechatSlider':
      return createWechatImageSliderContent()
    default:
      return { type: 'paragraph' }
  }
}

function copyBlockToClipboard(editor: EditorInstance, target: BlockActionTarget) {
  const serializer = DOMSerializer.fromSchema(editor.state.schema)
  const container = document.createElement('div')
  container.appendChild(serializer.serializeFragment(Fragment.from(target.node), { document }))
  const html = container.innerHTML
  const text = target.node.textContent || ''

  if (navigator.clipboard && 'ClipboardItem' in window) {
    const clipboardItem = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([text], { type: 'text/plain' }),
    })
    return navigator.clipboard.write([clipboardItem])
  }

  return navigator.clipboard.writeText(text || html)
}

function BlockMenuButton({
  children,
  danger = false,
  disabled = false,
  icon,
  onClick,
}: {
  children: React.ReactNode
  danger?: boolean
  disabled?: boolean
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition ${
        danger
          ? 'text-rose-600 hover:bg-rose-50'
          : 'text-[var(--editor-ink)] hover:bg-[var(--editor-soft)]'
      } disabled:cursor-not-allowed disabled:opacity-45`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--editor-muted)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  )
}

function BlockInlineButton({
  active = false,
  children,
  onClick,
  title,
}: {
  active?: boolean
  children: React.ReactNode
  onClick: () => void
  title: string
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold transition ${
        active
          ? 'bg-[var(--editor-accent)]/10 text-[var(--editor-accent)]'
          : 'text-[var(--editor-ink)] hover:bg-[var(--editor-soft)]'
      }`}
    >
      {children}
    </button>
  )
}

function BlockInsertButton({
  children,
  icon,
  onClick,
}: {
  children: React.ReactNode
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)]"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--editor-muted)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  )
}

export function BlockHandleMenu() {
  const { editor } = useEditor()
  const toast = useToast()
  const menuRef = useRef<HTMLDivElement>(null)
  const insertMenuRef = useRef<HTMLDivElement>(null)
  const dragInProgressRef = useRef(false)
  const pendingHandlePressRef = useRef<PendingHandlePress | null>(null)
  const [menu, setMenu] = useState<BlockMenuState>(CLOSED_MENU)
  const [insertPlacement, setInsertPlacement] = useState<InsertPlacement | null>(null)

  const closeMenu = useCallback(() => {
    setMenu(CLOSED_MENU)
    setInsertPlacement(null)
    document.querySelectorAll<HTMLElement>('.drag-handle').forEach((handle) => {
      handle.classList.remove('menu-open')
    })
  }, [])

  useEffect(() => {
    if (!editor) return

    const openMenuForHandle = (handle: HTMLElement, target: BlockActionTarget) => {
      const rect = handle.getBoundingClientRect()
      const position = clampMenuPosition(rect.right + 8, rect.top - 8)
      document.querySelectorAll<HTMLElement>('.drag-handle').forEach((candidate) => {
        candidate.classList.toggle('menu-open', candidate === handle)
      })
      setInsertPlacement(null)
      setMenu({
        open: true,
        x: position.x,
        y: position.y,
        target,
      })
    }

    const getHandlePress = (event: PointerEvent): PendingHandlePress | null => {
      if (!(event.target instanceof HTMLElement)) return null

      const handle = event.target.closest<HTMLElement>('.drag-handle')
      if (!handle) return null

      const editorHost = editor.view.dom.parentElement
      if (!editorHost?.contains(handle)) return null

      const target = resolveBlockActionTarget(editor, handle)
      if (!target) return null

      return {
        handle,
        startX: event.clientX,
        startY: event.clientY,
        target,
      }
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      pendingHandlePressRef.current = getHandlePress(event)
    }

    const handlePointerUp = (event: PointerEvent) => {
      const pending = pendingHandlePressRef.current
      pendingHandlePressRef.current = null

      if (!pending || dragInProgressRef.current) return

      const moved = Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY)
      if (moved > HANDLE_CLICK_MOVE_THRESHOLD) return

      event.preventDefault()
      event.stopPropagation()
      openMenuForHandle(pending.handle, pending.target)
    }

    const clearPendingPress = () => {
      pendingHandlePressRef.current = null
    }

    const handleDragStart = (event: DragEvent) => {
      if (!(event.target instanceof HTMLElement) || !event.target.closest('.drag-handle')) return
      dragInProgressRef.current = true
      pendingHandlePressRef.current = null
      closeMenu()
    }

    const handleDragEnd = () => {
      window.setTimeout(() => {
        dragInProgressRef.current = false
      }, 0)
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('pointerup', handlePointerUp, true)
    document.addEventListener('pointercancel', clearPendingPress, true)
    document.addEventListener('dragstart', handleDragStart, true)
    document.addEventListener('dragend', handleDragEnd, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('pointerup', handlePointerUp, true)
      document.removeEventListener('pointercancel', clearPendingPress, true)
      document.removeEventListener('dragstart', handleDragStart, true)
      document.removeEventListener('dragend', handleDragEnd, true)
    }
  }, [closeMenu, editor])

  useEffect(() => {
    if (!menu.open) return

    const isMenuEventTarget = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false
      return Boolean(menuRef.current?.contains(target) || insertMenuRef.current?.contains(target))
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (isMenuEventTarget(event.target)) return

      if (event.target instanceof HTMLElement) {
        if (event.target.closest('.drag-handle')) return
      }
      closeMenu()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu()
    }

    const handleScroll = (event: Event) => {
      if (isMenuEventTarget(event.target)) return
      closeMenu()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [closeMenu, menu.open])

  const targetText = useMemo(() => {
    if (!editor || !menu.target) return ''
    return getTargetText(editor, menu.target)
  }, [editor, menu.target])

  if (!editor || !menu.open || !menu.target) return null

  const target = menu.target
  const insertMenuPosition = clampMenuPosition(menu.x + BLOCK_MENU_WIDTH + 8, menu.y + 240, BLOCK_INSERT_MENU_WIDTH)

  const runAction = (action: () => void) => {
    action()
    closeMenu()
  }

  const applyBlockFormat = (kind: 'paragraph' | 'h2' | 'h3' | 'bullet' | 'ordered' | 'quote' | 'codeBlock') => {
    runAction(() => {
      focusTarget(editor, target)
      const chain = editor.chain().focus()

      if (kind === 'paragraph') chain.setParagraph().run()
      if (kind === 'h2') chain.setHeading({ level: 2 }).run()
      if (kind === 'h3') chain.setHeading({ level: 3 }).run()
      if (kind === 'bullet') chain.toggleBulletList().run()
      if (kind === 'ordered') chain.toggleOrderedList().run()
      if (kind === 'quote') chain.setParagraph().toggleBlockquote().run()
      if (kind === 'codeBlock') chain.toggleCodeBlock().run()
    })
  }

  const insertBlock = (placement: InsertPlacement, kind: string) => {
    runAction(() => {
      const insertPos = getInsertPos(target, placement)
      editor.chain().focus().insertContentAt(insertPos, createInsertContent(kind)).setTextSelection(insertPos + 1).run()
    })
  }

  const openImageTool = (mode: TriggerImageToolDetail['mode']) => {
    runAction(() => {
      window.dispatchEvent(new CustomEvent<TriggerImageToolDetail>(TRIGGER_IMAGE_TOOL_EVENT, {
        detail: {
          insertPos: getInsertPos(target, 'below'),
          selectedText: targetText,
          mode,
        },
      }))
    })
  }

  const openBlockAIModal = (verticalOffset = 16) => {
    runAction(() => {
      const rect = menuRef.current?.getBoundingClientRect()
      window.dispatchEvent(new CustomEvent<TriggerAIModalDetail>(TRIGGER_AI_MODAL_EVENT, {
        detail: {
          selectedText: targetText,
          position: {
            top: rect ? rect.top + verticalOffset : menu.y,
            left: rect ? rect.right + 12 : menu.x + BLOCK_MENU_WIDTH + 12,
          },
          selectionRange: {
            from: target.contentFrom,
            to: Math.max(target.contentFrom, target.contentTo),
          },
        },
      }))
    })
  }

  const dispatchUpload = (imageOnly: boolean) => {
    runAction(() => {
      editor.chain().focus().setTextSelection(getInsertPos(target, 'below')).run()
      window.dispatchEvent(new CustomEvent(imageOnly ? TRIGGER_IMAGE_UPLOAD_EVENT : TRIGGER_FILE_UPLOAD_EVENT))
    })
  }

  const insertYoutube = () => {
    runAction(() => {
      const insertPos = getInsertPos(target, 'below')
      editor.chain().focus().setTextSelection(insertPos).run()
      window.dispatchEvent(new CustomEvent<InputModalDetail>(TRIGGER_INPUT_MODAL_EVENT, {
        detail: {
          title: '嵌入 YouTube 视频',
          placeholder: '请粘贴 YouTube 视频链接',
          callback: (url) => editor.commands.setYoutubeVideo({ src: normalizeUrl(url) }),
        },
      }))
    })
  }

  return (
    <>
      <div
        ref={menuRef}
        className="fixed z-[70] max-h-[min(560px,calc(100vh-24px))] w-[292px] overflow-y-auto rounded-xl border border-[var(--editor-line)] bg-white p-1.5 shadow-[0_18px_48px_rgba(37,32,24,0.18)]"
        style={{ left: menu.x, top: menu.y }}
      >
        <div className="grid grid-cols-6 gap-0.5 border-b border-[var(--editor-line)] pb-1.5">
          <BlockInlineButton title="正文" active={target.node.type.name === 'paragraph'} onClick={() => applyBlockFormat('paragraph')}>
            T
          </BlockInlineButton>
          <BlockInlineButton title="二级标题" active={target.node.attrs.level === 2} onClick={() => applyBlockFormat('h2')}>
            <Heading2 className="h-4 w-4" />
          </BlockInlineButton>
          <BlockInlineButton title="三级标题" active={target.node.attrs.level === 3} onClick={() => applyBlockFormat('h3')}>
            <Heading3 className="h-4 w-4" />
          </BlockInlineButton>
          <BlockInlineButton title="编号列表" active={target.node.type.name === 'orderedList'} onClick={() => applyBlockFormat('ordered')}>
            <ListOrdered className="h-4 w-4" />
          </BlockInlineButton>
          <BlockInlineButton title="项目列表" active={target.node.type.name === 'bulletList'} onClick={() => applyBlockFormat('bullet')}>
            <List className="h-4 w-4" />
          </BlockInlineButton>
          <BlockInlineButton title="代码块" active={target.node.type.name === 'codeBlock'} onClick={() => applyBlockFormat('codeBlock')}>
            <Code2 className="h-4 w-4" />
          </BlockInlineButton>
        </div>

        <div className="flex items-center gap-1 border-b border-[var(--editor-line)] py-1.5">
          <BlockInlineButton title="Ask AI" onClick={() => openBlockAIModal(16)}>
            <Sparkles className="h-4 w-4" />
          </BlockInlineButton>
          <BlockInlineButton title="生成配图" onClick={() => openImageTool('generate')}>
            <ImagePlus className="h-4 w-4" />
          </BlockInlineButton>
          <BlockInlineButton title="整理当前段落排版" onClick={() => runAction(() => {
            focusTarget(editor, target)
            if (!formatChineseCopywritingInEditor(editor, 'block')) toast.info('当前块无需整理')
          })}>
            排
          </BlockInlineButton>
        </div>

        <div className="border-b border-[var(--editor-line)] py-1.5">
          <BlockMenuButton icon={<MessageSquareText className="h-4 w-4" />} onClick={() => openBlockAIModal(20)}>
            Ask AI 处理当前块
          </BlockMenuButton>
          <BlockMenuButton icon={<Pilcrow className="h-4 w-4" />} onClick={() => runAction(() => {
            focusTarget(editor, target)
            if (!formatChineseCopywritingInEditor(editor, 'block')) toast.info('当前块无需整理')
          })}>
            整理当前段落排版
          </BlockMenuButton>
          <BlockMenuButton icon={<ImagePlus className="h-4 w-4" />} onClick={() => openImageTool('generate')}>
            基于当前块生成配图
          </BlockMenuButton>
        </div>

        <div className="border-b border-[var(--editor-line)] py-1.5">
          <BlockMenuButton icon={<PanelTop className="h-4 w-4" />} onClick={() => setInsertPlacement((value) => (value === 'above' ? null : 'above'))}>
            在上方添加
          </BlockMenuButton>
          <BlockMenuButton icon={<Plus className="h-4 w-4" />} onClick={() => setInsertPlacement((value) => (value === 'below' ? null : 'below'))}>
            在下方添加
          </BlockMenuButton>
        </div>

        <div className="py-1.5">
          <BlockMenuButton icon={<Copy className="h-4 w-4" />} onClick={() => runAction(() => {
            void copyBlockToClipboard(editor, target)
              .then(() => toast.success('已复制当前块'))
              .catch(() => toast.error('复制失败'))
          })}>
            复制当前块
          </BlockMenuButton>
          <BlockMenuButton danger icon={<Trash2 className="h-4 w-4" />} onClick={() => runAction(() => {
            const { state } = editor
            const tr = state.tr.delete(target.pos, target.pos + target.node.nodeSize)
            if (tr.doc.childCount === 0 && state.schema.nodes.paragraph) {
              tr.insert(0, state.schema.nodes.paragraph.create())
            }
            editor.view.dispatch(tr.scrollIntoView())
            editor.view.focus()
          })}>
            删除当前块
          </BlockMenuButton>
        </div>
      </div>

      {insertPlacement && (
        <div
          ref={insertMenuRef}
          className="fixed z-[71] max-h-[min(440px,calc(100vh-24px))] w-[244px] overflow-y-auto rounded-xl border border-[var(--editor-line)] bg-white p-1.5 shadow-[0_18px_48px_rgba(37,32,24,0.16)]"
          style={{ left: insertMenuPosition.x, top: insertMenuPosition.y }}
        >
          <div className="px-2.5 pb-1.5 pt-1 text-[11px] font-medium text-[var(--editor-muted)]">
            {insertPlacement === 'above' ? '在上方添加' : '在下方添加'}
          </div>
          <div className="border-b border-[var(--editor-line)] pb-1.5">
            <BlockInsertButton icon={<AlignLeft className="h-4 w-4" />} onClick={() => insertBlock(insertPlacement, 'paragraph')}>
              正文
            </BlockInsertButton>
            <BlockInsertButton icon={<Heading2 className="h-4 w-4" />} onClick={() => insertBlock(insertPlacement, 'h2')}>
              二级标题
            </BlockInsertButton>
            <BlockInsertButton icon={<Heading3 className="h-4 w-4" />} onClick={() => insertBlock(insertPlacement, 'h3')}>
              三级标题
            </BlockInsertButton>
            <BlockInsertButton icon={<List className="h-4 w-4" />} onClick={() => insertBlock(insertPlacement, 'bullet')}>
              项目列表
            </BlockInsertButton>
            <BlockInsertButton icon={<ListOrdered className="h-4 w-4" />} onClick={() => insertBlock(insertPlacement, 'ordered')}>
              编号列表
            </BlockInsertButton>
            <BlockInsertButton icon={<Quote className="h-4 w-4" />} onClick={() => insertBlock(insertPlacement, 'quote')}>
              引用
            </BlockInsertButton>
            <BlockInsertButton icon={<Braces className="h-4 w-4" />} onClick={() => insertBlock(insertPlacement, 'codeBlock')}>
              代码块
            </BlockInsertButton>
          </div>

          <div className="border-b border-[var(--editor-line)] py-1.5">
            <BlockInsertButton icon={<Table2 className="h-4 w-4" />} onClick={() => insertBlock(insertPlacement, 'table')}>
              表格
            </BlockInsertButton>
            <BlockInsertButton icon={<Sigma className="h-4 w-4" />} onClick={() => insertBlock(insertPlacement, 'math')}>
              数学公式
            </BlockInsertButton>
          </div>

          <div className="border-b border-[var(--editor-line)] py-1.5">
            <BlockInsertButton icon={<MessageSquareText className="h-4 w-4" />} onClick={() => insertBlock(insertPlacement, 'wechatNote')}>
              公众号提示块
            </BlockInsertButton>
            <BlockInsertButton icon={<Braces className="h-4 w-4" />} onClick={() => insertBlock(insertPlacement, 'wechatWarning')}>
              公众号警告块
            </BlockInsertButton>
            <BlockInsertButton icon={<Quote className="h-4 w-4" />} onClick={() => insertBlock(insertPlacement, 'wechatConclusion')}>
              公众号结论块
            </BlockInsertButton>
            <BlockInsertButton icon={<PanelTop className="h-4 w-4" />} onClick={() => insertBlock(insertPlacement, 'wechatGrid')}>
              信息网格
            </BlockInsertButton>
            <BlockInsertButton icon={<List className="h-4 w-4" />} onClick={() => insertBlock(insertPlacement, 'wechatBadges')}>
              徽章组
            </BlockInsertButton>
            <BlockInsertButton icon={<ImageIcon className="h-4 w-4" />} onClick={() => insertBlock(insertPlacement, 'wechatSlider')}>
              滑动图组
            </BlockInsertButton>
            <BlockInsertButton icon={<Pilcrow className="h-4 w-4" />} onClick={() => insertBlock(insertPlacement, 'wechatProfile')}>
              作者卡
            </BlockInsertButton>
            <BlockInsertButton icon={<CheckSquare className="h-4 w-4" />} onClick={() => insertBlock(insertPlacement, 'wechatQRCode')}>
              二维码卡
            </BlockInsertButton>
          </div>

          <div className="py-1.5">
            <BlockInsertButton icon={<ImageIcon className="h-4 w-4" />} onClick={() => dispatchUpload(true)}>
              图片
            </BlockInsertButton>
            <BlockInsertButton icon={<Library className="h-4 w-4" />} onClick={() => openImageTool('library')}>
              图库
            </BlockInsertButton>
            <BlockInsertButton icon={<WandSparkles className="h-4 w-4" />} onClick={() => openImageTool('collage')}>
              拼图
            </BlockInsertButton>
            <BlockInsertButton icon={<FileUp className="h-4 w-4" />} onClick={() => dispatchUpload(false)}>
              视频 / 音频 / 附件
            </BlockInsertButton>
            <BlockInsertButton icon={<CheckSquare className="h-4 w-4" />} onClick={insertYoutube}>
              YouTube
            </BlockInsertButton>
          </div>
        </div>
      )}
    </>
  )
}
