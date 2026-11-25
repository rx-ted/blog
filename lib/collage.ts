export const CANVAS_PRESETS = [
  { key: 'wide', label: '16:9', width: 960, height: 540 },
  { key: 'ultrawide', label: '21:9', width: 2100, height: 900 },
  { key: 'square', label: '1:1', width: 800, height: 800 },
  { key: 'article', label: '4:3', width: 900, height: 675 },
  { key: 'vertical', label: '3:4', width: 720, height: 960 },
] as const

export const MIN_IMAGE_SIZE = 40
export const MIN_TEXT_WIDTH = 60
export const MIN_TRANSFORM_SIZE = 32
export const MIN_CANVAS_WIDTH = 1
export const MIN_CANVAS_HEIGHT = 1
export const MAX_CANVAS_WIDTH = 2400
export const MAX_CANVAS_HEIGHT = 2400
export const SNAP_GUIDE_OFFSET = 6

export type CanvasSize = {
  width: number
  height: number
}

export type TextAlign = 'left' | 'center' | 'right'
export type TextFontStyle = 'normal' | 'italic'
export type TextFontWeight = '400' | '600' | '700'

export type ShadowSettings = {
  enabled: boolean
  color: string
  blur: number
  opacity: number
  offsetX: number
  offsetY: number
}

export type SnapGuide = {
  orientation: 'V' | 'H'
  lineGuide: number
  offset: number
}

export type RectBounds = {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export type CanvasPresetKey = (typeof CANVAS_PRESETS)[number]['key']

export type BaseVisualItem = {
  id: string
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
}

export type ImageItem = BaseVisualItem & {
  type: 'image'
  src: string
  width: number
  height: number
  shadow: ShadowSettings
}

export type IconItem = BaseVisualItem & {
  type: 'icon'
  name: string
  width: number
  height: number
  stroke: string
  strokeWidth: number
  opacity: number
}

export type TextItem = BaseVisualItem & {
  type: 'text'
  text: string
  width: number
  fontSize: number
  fill: string
  fontFamily: string
  fontWeight: TextFontWeight
  fontStyle: TextFontStyle
  align: TextAlign
  lineHeight: number
  letterSpacing: number
}

export type ArrowItem = {
  id: string
  type: 'arrow'
  x1: number
  y1: number
  x2: number
  y2: number
  stroke: string
  strokeWidth: number
}

export type CollageItem = ImageItem | IconItem | TextItem | ArrowItem

export type LoadedImage = {
  src: string
  width: number
  height: number
}

export type CollageFontOption = {
  id: string
  label: string
  family: string
  preview: string
  loadFamily?: string
  cssUrl?: string
  external?: boolean
}

export type OpenImageLibraryItem = {
  id: string
  title: string
  category: string
  src: string
  thumbnail: string
  source: string
  downloadLocation?: string
  link?: string
}

export type CollageHistoryPresetKey = CanvasPresetKey | 'custom'

export type CollageHistorySnapshot = {
  presetKey: CollageHistoryPresetKey
  canvasSize: CanvasSize
  items: CollageItem[]
  background: string
  canvasShadow: ShadowSettings
}

export const COLLAGE_HISTORY_LIMIT = 60

export const DEFAULT_COLLAGE_TEXT_STYLE = {
  fontFamily: '"TsangerJinKai02", "Kaiti SC", STKaiti, KaiTi, serif',
  fontWeight: '700',
  fontStyle: 'normal',
  align: 'left',
  lineHeight: 1.25,
  letterSpacing: 0,
} satisfies Pick<
  TextItem,
  | 'fontFamily'
  | 'fontWeight'
  | 'fontStyle'
  | 'align'
  | 'lineHeight'
  | 'letterSpacing'
>

export const COLLAGE_FONT_OPTIONS: CollageFontOption[] = [
  {
    id: 'tsanger-jinkai',
    label: '苍耳金楷',
    family: '"TsangerJinKai02", "Kaiti SC", STKaiti, KaiTi, serif',
    loadFamily: 'TsangerJinKai02',
    cssUrl: '/fonts/jinkai/jinkai.css',
    preview: '墨',
  },
  {
    id: 'lxgw-wenkai',
    label: '霞鹜文楷',
    family: '"LXGW WenKai", "TsangerJinKai02", "Kaiti SC", serif',
    loadFamily: 'LXGW WenKai',
    cssUrl:
      'https://cdn.jsdelivr.net/npm/@chinese-fonts/lxgwwenkai/dist/LXGWWenKai-Regular/result.css',
    external: true,
    preview: '文',
  },
  {
    id: 'youshe-title',
    label: '优设标题',
    family: '"YouSheBiaoTiHei", "PingFang SC", "Microsoft YaHei", sans-serif',
    loadFamily: 'YouSheBiaoTiHei',
    cssUrl:
      'https://cdn.jsdelivr.net/npm/@chinese-fonts/ysbth/dist/%E4%BC%98%E8%AE%BE%E6%A0%87%E9%A2%98%E9%BB%91/result.css',
    external: true,
    preview: '题',
  },
  {
    id: 'smiley-sans',
    label: '得意黑',
    family:
      '"Smiley Sans Oblique", "PingFang SC", "Microsoft YaHei", sans-serif',
    loadFamily: 'Smiley Sans Oblique',
    cssUrl:
      'https://cdn.jsdelivr.net/npm/@chinese-fonts/dyh/dist/SmileySans-Oblique/result.css',
    external: true,
    preview: '酷',
  },
  {
    id: 'noto-serif-sc',
    label: '思源宋体',
    family: '"Noto Serif SC", "Source Han Serif SC", Songti SC, STSong, serif',
    loadFamily: 'Noto Serif SC',
    cssUrl:
      'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&display=swap',
    external: true,
    preview: '宋',
  },
  {
    id: 'huiwen-mincho',
    label: '汇文明朝',
    family: '"Huiwen-mincho", "Noto Serif SC", Songti SC, serif',
    loadFamily: 'Huiwen-mincho',
    cssUrl:
      'https://cdn.jsdelivr.net/npm/@chinese-fonts/hwmct/dist/%E6%B1%87%E6%96%87%E6%98%8E%E6%9C%9D%E4%BD%93/result.css',
    external: true,
    preview: '明',
  },
  {
    id: 'douyin-sans',
    label: '抖音美好',
    family: '"Douyin Sans", "PingFang SC", "Microsoft YaHei", sans-serif',
    loadFamily: 'Douyin Sans',
    cssUrl:
      'https://cdn.jsdelivr.net/npm/@chinese-fonts/dymh/dist/DouyinSansBold/result.css',
    external: true,
    preview: '潮',
  },
]

export const COLLAGE_OPEN_IMAGE_LIBRARY: OpenImageLibraryItem[] = [
  {
    id: 'unsplash-landscape',
    title: '山谷',
    category: '自然',
    source: 'Unsplash',
    src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85',
    thumbnail:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=70',
  },
  {
    id: 'unsplash-desk',
    title: '桌面',
    category: '工作',
    source: 'Unsplash',
    src: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=85',
    thumbnail:
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=400&q=70',
  },
  {
    id: 'unsplash-code',
    title: '代码',
    category: '科技',
    source: 'Unsplash',
    src: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1600&q=85',
    thumbnail:
      'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=400&q=70',
  },
  {
    id: 'unsplash-circuit',
    title: '电路',
    category: '科技',
    source: 'Unsplash',
    src: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=85',
    thumbnail:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=70',
  },
  {
    id: 'unsplash-abstract',
    title: '抽象',
    category: '纹理',
    source: 'Unsplash',
    src: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1600&q=85',
    thumbnail:
      'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=400&q=70',
  },
  {
    id: 'unsplash-matrix',
    title: '数据',
    category: '科技',
    source: 'Unsplash',
    src: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&q=85',
    thumbnail:
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=70',
  },
  {
    id: 'unsplash-forest',
    title: '森林',
    category: '自然',
    source: 'Unsplash',
    src: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1600&q=85',
    thumbnail:
      'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=400&q=70',
  },
  {
    id: 'unsplash-night',
    title: '星空',
    category: '自然',
    source: 'Unsplash',
    src: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=85',
    thumbnail:
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=400&q=70',
  },
]

export function createDefaultImageShadow(): ShadowSettings {
  return {
    enabled: false,
    color: '#000000',
    blur: 18,
    opacity: 0.22,
    offsetX: 0,
    offsetY: 10,
  }
}

export function cloneCollageItem(item: CollageItem): CollageItem {
  if (item.type === 'image') {
    return { ...item, shadow: { ...item.shadow } }
  }

  return { ...item }
}

export function createCollageHistorySnapshot(
  snapshot: CollageHistorySnapshot,
): CollageHistorySnapshot {
  return {
    presetKey: snapshot.presetKey,
    canvasSize: { ...snapshot.canvasSize },
    items: snapshot.items.map(cloneCollageItem),
    background: snapshot.background,
    canvasShadow: { ...snapshot.canvasShadow },
  }
}

export function pushCollageHistorySnapshot<T>(
  history: readonly T[],
  snapshot: T,
  limit = COLLAGE_HISTORY_LIMIT,
) {
  const safeLimit = Math.max(1, Math.floor(limit))
  return [...history, snapshot].slice(-safeLimit)
}

export function popCollageHistorySnapshot<T>(history: readonly T[]) {
  if (history.length === 0) {
    return { snapshot: null, history: [] as T[] }
  }

  return {
    snapshot: history[history.length - 1] ?? null,
    history: history.slice(0, -1),
  }
}

export function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function clampCanvasSize(size: CanvasSize): CanvasSize {
  return {
    width: clampNumber(size.width, MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH),
    height: clampNumber(size.height, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT),
  }
}

export function parseCanvasDimensionInput(input: string, max: number) {
  const trimmed = input.trim()
  if (!/^[1-9]\d*$/.test(trimmed)) return null

  const value = Number(trimmed)
  if (!Number.isSafeInteger(value) || value > max) return null
  return value
}

export function getFitStageScale(
  canvasWidth: number,
  canvasHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  padding = 32,
) {
  if (
    canvasWidth <= 0 ||
    canvasHeight <= 0 ||
    viewportWidth <= 0 ||
    viewportHeight <= 0
  )
    return 1

  const availableWidth = Math.max(1, viewportWidth - padding * 2)
  const availableHeight = Math.max(1, viewportHeight - padding * 2)
  return Math.min(
    1,
    availableWidth / canvasWidth,
    availableHeight / canvasHeight,
  )
}

export function isImageFile(file: Pick<File, 'type'>) {
  return file.type.startsWith('image/')
}

export function getImageFiles<T extends Pick<File, 'type'>>(
  files: Iterable<T>,
) {
  return Array.from(files).filter(isImageFile)
}

export function shouldInterceptCollagePaste({
  hasImageFiles,
  targetInsideModal,
}: {
  hasImageFiles: boolean
  targetInsideModal: boolean
}) {
  return hasImageFiles || !targetInsideModal
}

export function fitImageIntoBox(
  image: LoadedImage,
  boxWidth: number,
  boxHeight: number,
) {
  const scale = Math.min(boxWidth / image.width, boxHeight / image.height, 1)
  return {
    width: Math.max(MIN_IMAGE_SIZE, image.width * scale),
    height: Math.max(MIN_IMAGE_SIZE, image.height * scale),
  }
}

export function layoutImages(
  images: LoadedImage[],
  canvasWidth: number,
  canvasHeight: number,
  createItemId: () => string = () => '',
): ImageItem[] {
  const count = images.length
  const columns = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / columns)
  const gap = Math.max(
    18,
    Math.round(Math.min(canvasWidth, canvasHeight) * 0.025),
  )
  const cellWidth = (canvasWidth - gap * (columns + 1)) / columns
  const cellHeight = (canvasHeight - gap * (rows + 1)) / rows

  return images.map((image, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    const fitted = fitImageIntoBox(image, cellWidth, cellHeight)

    return {
      id: createItemId(),
      type: 'image',
      src: image.src,
      x: gap + column * (cellWidth + gap) + (cellWidth - fitted.width) / 2,
      y: gap + row * (cellHeight + gap) + (cellHeight - fitted.height) / 2,
      width: fitted.width,
      height: fitted.height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      shadow: createDefaultImageShadow(),
    }
  })
}

export function getTransformedSize({
  width,
  height,
  scaleX,
  scaleY,
  minWidth,
  minHeight,
}: {
  width: number
  height: number
  scaleX: number
  scaleY: number
  minWidth: number
  minHeight: number
}) {
  return {
    width: Math.max(minWidth, width * Math.abs(scaleX)),
    height: Math.max(minHeight, height * Math.abs(scaleY)),
  }
}

export function getTransformedTextWidth(width: number, scaleX: number) {
  return Math.max(MIN_TEXT_WIDTH, width * Math.abs(scaleX))
}

export function getKonvaTextFontStyle(
  item: Pick<TextItem, 'fontWeight' | 'fontStyle'>,
) {
  const style = item.fontStyle === 'italic' ? 'italic' : ''
  const weight =
    item.fontWeight && item.fontWeight !== '400' ? item.fontWeight : ''
  return [style, weight].filter(Boolean).join(' ') || 'normal'
}

export function getArrowRelativePoints(
  item: ArrowItem,
): [number, number, number, number] {
  return [0, 0, item.x2 - item.x1, item.y2 - item.y1]
}

export function moveArrowTo(
  item: ArrowItem,
  nextX1: number,
  nextY1: number,
): ArrowItem {
  const dx = nextX1 - item.x1
  const dy = nextY1 - item.y1
  return {
    ...item,
    x1: nextX1,
    y1: nextY1,
    x2: item.x2 + dx,
    y2: item.y2 + dy,
  }
}

export function updateArrowEndpoint(
  item: ArrowItem,
  endpoint: 'start' | 'end',
  x: number,
  y: number,
): ArrowItem {
  if (endpoint === 'start') {
    return { ...item, x1: x, y1: y }
  }

  return { ...item, x2: x, y2: y }
}

export function getItemBounds(item: CollageItem): RectBounds | null {
  if (item.type === 'arrow') return null

  if (item.type === 'text') {
    const lineCount = Math.max(1, item.text.split('\n').length)
    return {
      id: item.id,
      x: item.x,
      y: item.y,
      width: item.width,
      height:
        item.fontSize *
        (item.lineHeight || DEFAULT_COLLAGE_TEXT_STYLE.lineHeight) *
        lineCount,
    }
  }

  if (item.type === 'icon') {
    return {
      id: item.id,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
    }
  }

  return {
    id: item.id,
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
  }
}

export function getLineGuideStops(
  bounds: RectBounds[],
  canvasSize: CanvasSize,
  skipId: string,
) {
  const vertical = [0, canvasSize.width / 2, canvasSize.width]
  const horizontal = [0, canvasSize.height / 2, canvasSize.height]

  bounds.forEach((item) => {
    if (item.id === skipId) return
    vertical.push(item.x, item.x + item.width / 2, item.x + item.width)
    horizontal.push(item.y, item.y + item.height / 2, item.y + item.height)
  })

  return { vertical, horizontal }
}

export function getObjectSnappingEdges(bounds: RectBounds) {
  return {
    vertical: [
      { guide: bounds.x, offset: 0 },
      { guide: bounds.x + bounds.width / 2, offset: -bounds.width / 2 },
      { guide: bounds.x + bounds.width, offset: -bounds.width },
    ],
    horizontal: [
      { guide: bounds.y, offset: 0 },
      { guide: bounds.y + bounds.height / 2, offset: -bounds.height / 2 },
      { guide: bounds.y + bounds.height, offset: -bounds.height },
    ],
  }
}

export function findSnapGuides({
  bounds,
  canvasSize,
  activeBounds,
  threshold = SNAP_GUIDE_OFFSET,
}: {
  bounds: RectBounds[]
  canvasSize: CanvasSize
  activeBounds: RectBounds
  threshold?: number
}): SnapGuide[] {
  const guideStops = getLineGuideStops(bounds, canvasSize, activeBounds.id)
  const itemEdges = getObjectSnappingEdges(activeBounds)
  const verticalMatches = guideStops.vertical.flatMap((lineGuide) =>
    itemEdges.vertical
      .map((itemBound) => ({
        lineGuide,
        diff: Math.abs(lineGuide - itemBound.guide),
        offset: itemBound.offset,
      }))
      .filter((match) => match.diff < threshold),
  )
  const horizontalMatches = guideStops.horizontal.flatMap((lineGuide) =>
    itemEdges.horizontal
      .map((itemBound) => ({
        lineGuide,
        diff: Math.abs(lineGuide - itemBound.guide),
        offset: itemBound.offset,
      }))
      .filter((match) => match.diff < threshold),
  )
  const guides: SnapGuide[] = []
  const vertical = verticalMatches.sort((a, b) => a.diff - b.diff)[0]
  const horizontal = horizontalMatches.sort((a, b) => a.diff - b.diff)[0]

  if (vertical)
    guides.push({
      orientation: 'V',
      lineGuide: vertical.lineGuide,
      offset: vertical.offset,
    })
  if (horizontal)
    guides.push({
      orientation: 'H',
      lineGuide: horizontal.lineGuide,
      offset: horizontal.offset,
    })
  return guides
}

export function applySnapGuides(x: number, y: number, guides: SnapGuide[]) {
  return guides.reduce(
    (position, guide) => {
      if (guide.orientation === 'V')
        return { ...position, x: guide.lineGuide + guide.offset }
      return { ...position, y: guide.lineGuide + guide.offset }
    },
    { x, y },
  )
}
