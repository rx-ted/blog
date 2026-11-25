import { Schema } from '@tiptap/pm/model'
import { EditorState } from '@tiptap/pm/state'
import { describe, expect, it } from 'vitest'
import {
  createEditorAutolinkPlugin,
  findEditorAutolinks,
} from '@/lib/editor-autolink'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'text*', group: 'block' },
    text: { group: 'inline' },
  },
  marks: {
    link: {
      attrs: { href: {} },
      inclusive: false,
      toDOM: (mark) => ['a', { href: mark.attrs.href }, 0],
    },
  },
})

function createState(text = '') {
  return EditorState.create({
    schema,
    doc: schema.node('doc', null, [
      schema.node('paragraph', null, text ? [schema.text(text)] : []),
    ]),
    plugins: [createEditorAutolinkPlugin(schema.marks.link)],
  })
}

function readTextMarks(state: EditorState) {
  const parts: Array<{ text: string; href: string | null }> = []
  state.doc.descendants((node) => {
    if (!node.isText || !node.text) return
    const link = node.marks.find((mark) => mark.type === schema.marks.link)
    parts.push({ text: node.text, href: link ? String(link.attrs.href) : null })
  })
  return parts
}

describe('editor CJK autolink', () => {
  it('stops a detected URL before Chinese sentence punctuation', () => {
    expect(
      findEditorAutolinks('https://m9xh7f7fzm.coze.site/，只能转开头部分'),
    ).toEqual([
      {
        from: 0,
        to: 29,
        href: 'https://m9xh7f7fzm.coze.site/',
        text: 'https://m9xh7f7fzm.coze.site/',
      },
    ])
  })

  it('creates the link as soon as a Chinese comma is typed', () => {
    const initialState = createState('https://m9xh7f7fzm.coze.site/')
    const result = initialState.applyTransaction(
      initialState.tr.insertText(
        '，只能转开头部分',
        initialState.doc.content.size - 1,
      ),
    )

    expect(readTextMarks(result.state)).toEqual([
      {
        text: 'https://m9xh7f7fzm.coze.site/',
        href: 'https://m9xh7f7fzm.coze.site/',
      },
      { text: '，只能转开头部分', href: null },
    ])
  })

  it('does not link an unfinished URL before a boundary is typed', () => {
    const initialState = createState('https://example.co')
    const result = initialState.applyTransaction(
      initialState.tr.insertText('m', initialState.doc.content.size - 1),
    )

    expect(readTextMarks(result.state)).toEqual([
      { text: 'https://example.com', href: null },
    ])
  })

  it('repairs a pasted Markdown link that swallowed the Chinese comma', () => {
    const href = 'https://m9xh7f7fzm.coze.site/%EF%BC%8C'
    const badLink = schema.marks.link.create({ href })
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [
        schema.text('https://m9xh7f7fzm.coze.site/，', [badLink]),
      ]),
    ])
    const initialState = EditorState.create({
      schema,
      doc,
      plugins: [createEditorAutolinkPlugin(schema.marks.link)],
    })
    const result = initialState.applyTransaction(
      initialState.tr.insertText(
        '只能转开头部分',
        initialState.doc.content.size - 1,
      ),
    )

    expect(readTextMarks(result.state)).toEqual([
      {
        text: 'https://m9xh7f7fzm.coze.site/',
        href: 'https://m9xh7f7fzm.coze.site/',
      },
      { text: '，只能转开头部分', href: null },
    ])
  })

  it.each(['https://drum.qiaomu.ai/', 'https://tune.qiaomu.ai/'])(
    'repairs a rich-text paste that links only the protocol in %s',
    (href) => {
      const partialLink = schema.marks.link.create({ href })
      const pastedParagraph = schema.node('paragraph', null, [
        schema.text('https://', [partialLink]),
        schema.text(href.slice('https://'.length)),
      ])
      const initialState = createState()
      const result = initialState.applyTransaction(
        initialState.tr.replaceWith(
          0,
          initialState.doc.content.size,
          pastedParagraph,
        ),
      )

      expect(readTextMarks(result.state)).toEqual([{ text: href, href }])
    },
  )

  it('repairs a qwenwork.host rich-text paste that links only a self-describing prefix', () => {
    const fullUrl = 'https://qs8at4hf.qwenwork.host/'
    const prefix = 'https://qs8at4hf.'
    const partialLink = schema.marks.link.create({ href: prefix })
    const pastedParagraph = schema.node('paragraph', null, [
      schema.text(prefix, [partialLink]),
      schema.text(fullUrl.slice(prefix.length)),
    ])
    const initialState = createState()
    const result = initialState.applyTransaction(
      initialState.tr.replaceWith(
        0,
        initialState.doc.content.size,
        pastedParagraph,
      ),
    )

    expect(readTextMarks(result.state)).toEqual([
      { text: fullUrl, href: fullUrl },
    ])
  })

  it('preserves a manual link whose URL-like visible text points elsewhere', () => {
    const partialLink = schema.marks.link.create({
      href: 'https://elsewhere.example/',
    })
    const pastedParagraph = schema.node('paragraph', null, [
      schema.text('https://qs8at4hf.', [partialLink]),
      schema.text('qwenwork.host/'),
    ])
    const initialState = createState()
    const result = initialState.applyTransaction(
      initialState.tr.replaceWith(
        0,
        initialState.doc.content.size,
        pastedParagraph,
      ),
    )

    expect(readTextMarks(result.state)).toEqual([
      { text: 'https://qs8at4hf.', href: 'https://elsewhere.example/' },
      { text: 'qwenwork.host/', href: null },
    ])
  })

  it('keeps an already complete self-describing link untouched', () => {
    const fullUrl = 'https://qs8at4hf.qwenwork.host/'
    const fullLink = schema.marks.link.create({ href: fullUrl })
    const pastedParagraph = schema.node('paragraph', null, [
      schema.text(fullUrl, [fullLink]),
    ])
    const initialState = createState()
    const result = initialState.applyTransaction(
      initialState.tr.replaceWith(
        0,
        initialState.doc.content.size,
        pastedParagraph,
      ),
    )

    expect(readTextMarks(result.state)).toEqual([
      { text: fullUrl, href: fullUrl },
    ])
  })

  it('preserves a partial manual link that intentionally points elsewhere', () => {
    const partialLink = schema.marks.link.create({
      href: 'https://elsewhere.example/',
    })
    const pastedParagraph = schema.node('paragraph', null, [
      schema.text('https://', [partialLink]),
      schema.text('drum.qiaomu.ai/'),
    ])
    const initialState = createState()
    const result = initialState.applyTransaction(
      initialState.tr.replaceWith(
        0,
        initialState.doc.content.size,
        pastedParagraph,
      ),
    )

    expect(readTextMarks(result.state)).toEqual([
      { text: 'https://', href: 'https://elsewhere.example/' },
      { text: 'drum.qiaomu.ai/', href: null },
    ])
  })

  it('keeps Chinese characters inside a URL path until punctuation', () => {
    expect(
      findEditorAutolinks('https://example.com/中文路径，后文')[0],
    ).toMatchObject({
      href: 'https://example.com/中文路径',
      text: 'https://example.com/中文路径',
    })
  })

  it('respects an explicit unlink command', () => {
    const link = schema.marks.link.create({ href: 'https://example.com/' })
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [
        schema.text('https://example.com/', [link]),
      ]),
    ])
    const initialState = EditorState.create({
      schema,
      doc,
      plugins: [createEditorAutolinkPlugin(schema.marks.link)],
    })
    const transaction = initialState.tr
      .removeMark(1, 21, schema.marks.link)
      .setMeta('preventAutolink', true)
    const result = initialState.applyTransaction(transaction)

    expect(readTextMarks(result.state)).toEqual([
      { text: 'https://example.com/', href: null },
    ])
  })

  it('recognizes multiple links separated by Chinese punctuation without spaces', () => {
    expect(
      findEditorAutolinks(
        '先看https://one.example/，再看https://two.example/。',
      ),
    ).toEqual([
      {
        from: 2,
        to: 22,
        href: 'https://one.example/',
        text: 'https://one.example/',
      },
      {
        from: 25,
        to: 45,
        href: 'https://two.example/',
        text: 'https://two.example/',
      },
    ])
  })
})
