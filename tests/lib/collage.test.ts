import { describe, expect, it } from 'vitest'

import {
  applySnapGuides,
  CANVAS_PRESETS,
  clampCanvasSize,
  COLLAGE_FONT_OPTIONS,
  COLLAGE_OPEN_IMAGE_LIBRARY,
  createCollageHistorySnapshot,
  createDefaultImageShadow,
  DEFAULT_COLLAGE_TEXT_STYLE,
  findSnapGuides,
  getArrowRelativePoints,
  getFitStageScale,
  getImageFiles,
  getItemBounds,
  getKonvaTextFontStyle,
  layoutImages,
  getTransformedSize,
  getTransformedTextWidth,
  moveArrowTo,
  parseCanvasDimensionInput,
  popCollageHistorySnapshot,
  pushCollageHistorySnapshot,
  shouldInterceptCollagePaste,
  updateArrowEndpoint,
  type ArrowItem,
  type CollageHistorySnapshot,
  type ImageItem,
  type IconItem,
  type TextItem,
} from '@/lib/collage'
import {
  COLLAGE_ICON_LIBRARY,
  MAX_RECENT_COLLAGE_ICONS,
  searchCollageIcons,
} from '@/lib/collage-icons'

const arrow: ArrowItem = {
  id: 'arrow-1',
  type: 'arrow',
  x1: 10,
  y1: 20,
  x2: 110,
  y2: 70,
  stroke: '#ef4444',
  strokeWidth: 8,
}

describe('collage helpers', () => {
  it('only keeps image files for collage paste and upload', () => {
    const files = getImageFiles([
      { type: 'image/png' },
      { type: 'text/plain' },
      { type: 'image/webp' },
    ])

    expect(files).toEqual([{ type: 'image/png' }, { type: 'image/webp' }])
  })

  it('captures image paste and shields the editor while the modal is open', () => {
    expect(
      shouldInterceptCollagePaste({
        hasImageFiles: true,
        targetInsideModal: false,
      }),
    ).toBe(true)
    expect(
      shouldInterceptCollagePaste({
        hasImageFiles: true,
        targetInsideModal: true,
      }),
    ).toBe(true)
    expect(
      shouldInterceptCollagePaste({
        hasImageFiles: false,
        targetInsideModal: false,
      }),
    ).toBe(true)
    expect(
      shouldInterceptCollagePaste({
        hasImageFiles: false,
        targetInsideModal: true,
      }),
    ).toBe(false)
  })

  it('normalizes transformed image and text dimensions', () => {
    expect(
      getTransformedSize({
        width: 120,
        height: 80,
        scaleX: 2,
        scaleY: 0.5,
        minWidth: 40,
        minHeight: 40,
      }),
    ).toEqual({ width: 240, height: 40 })

    expect(getTransformedTextWidth(160, 0.25)).toBe(60)
  })

  it('lays images out with caller-provided ids', () => {
    let index = 0
    const images = layoutImages(
      [
        { src: 'one', width: 400, height: 300 },
        { src: 'two', width: 400, height: 300 },
      ],
      900,
      675,
      () => {
        index += 1
        return `image-${index}`
      },
    )

    expect(images.map((image) => image.id)).toEqual(['image-1', 'image-2'])
    expect(images.every((image) => image.width > 0 && image.height > 0)).toBe(
      true,
    )
    expect(images.every((image) => image.shadow.enabled === false)).toBe(true)
  })

  it('fits a virtual canvas into the available viewport without enlarging it', () => {
    expect(getFitStageScale(900, 675, 600, 500, 24)).toBeCloseTo(0.613, 2)
    expect(getFitStageScale(900, 675, 1600, 1200, 24)).toBe(1)
  })

  it('clamps custom canvas dimensions to supported bounds', () => {
    expect(clampCanvasSize({ width: 0, height: 5000 })).toEqual({
      width: 1,
      height: 2400,
    })
  })

  it('offers an ultrawide canvas preset for collage covers', () => {
    expect(CANVAS_PRESETS).toContainEqual({
      key: 'ultrawide',
      label: '21:9',
      width: 2100,
      height: 900,
    })
  })

  it('parses free-form canvas dimensions as bounded positive integers', () => {
    expect(parseCanvasDimensionInput('1200', 2400)).toBe(1200)
    expect(parseCanvasDimensionInput(' 42 ', 2400)).toBe(42)
    expect(parseCanvasDimensionInput('', 2400)).toBeNull()
    expect(parseCanvasDimensionInput('12.5', 2400)).toBeNull()
    expect(parseCanvasDimensionInput('0', 2400)).toBeNull()
    expect(parseCanvasDimensionInput('2401', 2400)).toBeNull()
  })

  it('finds and applies Keynote-style edge and center snap guides', () => {
    const guides = findSnapGuides({
      canvasSize: { width: 900, height: 675 },
      bounds: [
        { id: 'a', x: 100, y: 100, width: 200, height: 100 },
        { id: 'b', x: 500, y: 300, width: 100, height: 100 },
      ],
      activeBounds: { id: 'b', x: 198, y: 101, width: 100, height: 100 },
      threshold: 6,
    })

    expect(guides).toEqual([
      { orientation: 'V', lineGuide: 200, offset: 0 },
      { orientation: 'H', lineGuide: 100, offset: 0 },
    ])
    expect(applySnapGuides(198, 101, guides)).toEqual({ x: 200, y: 100 })
  })

  it('returns simple visual bounds for image items', () => {
    const image: ImageItem = {
      id: 'image-1',
      type: 'image',
      src: 'image',
      x: 20,
      y: 30,
      width: 200,
      height: 120,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      shadow: createDefaultImageShadow(),
    }

    expect(getItemBounds(image)).toEqual({
      id: 'image-1',
      x: 20,
      y: 30,
      width: 200,
      height: 120,
    })
  })

  it('returns simple visual bounds for icon items', () => {
    const icon: IconItem = {
      id: 'icon-1',
      type: 'icon',
      name: 'Sparkles',
      x: 12,
      y: 18,
      width: 96,
      height: 96,
      stroke: '#111111',
      strokeWidth: 2.4,
      opacity: 1,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    }

    expect(getItemBounds(icon)).toEqual({
      id: 'icon-1',
      x: 12,
      y: 18,
      width: 96,
      height: 96,
    })
  })

  it('provides typography defaults and open image presets for the collage editor', () => {
    const text: TextItem = {
      id: 'text-1',
      type: 'text',
      text: 'hello\nworld',
      x: 20,
      y: 30,
      width: 200,
      fontSize: 40,
      fill: '#111111',
      ...DEFAULT_COLLAGE_TEXT_STYLE,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      fontStyle: 'italic',
      fontWeight: '700',
      lineHeight: 1.5,
    }

    expect(getKonvaTextFontStyle(text)).toBe('italic 700')
    expect(getItemBounds(text)).toEqual({
      id: 'text-1',
      x: 20,
      y: 30,
      width: 200,
      height: 120,
    })
    expect(COLLAGE_FONT_OPTIONS.map((font) => font.id)).toEqual([
      'tsanger-jinkai',
      'lxgw-wenkai',
      'youshe-title',
      'smiley-sans',
      'noto-serif-sc',
      'huiwen-mincho',
      'douyin-sans',
    ])
    expect(COLLAGE_FONT_OPTIONS[0]?.cssUrl).toBe('/fonts/jinkai/jinkai.css')
    expect(COLLAGE_FONT_OPTIONS.filter((font) => font.external)).toHaveLength(6)
    expect(
      COLLAGE_OPEN_IMAGE_LIBRARY.every((item) =>
        item.src.startsWith('https://'),
      ),
    ).toBe(true)
  })

  it('provides searchable collage icons', () => {
    expect(COLLAGE_ICON_LIBRARY.length).toBeGreaterThan(50)
    expect(searchCollageIcons('增长').map((icon) => icon.name)).toContain(
      'TrendingUp',
    )
    expect(
      searchCollageIcons('', '商业').every((icon) => icon.category === '商业'),
    ).toBe(true)
    expect(MAX_RECENT_COLLAGE_ICONS).toBe(8)
  })

  it('moves arrows as endpoints and lets either endpoint be adjusted', () => {
    expect(getArrowRelativePoints(arrow)).toEqual([0, 0, 100, 50])

    expect(moveArrowTo(arrow, 20, 40)).toMatchObject({
      x1: 20,
      y1: 40,
      x2: 120,
      y2: 90,
    })

    expect(updateArrowEndpoint(arrow, 'start', 4, 5)).toMatchObject({
      x1: 4,
      y1: 5,
      x2: 110,
      y2: 70,
    })
    expect(updateArrowEndpoint(arrow, 'end', 130, 90)).toMatchObject({
      x1: 10,
      y1: 20,
      x2: 130,
      y2: 90,
    })
  })

  it('keeps bounded undo snapshots and restores independent item copies', () => {
    const image: ImageItem = {
      id: 'image-1',
      type: 'image',
      src: 'image',
      x: 20,
      y: 30,
      width: 200,
      height: 120,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      shadow: createDefaultImageShadow(),
    }
    const original: CollageHistorySnapshot = {
      presetKey: 'article',
      canvasSize: { width: 900, height: 675 },
      items: [image],
      background: '#ffffff',
      canvasShadow: {
        enabled: false,
        color: '#000000',
        blur: 28,
        opacity: 0.2,
        offsetX: 0,
        offsetY: 14,
      },
    }

    const snapshot = createCollageHistorySnapshot(original)
    image.shadow.enabled = true
    image.x = 999

    expect(snapshot.items[0]).toMatchObject({
      x: 20,
      shadow: { enabled: false },
    })

    const history = pushCollageHistorySnapshot(
      pushCollageHistorySnapshot([], snapshot, 2),
      createCollageHistorySnapshot({ ...original, background: '#111111' }),
      2,
    )
    const bounded = pushCollageHistorySnapshot(
      history,
      createCollageHistorySnapshot({ ...original, background: '#222222' }),
      2,
    )

    expect(bounded.map((item) => item.background)).toEqual([
      '#111111',
      '#222222',
    ])

    const popped = popCollageHistorySnapshot(bounded)
    expect(popped.snapshot?.background).toBe('#222222')
    expect(popped.history.map((item) => item.background)).toEqual(['#111111'])
  })
})
