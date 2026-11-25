import { Schema } from '@tiptap/pm/model'
import { describe, expect, it } from 'vitest'
import {
  buildEditorTextIndex,
  resolveExactTextRangeInDoc,
} from '@/lib/editor-ai-edit'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      group: 'block',
      content: 'text*',
      toDOM: () => ['p', 0],
    },
    heading: {
      group: 'block',
      content: 'text*',
      attrs: { level: { default: 2 } },
      toDOM: (node) => [`h${node.attrs.level}`, 0],
    },
    text: { group: 'inline' },
  },
})

function paragraph(text: string) {
  return schema.node('paragraph', null, text ? [schema.text(text)] : undefined)
}

function heading(text: string) {
  return schema.node('heading', { level: 2 }, [schema.text(text)])
}

describe('editor AI edit helpers', () => {
  it('builds the same block-separated text shape used by the AI context', () => {
    const doc = schema.node('doc', null, [
      heading('标题'),
      paragraph('第一段'),
      paragraph('第二段'),
    ])

    expect(buildEditorTextIndex(doc).text).toBe('标题\n\n第一段\n\n第二段')
  })

  it('resolves exact text back to ProseMirror positions', () => {
    const doc = schema.node('doc', null, [
      paragraph('第一段'),
      paragraph('要删除的重复段落'),
      paragraph('第三段'),
    ])

    const range = resolveExactTextRangeInDoc(doc, '要删除的重复段落')

    expect(range.status).toBe('found')
    if (range.status !== 'found') return
    expect(doc.textBetween(range.from, range.to)).toBe('要删除的重复段落')
  })

  it('requires a disambiguating occurrence when the text appears more than once', () => {
    const doc = schema.node('doc', null, [paragraph('重复'), paragraph('重复')])

    expect(resolveExactTextRangeInDoc(doc, '重复')).toEqual({
      status: 'ambiguous',
      matchCount: 2,
    })

    const second = resolveExactTextRangeInDoc(doc, '重复', { occurrence: 2 })
    expect(second.status).toBe('found')
    if (second.status !== 'found') return
    expect(doc.textBetween(second.from, second.to)).toBe('重复')
  })

  it('can target the last repeated match explicitly', () => {
    const doc = schema.node('doc', null, [
      paragraph('重复'),
      paragraph('保留'),
      paragraph('重复'),
    ])

    const last = resolveExactTextRangeInDoc(doc, '重复', { useLastMatch: true })

    expect(last.status).toBe('found')
    if (last.status !== 'found') return
    expect(doc.textBetween(last.from, last.to)).toBe('重复')
  })
})
