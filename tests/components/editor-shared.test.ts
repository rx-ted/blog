import { Schema } from '@tiptap/pm/model'
import { describe, expect, it } from 'vitest'
import {
  AUTOSAVE_DEBOUNCE_MS,
  EMPTY_DOCUMENT,
  calcReadTime,
  createEditorDraftDocumentKey,
  findSectionInsertPosition,
  normalizeSectionTitle,
  relativeTime,
} from '@/components/editor/shared'

describe('editor shared helpers', () => {
  it('provides stable editor constants', () => {
    expect(AUTOSAVE_DEBOUNCE_MS).toBe(5 * 60 * 1000)
    expect(EMPTY_DOCUMENT).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    })
  })

  it('calculates read time', () => {
    expect(calcReadTime(1)).toBe('约1分钟阅读')
    expect(calcReadTime(400)).toBe('约1分钟阅读')
    expect(calcReadTime(401)).toBe('约2分钟阅读')
  })

  it('creates draft document keys', () => {
    expect(createEditorDraftDocumentKey()).toMatch(/^draft:\d+-/)
  })

  it('normalizes section titles', () => {
    expect(normalizeSectionTitle('  Hello   World  ')).toBe('hello world')
  })

  it('formats relative time', () => {
    expect(relativeTime(Date.now() - 10_000)).toBe('刚刚')
    expect(relativeTime(Date.now() - 5 * 60_000)).toBe('5分钟前')
  })
})

describe('editor shared section helpers', () => {
  const schema = new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: { group: 'block', content: 'text*' },
      heading: {
        group: 'block',
        content: 'text*',
        attrs: { level: { default: 2 } },
      },
      text: { group: 'inline' },
    },
  })

  const p = (text: string) =>
    schema.node('paragraph', null, text ? [schema.text(text)] : [])
  const h = (level: number, text: string) =>
    schema.node('heading', { level }, text ? [schema.text(text)] : [])

  it('finds insert position by section number', () => {
    const doc = schema.node('doc', null, [
      h(2, 'Intro'),
      p('a'),
      h(3, 'Detail'),
      p('b'),
    ])
    const pos = findSectionInsertPosition(doc, {
      mode: 'section',
      sectionNumber: 2,
    })
    const secondHeadingPos = doc.child(0).nodeSize + doc.child(1).nodeSize
    expect(pos).toBe(secondHeadingPos + doc.child(2).nodeSize)
  })

  it('finds insert position by normalized section title', () => {
    const doc = schema.node('doc', null, [h(2, 'Getting Started'), p('body')])
    const pos = findSectionInsertPosition(doc, {
      mode: 'section',
      sectionTitle: '  getting   started  ',
    })
    expect(pos).toBe(doc.child(0).nodeSize)
  })

  it('returns null for non-section targets or missing headings', () => {
    const doc = schema.node('doc', null, [h(2, 'Intro'), p('body')])
    expect(findSectionInsertPosition(doc, { mode: 'cursor' })).toBeNull()
    expect(
      findSectionInsertPosition(doc, {
        mode: 'section',
        sectionTitle: 'Missing',
      }),
    ).toBeNull()
  })
})
