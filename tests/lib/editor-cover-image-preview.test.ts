import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { EditorCoverImagePreview } from '@/components/EditorCoverImagePreview'

describe('EditorCoverImagePreview', () => {
  it('lets pointer events reach the image outside the action buttons', () => {
    const markup = renderToStaticMarkup(
      createElement(EditorCoverImagePreview, {
        src: '/api/images/generated-cover.webp',
        onRemove: vi.fn(),
        onUpload: vi.fn(),
      }),
    )

    expect(markup).toContain('<img')
    expect(markup).toContain('pointer-events-none absolute inset-0')
    expect(markup.match(/pointer-events-auto/g)).toHaveLength(2)
  })
})
