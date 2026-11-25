import { describe, expect, it } from 'vitest'
import { renderLatexToMathSvgMarkup } from '@/lib/math-svg-render'

describe('math svg renderer', () => {
  it('renders large operators as SVG for WeChat copy compatibility', async () => {
    const svg = await renderLatexToMathSvgMarkup(
      '\\chi = \\sum_{i=1}^{n} x_i',
      true,
    )

    expect(svg).toContain('<svg')
    expect(svg).toContain('viewBox=')
    expect(svg).toContain('max-width: 300vw !important')
    expect(svg).toContain('flex-shrink: 0')
    expect(svg).not.toMatch(/\swidth="/i)
    expect(svg).toContain('data-c="2211"')
  })
})
