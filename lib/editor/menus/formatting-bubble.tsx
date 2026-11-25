'use client'

import { EditorBubble, type EditorInstance, useEditor } from 'novel'
import { useEffect, useState } from 'react'
import {
  AlignLeft,
  Check,
  CheckSquare,
  ChevronDown,
  Code2,
  Copy,
  Eraser,
  ExternalLink,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  List,
  ListOrdered,
  MoreHorizontal,
  Paintbrush2,
  Quote,
  RemoveFormatting,
  Scissors,
  Sigma,
  Trash2,
  WandSparkles,
} from 'lucide-react'
import { shouldShowEditorBubble } from '@/lib/editor-bubble'
import { normalizeUrl } from '@/lib/editor-utils'
import {
  TRIGGER_AI_MODAL_EVENT,
  TRIGGER_IMAGE_GENERATION_EVENT,
  TRIGGER_INPUT_MODAL_EVENT,
  type InputModalDetail,
  type TriggerAIModalDetail,
  type TriggerImageGenerationDetail,
} from '@/lib/editor-events'
import { formatChineseCopywritingInEditor } from '@/lib/editor/formatting/copywriting'

function BubbleIconButton({
  active = false,
  children,
  label,
  onClick,
}: {
  active?: boolean
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium transition ${
        active
          ? 'bg-[var(--editor-accent)] text-[var(--editor-accent-ink)]'
          : 'text-[var(--editor-ink)] hover:bg-[var(--editor-soft)]'
      }`}
    >
      {children}
    </button>
  )
}

function BubbleActionButton({
  children,
  onClick,
  tone = 'default',
}: {
  children: React.ReactNode
  onClick: () => void
  tone?: 'default' | 'primary'
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm transition ${
        tone === 'primary'
          ? 'bg-[var(--editor-accent)] text-[var(--editor-accent-ink)] hover:brightness-105'
          : 'border border-[var(--editor-line)] text-[var(--editor-ink)] hover:bg-[var(--editor-soft)]'
      }`}
    >
      {children}
    </button>
  )
}

function BubblePanelButton({
  active = false,
  icon,
  label,
  onClick,
}: {
  active?: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
        active
          ? 'bg-[var(--editor-accent)]/10 text-[var(--editor-accent)]'
          : 'text-[var(--editor-ink)] hover:bg-[var(--editor-soft)]'
      }`}
    >
      <span className="flex h-4 w-4 items-center justify-center">{icon}</span>
      <span>{label}</span>
      {active ? (
        <Check className="ml-auto h-3.5 w-3.5 text-[var(--editor-accent)]" />
      ) : null}
    </button>
  )
}

type BubbleMode = 'main' | 'text' | 'link' | 'color' | 'more'
type BubbleColorTarget = 'text' | 'highlight'

const TEXT_OPTIONS: Array<{
  id: string
  label: string
  icon: React.ReactNode
  isActive: (editor: EditorInstance) => boolean
  apply: (editor: EditorInstance) => void
}> = [
  {
    id: 'paragraph',
    label: '正文',
    icon: <AlignLeft className="h-4 w-4" />,
    isActive: (editor) => editor.isActive('paragraph'),
    apply: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: 'h1',
    label: '标题 1',
    icon: <Heading1 className="h-4 w-4" />,
    isActive: (editor) => editor.isActive('heading', { level: 1 }),
    apply: (editor) => editor.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    id: 'h2',
    label: '标题 2',
    icon: <Heading2 className="h-4 w-4" />,
    isActive: (editor) => editor.isActive('heading', { level: 2 }),
    apply: (editor) => editor.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    label: '标题 3',
    icon: <Heading3 className="h-4 w-4" />,
    isActive: (editor) => editor.isActive('heading', { level: 3 }),
    apply: (editor) => editor.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    id: 'bullet',
    label: '项目列表',
    icon: <List className="h-4 w-4" />,
    isActive: (editor) => editor.isActive('bulletList'),
    apply: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'ordered',
    label: '编号列表',
    icon: <ListOrdered className="h-4 w-4" />,
    isActive: (editor) => editor.isActive('orderedList'),
    apply: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'task',
    label: '待办列表',
    icon: <CheckSquare className="h-4 w-4" />,
    isActive: (editor) => editor.isActive('taskList'),
    apply: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'quote',
    label: '引用',
    icon: <Quote className="h-4 w-4" />,
    isActive: (editor) => editor.isActive('blockquote'),
    apply: (editor) =>
      editor.chain().focus().setParagraph().toggleBlockquote().run(),
  },
  {
    id: 'codeBlock',
    label: '代码块',
    icon: <Code2 className="h-4 w-4" />,
    isActive: (editor) => editor.isActive('codeBlock'),
    apply: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
]

const TEXT_COLORS = [
  { label: '默认', value: '' },
  { label: '紫色', value: '#9333ea' },
  { label: '红色', value: '#e11d48' },
  { label: '黄色', value: '#ca8a04' },
  { label: '蓝色', value: '#2563eb' },
  { label: '绿色', value: '#16a34a' },
  { label: '橙色', value: '#ea580c' },
  { label: '灰色', value: '#6b7280' },
]

const BG_COLORS = [
  { label: '默认', value: '' },
  { label: '紫色', value: '#f3e8ff' },
  { label: '红色', value: '#ffe4e6' },
  { label: '黄色', value: '#fef9c3' },
  { label: '蓝色', value: '#dbeafe' },
  { label: '绿色', value: '#dcfce7' },
  { label: '橙色', value: '#ffedd5' },
  { label: '灰色', value: '#f3f4f6' },
]

export function FormattingBubble() {
  const { editor } = useEditor()
  const [mode, setMode] = useState<BubbleMode>('main')
  const [colorTarget, setColorTarget] = useState<BubbleColorTarget>('text')
  const [linkValue, setLinkValue] = useState('')

  useEffect(() => {
    if (!editor) return

    const onSelectionUpdate = () => {
      const href =
        (editor.getAttributes('link').href as string | undefined) ?? ''
      setLinkValue(href)
      setMode('main')
      setColorTarget('text')
    }

    editor.on('selectionUpdate', onSelectionUpdate)
    return () => {
      editor.off('selectionUpdate', onSelectionUpdate)
    }
  }, [editor])

  if (!editor) return null

  const openAIModal = () => {
    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to, '\n').trim()

    if (!selectedText) return

    const { view } = editor
    const start = view.coordsAtPos(from)
    const end = view.coordsAtPos(to)

    const position = {
      top: end.bottom + 8,
      left: (start.left + end.right) / 2,
    }

    window.dispatchEvent(
      new CustomEvent<TriggerAIModalDetail>(TRIGGER_AI_MODAL_EVENT, {
        detail: {
          selectedText,
          position,
          selectionRange: { from, to },
        },
      }),
    )

    setTimeout(() => {
      editor.commands.setTextSelection(to)
    }, 50)
  }

  const openImageGenerationModal = () => {
    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to, '\n').trim()

    if (!selectedText) return

    window.dispatchEvent(
      new CustomEvent<TriggerImageGenerationDetail>(
        TRIGGER_IMAGE_GENERATION_EVENT,
        {
          detail: {
            insertPos: to,
            selectedText,
          },
        },
      ),
    )

    setTimeout(() => {
      editor.commands.setTextSelection(to)
    }, 50)
  }

  const copySelectedText = async () => {
    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to, '\n\n').trim()
    if (!selectedText) return

    try {
      await navigator.clipboard.writeText(selectedText)
    } catch {}
  }

  const cutSelectedText = async () => {
    await copySelectedText()
    editor.chain().focus().deleteSelection().run()
    setMode('main')
  }

  const deleteSelectedText = () => {
    editor.chain().focus().deleteSelection().run()
    setMode('main')
  }

  const formatSelectedCopywriting = () => {
    if (formatChineseCopywritingInEditor(editor, 'selection')) {
      editor.chain().focus().run()
    }
    setMode('main')
  }

  const currentTextOption = TEXT_OPTIONS.find((o) => o.isActive(editor))
  const currentColor =
    (editor.getAttributes('textStyle').color as string | undefined) ?? ''
  const currentHighlight =
    (editor.getAttributes('highlight').color as string | undefined) ?? ''
  const colorOptions = colorTarget === 'text' ? TEXT_COLORS : BG_COLORS
  const activeColorValue =
    colorTarget === 'text' ? currentColor : currentHighlight

  const toggleMode = (next: BubbleMode) =>
    setMode((prev) => (prev === next ? 'main' : next))

  return (
    <EditorBubble
      tippyOptions={{ placement: 'top', interactive: true, maxWidth: 'none' }}
      shouldShow={({ editor: currentEditor }) => {
        return shouldShowEditorBubble(
          currentEditor.state.selection,
          currentEditor.isEditable,
        )
      }}
      className="overflow-hidden rounded-xl border border-[var(--editor-line)] bg-white shadow-[0_12px_30px_rgba(37,32,24,0.12)]"
    >
      <div className="flex items-center gap-0.5 p-1">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={openAIModal}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition bg-[var(--editor-accent)]/8 text-[var(--editor-accent)] hover:bg-[var(--editor-accent)]/15"
        >
          <WandSparkles className="h-3.5 w-3.5" />
          Ask AI
        </button>

        <BubbleIconButton label="生成图片" onClick={openImageGenerationModal}>
          <ImagePlus className="h-4 w-4" />
        </BubbleIconButton>

        <BubbleIconButton
          label="整理选中文案排版"
          onClick={formatSelectedCopywriting}
        >
          <span className="text-sm font-semibold">排</span>
        </BubbleIconButton>

        <div className="mx-0.5 h-5 w-px bg-[var(--editor-line)]" />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => toggleMode('text')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition ${
            mode === 'text'
              ? 'bg-[var(--editor-soft)]'
              : 'hover:bg-[var(--editor-soft)]'
          }`}
        >
          <span className="text-[var(--editor-muted)]">
            {currentTextOption?.icon ?? <AlignLeft className="h-4 w-4" />}
          </span>
          <span className="font-medium text-[var(--editor-ink)]">
            {currentTextOption?.label ?? '正文'}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-[var(--editor-muted)]" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => toggleMode('link')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition ${
            mode === 'link' || editor.isActive('link')
              ? 'bg-[var(--editor-soft)] text-[var(--editor-accent)]'
              : 'text-[var(--editor-ink)] hover:bg-[var(--editor-soft)]'
          }`}
        >
          <ExternalLink className="h-4 w-4" />
          Link
        </button>

        <div className="mx-0.5 h-5 w-px bg-[var(--editor-line)]" />

        <BubbleIconButton
          active={editor.isActive('bold')}
          label="粗体 (Cmd+B)"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </BubbleIconButton>
        <BubbleIconButton
          active={editor.isActive('underline')}
          label="下划线 (Cmd+U)"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </BubbleIconButton>
        <BubbleIconButton
          active={editor.isActive('highlight')}
          label="高亮"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter className="h-4 w-4" />
        </BubbleIconButton>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => toggleMode('more')}
          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition ${
            mode === 'more'
              ? 'bg-[var(--editor-soft)]'
              : 'hover:bg-[var(--editor-soft)]'
          }`}
          title="更多"
        >
          <MoreHorizontal className="h-4 w-4 text-[var(--editor-muted)]" />
        </button>

        <BubbleIconButton
          label="清除格式"
          onClick={() =>
            editor.chain().focus().clearNodes().unsetAllMarks().run()
          }
        >
          <RemoveFormatting className="h-4 w-4" />
        </BubbleIconButton>
      </div>

      {mode !== 'main' && (
        <div className="border-t border-[var(--editor-line)]">
          {mode === 'text' && (
            <div className="min-w-[200px] p-1">
              {TEXT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    option.apply(editor)
                    setMode('main')
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition hover:bg-[var(--editor-soft)]"
                >
                  <span className="flex h-5 w-5 items-center justify-center text-[var(--editor-muted)]">
                    {option.icon}
                  </span>
                  <span className="flex-1 text-left text-[var(--editor-ink)]">
                    {option.label}
                  </span>
                  {option.isActive(editor) && (
                    <Check className="h-4 w-4 text-[var(--editor-accent)]" />
                  )}
                </button>
              ))}
            </div>
          )}

          {mode === 'link' && (
            <div className="min-w-[280px] space-y-2 p-2">
              <input
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && linkValue.trim()) {
                    editor
                      .chain()
                      .focus()
                      .extendMarkRange('link')
                      .setLink({ href: normalizeUrl(linkValue.trim()) })
                      .run()
                    setMode('main')
                  }
                }}
                placeholder="https://"
                autoFocus
                className="w-full rounded-md border border-[var(--editor-line)] px-3 py-2 text-sm text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
              />
              <div className="flex items-center justify-between gap-2">
                <BubbleActionButton
                  onClick={() => {
                    editor
                      .chain()
                      .focus()
                      .extendMarkRange('link')
                      .unsetLink()
                      .run()
                    setLinkValue('')
                    setMode('main')
                  }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Eraser className="h-4 w-4" />
                    移除
                  </span>
                </BubbleActionButton>
                <BubbleActionButton
                  tone="primary"
                  onClick={() => {
                    if (!linkValue.trim()) return
                    editor
                      .chain()
                      .focus()
                      .extendMarkRange('link')
                      .setLink({ href: normalizeUrl(linkValue.trim()) })
                      .run()
                    setMode('main')
                  }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <ExternalLink className="h-4 w-4" />
                    应用
                  </span>
                </BubbleActionButton>
              </div>
            </div>
          )}

          {mode === 'color' && (
            <div className="min-w-[248px] p-2">
              <div className="flex items-center gap-2 rounded-lg bg-[var(--editor-soft)] p-1">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setColorTarget('text')}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm transition ${
                    colorTarget === 'text'
                      ? 'bg-white text-[var(--editor-ink)] shadow-sm'
                      : 'text-[var(--editor-muted)] hover:text-[var(--editor-ink)]'
                  }`}
                >
                  文字
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setColorTarget('highlight')}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm transition ${
                    colorTarget === 'highlight'
                      ? 'bg-white text-[var(--editor-ink)] shadow-sm'
                      : 'text-[var(--editor-muted)] hover:text-[var(--editor-ink)]'
                  }`}
                >
                  背景
                </button>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2">
                {colorOptions.map((colorOption) => {
                  const isActive =
                    colorOption.value === ''
                      ? !activeColorValue
                      : activeColorValue?.toLowerCase() ===
                        colorOption.value.toLowerCase()

                  return (
                    <button
                      key={`${colorTarget}-${colorOption.label}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        const chain = editor.chain().focus()

                        if (colorTarget === 'text') {
                          if (!colorOption.value) chain.unsetColor().run()
                          else chain.setColor(colorOption.value).run()
                        } else if (!colorOption.value) {
                          chain.unsetHighlight().run()
                        } else {
                          chain.setHighlight({ color: colorOption.value }).run()
                        }

                        setMode('main')
                      }}
                      className={`flex flex-col items-center gap-1 rounded-xl border px-1.5 py-2 transition ${
                        isActive
                          ? 'border-[var(--editor-accent)] bg-[var(--editor-accent)]/8'
                          : 'border-[var(--editor-line)] hover:bg-[var(--editor-soft)]'
                      }`}
                      title={colorOption.label}
                    >
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-black/10 text-xs font-bold"
                        style={
                          colorTarget === 'text'
                            ? {
                                color: colorOption.value || 'var(--editor-ink)',
                                background: colorOption.value
                                  ? `${colorOption.value}18`
                                  : 'white',
                              }
                            : {
                                background: colorOption.value || 'white',
                                color: 'var(--editor-ink)',
                              }
                        }
                      >
                        A
                      </span>
                      <span className="text-[10px] text-[var(--editor-muted)]">
                        {colorOption.label.replace('色', '')}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setMode('more')}
                  className="text-xs font-medium text-[var(--editor-muted)] transition hover:text-[var(--editor-ink)]"
                >
                  返回更多
                </button>
                <div className="text-[11px] text-[var(--editor-muted)]">
                  {colorTarget === 'text' ? '选择文字颜色' : '选择背景颜色'}
                </div>
              </div>
            </div>
          )}

          {mode === 'more' && (
            <div className="min-w-[220px] p-2">
              <div className="grid grid-cols-2 gap-1">
                <BubblePanelButton
                  active={editor.isActive('italic')}
                  icon={<em className="font-serif">I</em>}
                  label="斜体"
                  onClick={() => {
                    editor.chain().focus().toggleItalic().run()
                    setMode('main')
                  }}
                />
                <BubblePanelButton
                  active={editor.isActive('code')}
                  icon={<span className="font-mono text-xs">{'<>'}</span>}
                  label="行内代码"
                  onClick={() => {
                    editor.chain().focus().toggleCode().run()
                    setMode('main')
                  }}
                />
                <BubblePanelButton
                  active={editor.isActive('strike')}
                  icon={<span className="line-through">S</span>}
                  label="删除线"
                  onClick={() => {
                    editor.chain().focus().toggleStrike().run()
                    setMode('main')
                  }}
                />
                <BubblePanelButton
                  active={Boolean(currentColor || currentHighlight)}
                  icon={<Paintbrush2 className="h-4 w-4" />}
                  label="文字与背景"
                  onClick={() => {
                    setColorTarget(currentHighlight ? 'highlight' : 'text')
                    setMode('color')
                  }}
                />
              </div>

              <div className="mt-2 border-t border-[var(--editor-line)] pt-2">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    void copySelectedText()
                    setMode('main')
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)]"
                >
                  <Copy className="h-4 w-4" />
                  <span>复制选区</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    void cutSelectedText()
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)]"
                >
                  <Scissors className="h-4 w-4" />
                  <span>剪切选区</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={deleteSelectedText}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>删除选区</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setMode('main')
                    window.dispatchEvent(
                      new CustomEvent<InputModalDetail>(
                        TRIGGER_INPUT_MODAL_EVENT,
                        {
                          detail: {
                            title: '插入 LaTeX 数学公式',
                            placeholder: 'E = mc^2',
                            callback: (latex) => {
                              editor.commands.insertContent({
                                type: 'mathBlock',
                                attrs: { latex, displayMode: true },
                              })
                            },
                          },
                        },
                      ),
                    )
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)]"
                >
                  <Sigma className="h-4 w-4" />
                  <span>数学公式</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </EditorBubble>
  )
}

export type DraftSaveStatus = 'idle' | 'saving' | 'saved'

export function EditorFooter({ saveStatus }: { saveStatus: DraftSaveStatus }) {
  const { editor } = useEditor()
  if (!editor) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storage = editor.storage as any
  const chars: number = storage.characterCount?.characters?.() ?? 0

  return (
    <div className="pointer-events-none absolute right-4 top-3 flex items-center gap-2 z-10">
      <span className="rounded-full bg-[var(--editor-soft)] px-2.5 py-1 text-[11px] tabular-nums text-[var(--stone-gray)]">
        {chars.toLocaleString()} 字
      </span>
      <span
        className={`rounded-full px-2.5 py-1 text-[11px] transition-opacity duration-300 ${
          saveStatus === 'idle' ? 'opacity-0' : 'opacity-100'
        } ${
          saveStatus === 'saving'
            ? 'bg-[var(--editor-soft)] text-[var(--stone-gray)]'
            : 'bg-emerald-50 text-emerald-600'
        }`}
      >
        {saveStatus === 'saving' ? '正在保存…' : '已保存'}
      </span>
    </div>
  )
}
