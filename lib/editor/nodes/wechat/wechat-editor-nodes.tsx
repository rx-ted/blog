'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from '@tiptap/react'
import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

export type WechatCalloutKind =
  | 'note'
  | 'warning'
  | 'conclusion'
  | 'tip'
  | 'info'
  | 'danger'
  | 'success'
  | 'quote'

export type WechatInfoGridRow = {
  label: string
  value: string
}

const WECHAT_CALLOUT_LABELS: Record<WechatCalloutKind, string> = {
  conclusion: '结论',
  danger: '风险',
  info: '信息',
  note: '提示',
  quote: '摘录',
  success: '完成',
  tip: '提示',
  warning: '注意',
}

const DEFAULT_BADGES = ['AI', '公众号排版', '深度解读']
const DEFAULT_INFO_ROWS: WechatInfoGridRow[] = [
  { label: '适合场景', value: '发布前检查、产品对比、步骤总结' },
  { label: '核心价值', value: '信息密度更高，但移动端仍然好读' },
]

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wechatCallout: {
      setWechatCallout: (options?: {
        kind?: WechatCalloutKind
        title?: string
      }) => ReturnType
    }
    wechatProfile: {
      setWechatProfile: (options?: { title?: string }) => ReturnType
    }
    wechatQRCode: {
      setWechatQRCode: (options?: { title?: string }) => ReturnType
    }
    wechatBadgeGroup: {
      setWechatBadgeGroup: (options?: { items?: string[] }) => ReturnType
    }
    wechatInfoGrid: {
      setWechatInfoGrid: (options?: {
        rows?: WechatInfoGridRow[]
      }) => ReturnType
    }
    wechatImageSlider: {
      setWechatImageSlider: (options?: { title?: string }) => ReturnType
    }
  }
}

function textParagraph(text: string) {
  return {
    type: 'paragraph',
    content: [{ type: 'text', text }],
  }
}

function _emptyParagraph() {
  return { type: 'paragraph' }
}

export function createWechatCalloutContent(
  kind: WechatCalloutKind = 'note',
  title?: string,
) {
  return {
    type: 'wechatCallout',
    attrs: {
      kind,
      title: title || WECHAT_CALLOUT_LABELS[kind],
    },
    content: [textParagraph('这里写需要读者特别留意的信息。')],
  }
}

export function createWechatProfileContent(title = 'rx-ted') {
  return {
    type: 'wechatProfile',
    attrs: { title },
    content: [textParagraph('AI 不插电｜把前沿 AI 变成能用的工作流。')],
  }
}

export function createWechatQRCodeContent(title = '关注公众号') {
  return {
    type: 'wechatQRCode',
    attrs: { title },
    content: [textParagraph('把二维码图片拖到这里，或粘贴图片链接。')],
  }
}

export function createWechatBadgeGroupContent(items = DEFAULT_BADGES) {
  return {
    type: 'wechatBadgeGroup',
    attrs: { items },
  }
}

export function createWechatInfoGridContent(rows = DEFAULT_INFO_ROWS) {
  return {
    type: 'wechatInfoGrid',
    attrs: { rows },
  }
}

export function createWechatImageSliderContent(title = '') {
  return {
    type: 'wechatImageSlider',
    attrs: { title },
    content: [textParagraph('把多张图片放在这里，发布时会变成横向滑动图组。')],
  }
}

function normalizeCalloutKind(value: unknown): WechatCalloutKind {
  const kind = String(value || '')
    .trim()
    .toLowerCase()
  if (
    kind === 'warning' ||
    kind === 'conclusion' ||
    kind === 'tip' ||
    kind === 'info' ||
    kind === 'danger' ||
    kind === 'success' ||
    kind === 'quote'
  ) {
    return kind
  }
  return 'note'
}

function normalizeBadgeItems(value: unknown): string[] {
  const items = Array.isArray(value)
    ? value
    : String(value || '').split(/[,，、\n]/)
  const normalized = items.map((item) => String(item).trim()).filter(Boolean)
  return normalized.length > 0 ? normalized : DEFAULT_BADGES
}

function normalizeRows(value: unknown): WechatInfoGridRow[] {
  if (!Array.isArray(value)) return DEFAULT_INFO_ROWS

  const rows = value
    .map((row) => {
      if (!row || typeof row !== 'object') return null
      const current = row as Record<string, unknown>
      const label = String(current.label || '').trim()
      const itemValue = String(current.value || '').trim()
      if (!label && !itemValue) return null
      return {
        label: label || '信息',
        value: itemValue || '补充内容',
      }
    })
    .filter((row): row is WechatInfoGridRow => Boolean(row))

  return rows.length > 0 ? rows : DEFAULT_INFO_ROWS
}

function parseBadgeItems(element: HTMLElement) {
  const badgeItems = Array.from(element.querySelectorAll('.wechat-badge'))
    .map((item) => item.textContent?.trim() || '')
    .filter(Boolean)

  if (badgeItems.length > 0) return badgeItems
  return normalizeBadgeItems(element.textContent || '')
}

function parseInfoRows(element: HTMLElement) {
  const cardRows = Array.from(element.querySelectorAll('.wechat-info-card'))
    .map((card) => ({
      label:
        card.querySelector('.wechat-info-label')?.textContent?.trim() || '信息',
      value:
        card.querySelector('.wechat-info-value')?.textContent?.trim() || '',
    }))
    .filter((row) => row.value)

  if (cardRows.length > 0) return cardRows

  const lines = (element.textContent || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const rows = lines.map((line) => {
    const separator = line.indexOf('|')
    if (separator >= 0) {
      return {
        label: line.slice(0, separator).trim() || '信息',
        value: line.slice(separator + 1).trim() || '补充内容',
      }
    }

    const match = /^([^:：]{1,24})[:：]\s*(.+)$/.exec(line)
    if (match) {
      return {
        label: match[1].trim(),
        value: match[2].trim(),
      }
    }

    return { label: '信息', value: line }
  })

  return normalizeRows(rows)
}

function getTitle(element: HTMLElement, selector: string, fallback: string) {
  return (
    element.getAttribute('data-title') ||
    element.querySelector(selector)?.textContent?.trim() ||
    fallback
  )
}

function removeNodeViewControls(attributes: Record<string, unknown>) {
  const {
    items: _items,
    rows: _rows,
    kind: _kind,
    title: _title,
    ...rest
  } = attributes
  return rest
}

function EditableTitle({
  className,
  fallback,
  onChange,
  value,
}: {
  className: string
  fallback: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <input
      value={value}
      placeholder={fallback}
      aria-label={fallback}
      contentEditable={false}
      onChange={(event) => onChange(event.target.value)}
      className={className}
    />
  )
}

function WechatContainerView({
  bodyClassName,
  chromeClassName,
  node,
  titleClassName,
  titleFallback,
  updateAttributes,
}: NodeViewProps & {
  bodyClassName: string
  chromeClassName: string
  titleClassName: string
  titleFallback: string
}) {
  const title = String(node.attrs.title || '')

  return (
    <NodeViewWrapper className={chromeClassName}>
      <EditableTitle
        className={titleClassName}
        fallback={titleFallback}
        value={title}
        onChange={(value) => updateAttributes({ title: value })}
      />
      <NodeViewContent className={bodyClassName} />
    </NodeViewWrapper>
  )
}

function WechatCalloutView(props: NodeViewProps) {
  const kind = normalizeCalloutKind(props.node.attrs.kind)
  const label = WECHAT_CALLOUT_LABELS[kind]

  return (
    <WechatContainerView
      {...props}
      chromeClassName={`wechat-editor-node wechat-callout wechat-callout-${kind}`}
      titleClassName="wechat-editor-title-input wechat-callout-title"
      bodyClassName="wechat-editor-body wechat-callout-body"
      titleFallback={label}
    />
  )
}

function WechatProfileView(props: NodeViewProps) {
  return (
    <WechatContainerView
      {...props}
      chromeClassName="wechat-editor-node wechat-profile-card"
      titleClassName="wechat-editor-title-input wechat-profile-name"
      bodyClassName="wechat-editor-body wechat-profile-body"
      titleFallback="作者卡"
    />
  )
}

function WechatQRCodeView(props: NodeViewProps) {
  return (
    <WechatContainerView
      {...props}
      chromeClassName="wechat-editor-node wechat-qrcode-card"
      titleClassName="wechat-editor-title-input wechat-qrcode-title"
      bodyClassName="wechat-editor-body wechat-qrcode-body"
      titleFallback="二维码卡"
    />
  )
}

function WechatImageSliderView(props: NodeViewProps) {
  return (
    <WechatContainerView
      {...props}
      chromeClassName="wechat-editor-node wechat-image-slider"
      titleClassName="wechat-editor-title-input wechat-image-slider-title"
      bodyClassName="wechat-editor-body wechat-image-slider-track"
      titleFallback="滑动图组"
    />
  )
}

function WechatBadgeGroupView({
  node,
  selected,
  updateAttributes,
}: NodeViewProps) {
  const items = normalizeBadgeItems(node.attrs.items)
  const [draft, setDraft] = useState(items.join('，'))

  return (
    <NodeViewWrapper
      className={`wechat-editor-node wechat-badge-group ${selected ? 'wechat-editor-node-selected' : ''}`}
    >
      <div className="wechat-badge-preview" contentEditable={false}>
        {items.map((item) => (
          <span key={item} className="wechat-badge">
            {item}
          </span>
        ))}
      </div>
      <textarea
        value={draft}
        rows={1}
        contentEditable={false}
        aria-label="徽章内容"
        className="wechat-atom-editor-input"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => updateAttributes({ items: normalizeBadgeItems(draft) })}
      />
    </NodeViewWrapper>
  )
}

function WechatInfoGridView({
  node,
  selected,
  updateAttributes,
}: NodeViewProps) {
  const rows = useMemo(() => normalizeRows(node.attrs.rows), [node.attrs.rows])

  const updateRow = (index: number, nextRow: WechatInfoGridRow) => {
    const nextRows = rows.map((row, rowIndex) =>
      rowIndex === index ? nextRow : row,
    )
    updateAttributes({ rows: normalizeRows(nextRows) })
  }

  const removeRow = (index: number) => {
    const nextRows = rows.filter((_, rowIndex) => rowIndex !== index)
    updateAttributes({ rows: normalizeRows(nextRows) })
  }

  const addRow = () => {
    updateAttributes({ rows: [...rows, { label: '信息', value: '补充内容' }] })
  }

  return (
    <NodeViewWrapper
      className={`wechat-editor-node wechat-info-grid-editor ${selected ? 'wechat-editor-node-selected' : ''}`}
    >
      <div className="wechat-info-grid" contentEditable={false}>
        {rows.map((row, index) => (
          <section key={`${row.label}-${index}`} className="wechat-info-card">
            <input
              value={row.label}
              aria-label="信息标题"
              className="wechat-info-label wechat-info-input"
              onChange={(event) =>
                updateRow(index, { ...row, label: event.target.value })
              }
            />
            <input
              value={row.value}
              aria-label="信息内容"
              className="wechat-info-value wechat-info-input"
              onChange={(event) =>
                updateRow(index, { ...row, value: event.target.value })
              }
            />
            <button
              type="button"
              className="wechat-info-grid-button"
              title="删除"
              aria-label="删除"
              onClick={() => removeRow(index)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </section>
        ))}
      </div>
      <button
        type="button"
        contentEditable={false}
        className="wechat-info-grid-add"
        onClick={addRow}
      >
        <Plus className="h-3.5 w-3.5" />
        <span>添加一行</span>
      </button>
    </NodeViewWrapper>
  )
}

export const WechatCalloutNode = Node.create({
  name: 'wechatCallout',
  group: 'block',
  content: 'block+',
  defining: true,
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      kind: {
        default: 'note',
        parseHTML: (element) =>
          normalizeCalloutKind(element.getAttribute('data-wechat-callout')),
        renderHTML: (attributes) => ({
          'data-wechat-callout': normalizeCalloutKind(attributes.kind),
        }),
      },
      title: {
        default: '提示',
        parseHTML: (element) =>
          getTitle(element as HTMLElement, '.wechat-callout-title', '提示'),
        renderHTML: (attributes) => ({
          'data-title': String(attributes.title || '提示'),
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'section[data-wechat-callout]',
        contentElement: '.wechat-callout-body',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const kind = normalizeCalloutKind(HTMLAttributes.kind)
    const title = String(HTMLAttributes.title || WECHAT_CALLOUT_LABELS[kind])
    const attrs = removeNodeViewControls(HTMLAttributes)

    return [
      'section',
      mergeAttributes(attrs, {
        class: `wechat-callout wechat-callout-${kind}`,
        'data-wechat-callout': kind,
        'data-title': title,
      }),
      ['p', { class: 'wechat-callout-title' }, title],
      [
        'section',
        { class: 'wechat-callout-body', 'data-wechat-callout-body': 'true' },
        0,
      ],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(WechatCalloutView)
  },

  addCommands() {
    return {
      setWechatCallout:
        (options = {}) =>
        ({ commands }) =>
          commands.insertContent(
            createWechatCalloutContent(options.kind, options.title),
          ),
    }
  },
})

export const WechatProfileNode = Node.create({
  name: 'wechatProfile',
  group: 'block',
  content: 'block+',
  defining: true,
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      title: {
        default: 'rx-ted',
        parseHTML: (element) =>
          getTitle(element as HTMLElement, '.wechat-profile-name', 'rx-ted'),
        renderHTML: (attributes) => ({
          'data-title': String(attributes.title || 'rx-ted'),
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'section[data-wechat-component="profile"]',
        contentElement: '.wechat-profile-body',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const title = String(HTMLAttributes.title || 'rx-ted')
    const attrs = removeNodeViewControls(HTMLAttributes)

    return [
      'section',
      mergeAttributes(attrs, {
        class: 'wechat-profile-card',
        'data-wechat-component': 'profile',
        'data-title': title,
      }),
      ['p', { class: 'wechat-profile-name' }, title],
      [
        'section',
        { class: 'wechat-profile-body', 'data-wechat-component-body': 'true' },
        0,
      ],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(WechatProfileView)
  },

  addCommands() {
    return {
      setWechatProfile:
        (options = {}) =>
        ({ commands }) =>
          commands.insertContent(createWechatProfileContent(options.title)),
    }
  },
})

export const WechatQRCodeNode = Node.create({
  name: 'wechatQRCode',
  group: 'block',
  content: 'block+',
  defining: true,
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      title: {
        default: '关注公众号',
        parseHTML: (element) =>
          getTitle(
            element as HTMLElement,
            '.wechat-qrcode-title',
            '关注公众号',
          ),
        renderHTML: (attributes) => ({
          'data-title': String(attributes.title || '关注公众号'),
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'section[data-wechat-component="qrcode"]',
        contentElement: '.wechat-qrcode-body',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const title = String(HTMLAttributes.title || '关注公众号')
    const attrs = removeNodeViewControls(HTMLAttributes)

    return [
      'section',
      mergeAttributes(attrs, {
        class: 'wechat-qrcode-card',
        'data-wechat-component': 'qrcode',
        'data-title': title,
      }),
      ['p', { class: 'wechat-qrcode-title' }, title],
      [
        'section',
        { class: 'wechat-qrcode-body', 'data-wechat-component-body': 'true' },
        0,
      ],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(WechatQRCodeView)
  },

  addCommands() {
    return {
      setWechatQRCode:
        (options = {}) =>
        ({ commands }) =>
          commands.insertContent(createWechatQRCodeContent(options.title)),
    }
  },
})

export const WechatBadgeGroupNode = Node.create({
  name: 'wechatBadgeGroup',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      items: {
        default: DEFAULT_BADGES,
        parseHTML: (element) => parseBadgeItems(element as HTMLElement),
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-wechat-component="badges"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const items = normalizeBadgeItems(HTMLAttributes.items)
    const attrs = removeNodeViewControls(HTMLAttributes)
    return [
      'section',
      mergeAttributes(attrs, {
        class: 'wechat-badge-group',
        'data-wechat-component': 'badges',
      }),
      ...items.map((item) => ['span', { class: 'wechat-badge' }, item]),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(WechatBadgeGroupView)
  },

  addCommands() {
    return {
      setWechatBadgeGroup:
        (options = {}) =>
        ({ commands }) =>
          commands.insertContent(createWechatBadgeGroupContent(options.items)),
    }
  },
})

export const WechatInfoGridNode = Node.create({
  name: 'wechatInfoGrid',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      rows: {
        default: DEFAULT_INFO_ROWS,
        parseHTML: (element) => parseInfoRows(element as HTMLElement),
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-wechat-component="grid"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const rows = normalizeRows(HTMLAttributes.rows)
    const attrs = removeNodeViewControls(HTMLAttributes)
    return [
      'section',
      mergeAttributes(attrs, {
        class: 'wechat-info-grid',
        'data-wechat-component': 'grid',
      }),
      ...rows.map((row) => [
        'section',
        { class: 'wechat-info-card' },
        ['span', { class: 'wechat-info-label' }, row.label],
        ['span', { class: 'wechat-info-value' }, row.value],
      ]),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(WechatInfoGridView)
  },

  addCommands() {
    return {
      setWechatInfoGrid:
        (options = {}) =>
        ({ commands }) =>
          commands.insertContent(createWechatInfoGridContent(options.rows)),
    }
  },
})

export const WechatImageSliderNode = Node.create({
  name: 'wechatImageSlider',
  group: 'block',
  content: 'block+',
  defining: true,
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      title: {
        default: '',
        parseHTML: (element) =>
          getTitle(element as HTMLElement, '.wechat-image-slider-title', ''),
        renderHTML: (attributes) => ({
          'data-title': String(attributes.title || ''),
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'section[data-wechat-component="slider"]',
        contentElement: '.wechat-image-slider-track',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const title = String(HTMLAttributes.title || '')
    const attrs = removeNodeViewControls(HTMLAttributes)
    const titleNode = title
      ? [['p', { class: 'wechat-image-slider-title' }, title]]
      : []

    return [
      'section',
      mergeAttributes(attrs, {
        class: 'wechat-image-slider',
        'data-wechat-component': 'slider',
        'data-title': title,
      }),
      ...titleNode,
      [
        'section',
        {
          class: 'wechat-image-slider-track',
          'data-wechat-slider-track': 'true',
        },
        0,
      ],
      ['p', { class: 'wechat-image-slider-hint' }, '左右滑动看更多'],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(WechatImageSliderView)
  },

  addCommands() {
    return {
      setWechatImageSlider:
        (options = {}) =>
        ({ commands }) =>
          commands.insertContent(createWechatImageSliderContent(options.title)),
    }
  },
})
