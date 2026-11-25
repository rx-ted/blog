import { describe, expect, it } from 'vitest'
import {
  createTocAnchorId,
  extractTocFromTiptapDoc,
  formatTocForAi,
  formatTocItemForAi,
} from '@/lib/article-toc'

function createDoc(nodes: Array<{ level: number; text: string }>) {
  return {
    descendants(
      callback: (
        node: {
          type: { name: string }
          attrs: { level: number }
          textContent: string
        },
        pos: number,
      ) => boolean | undefined,
    ) {
      nodes.forEach((node, index) => {
        callback(
          {
            type: { name: 'heading' },
            attrs: { level: node.level },
            textContent: node.text,
          },
          index * 10,
        )
      })
    },
  }
}

describe('article toc helpers', () => {
  it('creates stable readable anchor ids', () => {
    expect(createTocAnchorId(' 接入 Seedream4 生图模型! ', 0)).toBe(
      'section-接入-seedream4-生图模型-1',
    )
  })

  it('extracts headings and section numbers from a Tiptap-like doc', () => {
    const toc = extractTocFromTiptapDoc(
      createDoc([
        { level: 1, text: '总览' },
        { level: 2, text: '创建推理点' },
        { level: 3, text: '获取模型 ID' },
        { level: 4, text: '忽略四级标题' },
        { level: 2, text: '内测用户群' },
      ]),
    )

    expect(toc).toEqual([
      expect.objectContaining({
        title: '总览',
        level: 1,
        sectionNumber: undefined,
        pos: 0,
      }),
      expect.objectContaining({
        title: '创建推理点',
        level: 2,
        sectionNumber: 1,
        pos: 10,
      }),
      expect.objectContaining({
        title: '获取模型 ID',
        level: 3,
        sectionNumber: 2,
        pos: 20,
      }),
      expect.objectContaining({
        title: '内测用户群',
        level: 2,
        sectionNumber: 3,
        pos: 40,
      }),
    ])
  })

  it('formats only editable sections for AI context', () => {
    const toc = extractTocFromTiptapDoc(
      createDoc([
        { level: 1, text: '标题' },
        { level: 2, text: '第一节' },
        { level: 3, text: '细节' },
      ]),
    )

    expect(formatTocForAi(toc)).toBe('1. H2 第一节\n2. H3 细节')
  })

  it('formats the active heading for AI context', () => {
    expect(
      formatTocItemForAi({
        id: 'section-intro-1',
        title: '总览',
        level: 1,
        pos: 0,
      }),
    ).toBe('H1 总览')

    expect(
      formatTocItemForAi({
        id: 'section-detail-2',
        title: '细节',
        level: 3,
        pos: 20,
        sectionNumber: 2,
      }),
    ).toBe('2. H3 细节')
  })
})
