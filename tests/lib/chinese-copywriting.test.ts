import { describe, expect, it } from 'vitest'

import { formatChineseCopywritingText } from '@/lib/chinese-copywriting'

describe('Chinese copywriting formatter', () => {
  it('adds spacing between Chinese, English, numbers, and percent signs', () => {
    expect(
      formatChineseCopywritingText('使用React18开发，性能提升20%很明显'),
    ).toBe('使用 React18 开发，性能提升 20% 很明显')
  })

  it('normalizes punctuation near Chinese text without touching English abbreviations', () => {
    expect(
      formatChineseCopywritingText('你好,world!这是Node.js很好用.真的?'),
    ).toBe('你好，world！这是 Node.js 很好用。真的？')
  })

  it('uses Chinese parentheses around Chinese text and removes redundant spacing', () => {
    expect(
      formatChineseCopywritingText(
        '框架 ( React ) 很常见, 但中文 ( 示例 ) 更需要整理',
      ),
    ).toBe('框架（React）很常见，但中文（示例）更需要整理')
  })

  it('compresses repeated punctuation conservatively', () => {
    expect(formatChineseCopywritingText('太好了！！！真的吗??')).toBe(
      '太好了！真的吗？',
    )
  })
})
