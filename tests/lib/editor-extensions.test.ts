import {
  AllSelection,
  Selection,
  TextSelection,
  NodeSelection,
} from '@tiptap/pm/state'
import { Schema } from '@tiptap/pm/model'
import { describe, expect, it } from 'vitest'
import { shouldShowEditorBubble } from '@/lib/editor-bubble'
import { editorLinkInclusive } from '@/lib/editor-link-config'
import {
  createDefaultTableContent,
  hasMarkdownTable,
  normalizeUrl,
} from '@/lib/editor-utils'
import {
  isImeCompositionKeyEvent,
  shouldRunEditorCommandNavigation,
} from '@/lib/editor-keyboard'
import {
  createWechatBadgeGroupContent,
  createWechatCalloutContent,
  createWechatInfoGridContent,
} from '@/lib/editor/nodes/wechat/wechat-editor-nodes'

describe('editor-extensions helpers', () => {
  it('creates a default table with header row and paragraph cells', () => {
    const table = createDefaultTableContent(2, 2)

    expect(table).toEqual({
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            { type: 'tableHeader', content: [{ type: 'paragraph' }] },
            { type: 'tableHeader', content: [{ type: 'paragraph' }] },
          ],
        },
        {
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph' }] },
            { type: 'tableCell', content: [{ type: 'paragraph' }] },
          ],
        },
      ],
    })
  })

  it('detects markdown tables but ignores ordinary pipe text', () => {
    expect(
      hasMarkdownTable('| 列1 | 列2 |\n| --- | --- |\n| 值1 | 值2 |'),
    ).toBe(true)
    expect(hasMarkdownTable('普通文本 | 只是一个竖线，不是表格')).toBe(false)
  })

  it('normalizes URLs by preserving http(s) links and prefixing bare domains', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com')
    expect(normalizeUrl('example.com/path')).toBe('https://example.com/path')
  })

  it('creates visual WeChat component nodes for editor insertion', () => {
    expect(createWechatCalloutContent('conclusion')).toEqual({
      type: 'wechatCallout',
      attrs: { kind: 'conclusion', title: '结论' },
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '这里写需要读者特别留意的信息。' }],
        },
      ],
    })

    expect(createWechatBadgeGroupContent(['AI', '公众号'])).toEqual({
      type: 'wechatBadgeGroup',
      attrs: { items: ['AI', '公众号'] },
    })

    expect(
      createWechatInfoGridContent([{ label: '场景', value: '公众号' }]),
    ).toEqual({
      type: 'wechatInfoGrid',
      attrs: { rows: [{ label: '场景', value: '公众号' }] },
    })
  })

  it('lets IME composition key events pass through editor command navigation', () => {
    const composingEnter = { key: 'Enter', isComposing: true, keyCode: 13 }
    const processKey = { key: 'Process', isComposing: false, keyCode: 229 }

    expect(isImeCompositionKeyEvent(composingEnter)).toBe(true)
    expect(isImeCompositionKeyEvent(processKey)).toBe(true)
    expect(shouldRunEditorCommandNavigation(composingEnter)).toBe(false)
    expect(shouldRunEditorCommandNavigation(processKey)).toBe(false)
  })

  it('keeps auto-linked URLs non-inclusive so adjacent text does not inherit the link mark', () => {
    expect(editorLinkInclusive()).toBe(false)
  })

  it('shows the bubble menu for editable text and all-document selections, not image node selections', () => {
    const schema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        paragraph: {
          group: 'block',
          content: 'text*',
          toDOM: () => ['p', 0],
        },
        image: {
          group: 'block',
          inline: false,
          attrs: { src: {} },
          selectable: true,
          toDOM: (node) => ['img', { src: node.attrs.src }],
        },
        text: { group: 'inline' },
      },
    })

    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('hello world')]),
      schema.node('image', { src: '/demo.png' }),
    ])

    const textSelection = TextSelection.create(doc, 1, 6)
    const allSelection = new AllSelection(doc)
    const imageSelection = NodeSelection.create(doc, 13)
    const cursorSelection = Selection.near(doc.resolve(1))

    expect(shouldShowEditorBubble(textSelection, true)).toBe(true)
    expect(shouldShowEditorBubble(allSelection, true)).toBe(true)
    expect(shouldShowEditorBubble(imageSelection, true)).toBe(false)
    expect(shouldShowEditorBubble(cursorSelection, true)).toBe(false)
    expect(shouldShowEditorBubble(textSelection, false)).toBe(false)
  })
})
