'use client'
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, PointerEvent as ReactPointerEvent } from 'react'
import { flushSync } from 'react-dom'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowRight,
  Bold,
  ChevronDown,
  ChevronUp,
  Copy,
  Grid2X2,
  Images,
  ImagePlus,
  Italic,
  Layers,
  Loader2,
  Search,
  Send,
  Shapes,
  Trash2,
  Type,
  Undo2,
  X,
} from 'lucide-react'
import {
  Arrow,
  Circle,
  Image as KonvaImage,
  Layer,
  Line as KonvaLine,
  Rect,
  Stage,
  Text,
  Transformer,
} from 'react-konva'
import type Konva from 'konva'
import {
  DynamicIcon,
  dynamicIconImports,
  type DynamicIconModule,
  type IconName,
} from 'lucide-react/dynamic'
import {
  CANVAS_PRESETS,
  COLLAGE_FONT_OPTIONS,
  COLLAGE_OPEN_IMAGE_LIBRARY,
  DEFAULT_COLLAGE_TEXT_STYLE,
  MAX_CANVAS_HEIGHT,
  MAX_CANVAS_WIDTH,
  SNAP_GUIDE_OFFSET,
  applySnapGuides,
  clampCanvasSize,
  createCollageHistorySnapshot,
  createDefaultImageShadow,
  findSnapGuides,
  getKonvaTextFontStyle,
  MIN_IMAGE_SIZE,
  MIN_TRANSFORM_SIZE,
  fitImageIntoBox,
  getArrowRelativePoints,
  getFitStageScale,
  getImageFiles,
  getItemBounds,
  getTransformedSize,
  getTransformedTextWidth,
  isImageFile,
  layoutImages,
  moveArrowTo,
  parseCanvasDimensionInput,
  popCollageHistorySnapshot,
  pushCollageHistorySnapshot,
  shouldInterceptCollagePaste,
  updateArrowEndpoint,
  type ArrowItem,
  type CanvasSize,
  type CanvasPresetKey,
  type CollageHistorySnapshot,
  type CollageFontOption,
  type CollageItem,
  type ImageItem,
  type IconItem,
  type LoadedImage,
  type OpenImageLibraryItem,
  type SnapGuide,
  type ShadowSettings,
  type TextItem,
} from '@/lib/collage'
import {
  COLLAGE_ICON_LIBRARY,
  addRecentCollageIcon,
  getCollageIconCategories,
  getRecentCollageIcons,
  searchCollageIcons,
  type CollageIconCategory,
  type CollageIconConfig,
} from '@/lib/collage-icons'

const CANVAS_FRAME_PADDING = 8
const CONTROL_COLOR = '#2563eb'
const SNAP_GUIDE_COLOR = '#14b8a6'
const TEXT_FONT_FAMILY = DEFAULT_COLLAGE_TEXT_STYLE.fontFamily
const IMAGE_TRANSFORM_ANCHORS = [
  'top-left',
  'top-center',
  'top-right',
  'middle-right',
  'bottom-right',
  'bottom-center',
  'bottom-left',
  'middle-left',
]
const TEXT_TRANSFORM_ANCHORS = ['middle-left', 'middle-right']
const ICON_TRANSFORM_ANCHORS = [
  'top-left',
  'top-right',
  'bottom-right',
  'bottom-left',
]
const DEFAULT_CANVAS_PRESET =
  CANVAS_PRESETS.find((preset) => preset.key === 'article') ?? CANVAS_PRESETS[0]
const COLLAGE_FONT_LOAD_TIMEOUT_MS = 3000
const COLLAGE_ICON_VIEWBOX_SIZE = 24

type ActivePresetKey = CanvasPresetKey | 'custom'
type SidePanelMode = 'properties' | 'library' | 'icons'
type FontLoadStatus = 'loading' | 'ready' | 'failed'

type CanvasShadowSettings = ShadowSettings

interface CollageModalProps {
  open: boolean
  active?: boolean
  embedded?: boolean
  insertPos: number | null
  onClose: () => void
  onInsert: (file: File, insertPos: number | null) => Promise<void> | void
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function shouldUseAnonymousCors(src: string) {
  return /^https?:\/\//i.test(src)
}

function loadImageSource(
  src: string,
  errorMessage: string,
): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
    if (shouldUseAnonymousCors(src)) {
      image.crossOrigin = 'anonymous'
    }
    image.onload = () =>
      resolve({
        src,
        width: image.naturalWidth || 1200,
        height: image.naturalHeight || 800,
      })
    image.onerror = () => reject(new Error(errorMessage))
    image.src = src
  })
}

const collageFontLoadPromises = new Map<string, Promise<void>>()

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
}

function getFontLinkId(font: CollageFontOption) {
  return `collage-font-${font.id}`
}

function quoteFontFamily(fontFamily: string) {
  return `"${fontFamily.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

async function waitForCollageFontFace(font: CollageFontOption) {
  if (typeof document === 'undefined' || !document.fonts || !font.loadFamily)
    return

  const fontFace = `400 32px ${quoteFontFamily(font.loadFamily)}`
  await Promise.race([
    document.fonts.load(fontFace, font.preview).then(() => undefined),
    wait(COLLAGE_FONT_LOAD_TIMEOUT_MS),
  ])
  await Promise.race([
    document.fonts.ready.then(() => undefined),
    wait(COLLAGE_FONT_LOAD_TIMEOUT_MS),
  ])
}

function loadCollageFontStylesheet(font: CollageFontOption) {
  return new Promise<void>((resolve, reject) => {
    if (!font.cssUrl) {
      resolve()
      return
    }

    const existing = document.getElementById(
      getFontLinkId(font),
    ) as HTMLLinkElement | null
    if (existing) {
      resolve()
      return
    }

    const link = document.createElement('link')
    link.id = getFontLinkId(font)
    link.rel = 'stylesheet'
    link.href = font.cssUrl
    link.setAttribute('data-collage-font', font.id)
    if (/^https?:\/\//i.test(font.cssUrl)) {
      link.crossOrigin = 'anonymous'
    }
    link.onload = () => resolve()
    link.onerror = () => reject(new Error(`${font.label} 字体加载失败`))
    document.head.appendChild(link)
  })
}

async function ensureCollageFontLoaded(font: CollageFontOption) {
  if (typeof document === 'undefined') return

  const current = collageFontLoadPromises.get(font.id)
  if (current) return current

  const promise = loadCollageFontStylesheet(font)
    .then(() => waitForCollageFontFace(font))
    .catch((error) => {
      collageFontLoadPromises.delete(font.id)
      throw error
    })

  collageFontLoadPromises.set(font.id, promise)
  return promise
}

function findCollageFontByFamily(fontFamily: string | undefined) {
  if (!fontFamily) return undefined
  return COLLAGE_FONT_OPTIONS.find(
    (font) =>
      font.family === fontFamily ||
      (font.loadFamily ? fontFamily.includes(font.loadFamily) : false),
  )
}

function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve())
    })
  })
}

function pascalToKebab(value: string) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

function toLucideIconName(name: string): IconName | null {
  const iconName = pascalToKebab(name)
  return iconName in dynamicIconImports ? (iconName as IconName) : null
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function svgAttributeName(name: string) {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

type CollageIconNode = NonNullable<
  DynamicIconModule['__iconData']
>['node'][number]

function iconNodeToSvgContent(iconNodes: readonly CollageIconNode[]): string {
  return iconNodes
    .map(([tag, attrs, children]) => {
      const attrText = Object.entries(attrs ?? {})
        .filter(([name]) => name !== 'key')
        .map(
          ([name, value]) =>
            `${svgAttributeName(name)}="${escapeXml(String(value))}"`,
        )
        .join(' ')
      const childrenText: string = children?.length
        ? iconNodeToSvgContent(children)
        : ''
      return `<${tag}${attrText ? ` ${attrText}` : ''}>${childrenText}</${tag}>`
    })
    .join('')
}

async function getCollageIconDataUrl(
  name: string,
  stroke: string,
  strokeWidth: number,
  opacity = 1,
) {
  const iconName = toLucideIconName(name)
  if (!iconName) return ''

  const iconModule = await dynamicIconImports[iconName]()
  const normalizedOpacity = Math.max(0, Math.min(1, opacity))
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${COLLAGE_ICON_VIEWBOX_SIZE}" height="${COLLAGE_ICON_VIEWBOX_SIZE}" viewBox="0 0 ${COLLAGE_ICON_VIEWBOX_SIZE} ${COLLAGE_ICON_VIEWBOX_SIZE}" fill="none" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${normalizedOpacity}">`,
    iconNodeToSvgContent(iconModule.__iconData?.node ?? []),
    '</svg>',
  ].join('')

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function readImageFile(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : ''
      if (!src) {
        reject(new Error('图片读取失败'))
        return
      }

      loadImageSource(src, '图片解析失败').then(resolve, reject)
    }
    reader.readAsDataURL(file)
  })
}

function useCanvasImage(src: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!src) {
      return
    }

    const nextImage = new window.Image()
    if (shouldUseAnonymousCors(src)) {
      nextImage.crossOrigin = 'anonymous'
    }
    nextImage.onload = () => setImage(nextImage)
    nextImage.src = src

    return () => {
      nextImage.onload = null
    }
  }, [src])

  return image
}

function downloadCanvasImage(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  link.click()
}

async function dataUrlToFile(dataUrl: string, filename: string) {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return new File([blob], filename, { type: blob.type || 'image/webp' })
}

function shadowColorWithOpacity(color: string, opacity: number) {
  const normalized = color.trim()
  const alpha = Math.max(0, Math.min(1, opacity))

  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    const red = Number.parseInt(normalized.slice(1, 3), 16)
    const green = Number.parseInt(normalized.slice(3, 5), 16)
    const blue = Number.parseInt(normalized.slice(5, 7), 16)
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`
  }

  return normalized
}

function loadExportImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image()
    if (shouldUseAnonymousCors(src)) {
      image.crossOrigin = 'anonymous'
    }
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片阴影合成失败'))
    image.src = src
  })
}

async function addCanvasShadowToDataUrl(
  dataUrl: string,
  shadow: CanvasShadowSettings,
) {
  if (!shadow.enabled) return dataUrl

  const image = await loadExportImage(dataUrl)
  const blur = Math.max(0, shadow.blur)
  const spread = Math.ceil(
    blur * 2 +
      Math.max(Math.abs(shadow.offsetX), Math.abs(shadow.offsetY), 0) +
      6,
  )
  const canvas = document.createElement('canvas')
  canvas.width = image.width + spread * 2
  canvas.height = image.height + spread * 2

  const context = canvas.getContext('2d')
  if (!context) return dataUrl

  context.shadowColor = shadowColorWithOpacity(shadow.color, shadow.opacity)
  context.shadowBlur = blur
  context.shadowOffsetX = shadow.offsetX
  context.shadowOffsetY = shadow.offsetY
  context.drawImage(image, spread, spread)
  return canvas.toDataURL('image/webp', 0.92)
}

function ImageNode({
  item,
  onChange,
  onDragMove,
  onDragEnd,
  onSelect,
  setNodeRef,
}: {
  item: ImageItem
  onChange: (item: ImageItem) => void
  onDragMove: (item: ImageItem, node: Konva.Node) => void
  onDragEnd: (item: ImageItem, node: Konva.Node) => void
  onSelect: () => void
  setNodeRef: (id: string, node: Konva.Node | null) => void
}) {
  const image = useCanvasImage(item.src)

  return (
    <KonvaImage
      ref={(node) => setNodeRef(item.id, node)}
      image={image || undefined}
      x={item.x}
      y={item.y}
      width={item.width}
      height={item.height}
      rotation={item.rotation}
      scaleX={item.scaleX}
      scaleY={item.scaleY}
      shadowColor={
        item.shadow.enabled
          ? shadowColorWithOpacity(item.shadow.color, item.shadow.opacity)
          : undefined
      }
      shadowBlur={item.shadow.enabled ? item.shadow.blur : 0}
      shadowOffsetX={item.shadow.enabled ? item.shadow.offsetX : 0}
      shadowOffsetY={item.shadow.enabled ? item.shadow.offsetY : 0}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={(event) => onDragMove(item, event.target)}
      onDragEnd={(event) => {
        onDragEnd(item, event.target)
      }}
      onTransformEnd={(event) => {
        const node = event.target
        const size = getTransformedSize({
          width: item.width,
          height: item.height,
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
          minWidth: MIN_IMAGE_SIZE,
          minHeight: MIN_IMAGE_SIZE,
        })
        node.scaleX(1)
        node.scaleY(1)
        onChange({
          ...item,
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: size.width,
          height: size.height,
          scaleX: 1,
          scaleY: 1,
        })
      }}
    />
  )
}

function IconNode({
  item,
  onChange,
  onDragMove,
  onDragEnd,
  onSelect,
  setNodeRef,
}: {
  item: IconItem
  onChange: (item: IconItem) => void
  onDragMove: (item: IconItem, node: Konva.Node) => void
  onDragEnd: (item: IconItem, node: Konva.Node) => void
  onSelect: () => void
  setNodeRef: (id: string, node: Konva.Node | null) => void
}) {
  const [imageSrc, setImageSrc] = useState('')
  const image = useCanvasImage(imageSrc)

  useEffect(() => {
    let cancelled = false
    getCollageIconDataUrl(
      item.name,
      item.stroke,
      item.strokeWidth,
      item.opacity,
    )
      .then((dataUrl) => {
        if (!cancelled) setImageSrc(dataUrl)
      })
      .catch(() => {
        if (!cancelled) setImageSrc('')
      })

    return () => {
      cancelled = true
    }
  }, [item.name, item.opacity, item.stroke, item.strokeWidth])

  return (
    <KonvaImage
      ref={(node) => setNodeRef(item.id, node)}
      image={imageSrc && image ? image : undefined}
      x={item.x}
      y={item.y}
      width={item.width}
      height={item.height}
      rotation={item.rotation}
      scaleX={item.scaleX}
      scaleY={item.scaleY}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={(event) => onDragMove(item, event.target)}
      onDragEnd={(event) => onDragEnd(item, event.target)}
      onTransformEnd={(event) => {
        const node = event.target
        const size = getTransformedSize({
          width: item.width,
          height: item.height,
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
          minWidth: MIN_TRANSFORM_SIZE,
          minHeight: MIN_TRANSFORM_SIZE,
        })
        node.scaleX(1)
        node.scaleY(1)
        onChange({
          ...item,
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: size.width,
          height: size.height,
          scaleX: 1,
          scaleY: 1,
        })
      }}
    />
  )
}

function TextEditOverlay({
  item,
  stageScale,
  onCommit,
  onCancel,
}: {
  item: TextItem
  stageScale: number
  onCommit: (text: string) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(item.text)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const cancelledRef = useRef(false)

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.max(item.fontSize * (item.lineHeight || DEFAULT_COLLAGE_TEXT_STYLE.lineHeight) * stageScale, textarea.scrollHeight)}px`
  }, [item.fontSize, item.lineHeight, stageScale])

  useEffect(() => {
    cancelledRef.current = false
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.select()
      resizeTextarea()
    })
  }, [item.id, resizeTextarea])

  useEffect(() => {
    resizeTextarea()
  }, [draft, resizeTextarea])

  const commit = () => {
    cancelledRef.current = false
    onCommit(draft || '文字')
  }

  const cancel = () => {
    cancelledRef.current = true
    onCancel()
  }

  return (
    <textarea
      ref={textareaRef}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (!cancelledRef.current) commit()
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onPaste={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Escape') {
          event.preventDefault()
          cancel()
        }
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          commit()
        }
      }}
      className="absolute z-30 resize-none overflow-hidden rounded-sm bg-white/95 px-1 py-0.5 shadow-sm outline-none"
      style={{
        left: CANVAS_FRAME_PADDING + item.x,
        top: CANVAS_FRAME_PADDING + item.y,
        width: item.width * stageScale,
        minHeight:
          item.fontSize *
          (item.lineHeight || DEFAULT_COLLAGE_TEXT_STYLE.lineHeight) *
          stageScale,
        color: item.fill,
        border: `1px solid ${CONTROL_COLOR}`,
        fontFamily: item.fontFamily || TEXT_FONT_FAMILY,
        fontSize: item.fontSize * stageScale,
        fontWeight: item.fontWeight || DEFAULT_COLLAGE_TEXT_STYLE.fontWeight,
        fontStyle: item.fontStyle || DEFAULT_COLLAGE_TEXT_STYLE.fontStyle,
        lineHeight: item.lineHeight || DEFAULT_COLLAGE_TEXT_STYLE.lineHeight,
        letterSpacing:
          (item.letterSpacing || DEFAULT_COLLAGE_TEXT_STYLE.letterSpacing) *
          stageScale,
        textAlign: item.align || DEFAULT_COLLAGE_TEXT_STYLE.align,
        transform: `translate(${item.x * stageScale - item.x}px, ${item.y * stageScale - item.y}px) rotate(${item.rotation}deg)`,
        transformOrigin: 'left top',
      }}
    />
  )
}

function ArrowNode({
  item,
  selected,
  onChange,
  onBeginChange,
  onSelect,
}: {
  item: ArrowItem
  selected: boolean
  onChange: (item: ArrowItem, options?: { record?: boolean }) => void
  onBeginChange: () => void
  onSelect: () => void
}) {
  const relativePoints = getArrowRelativePoints(item)
  const anchorRadius = Math.max(7, item.strokeWidth * 0.8)

  return (
    <>
      <Arrow
        x={item.x1}
        y={item.y1}
        points={relativePoints}
        stroke={item.stroke}
        fill={item.stroke}
        strokeWidth={item.strokeWidth}
        pointerLength={Math.max(22, item.strokeWidth * 3.2)}
        pointerWidth={Math.max(22, item.strokeWidth * 3.2)}
        lineCap="round"
        lineJoin="round"
        hitStrokeWidth={Math.max(28, item.strokeWidth + 18)}
        draggable
        onMouseDown={(event) => {
          event.cancelBubble = true
          onSelect()
        }}
        onTouchStart={(event) => {
          event.cancelBubble = true
          onSelect()
        }}
        onClick={(event) => {
          event.cancelBubble = true
          onSelect()
        }}
        onTap={(event) => {
          event.cancelBubble = true
          onSelect()
        }}
        onDragStart={onBeginChange}
        onDragMove={(event) => {
          const node = event.target
          onChange(moveArrowTo(item, node.x(), node.y()), { record: false })
        }}
        onDragEnd={(event) => {
          const node = event.target
          onChange(moveArrowTo(item, node.x(), node.y()), { record: false })
        }}
      />
      {selected && (
        <>
          <Circle
            x={item.x1}
            y={item.y1}
            radius={anchorRadius}
            fill="#ffffff"
            stroke={CONTROL_COLOR}
            strokeWidth={2}
            draggable
            onMouseDown={(event) => {
              event.cancelBubble = true
            }}
            onTouchStart={(event) => {
              event.cancelBubble = true
            }}
            onDragStart={onBeginChange}
            onDragMove={(event) =>
              onChange(
                updateArrowEndpoint(
                  item,
                  'start',
                  event.target.x(),
                  event.target.y(),
                ),
                {
                  record: false,
                },
              )
            }
            onDragEnd={(event) =>
              onChange(
                updateArrowEndpoint(
                  item,
                  'start',
                  event.target.x(),
                  event.target.y(),
                ),
                {
                  record: false,
                },
              )
            }
          />
          <Circle
            x={item.x2}
            y={item.y2}
            radius={anchorRadius}
            fill={CONTROL_COLOR}
            stroke="#ffffff"
            strokeWidth={2}
            draggable
            onMouseDown={(event) => {
              event.cancelBubble = true
            }}
            onTouchStart={(event) => {
              event.cancelBubble = true
            }}
            onDragStart={onBeginChange}
            onDragMove={(event) =>
              onChange(
                updateArrowEndpoint(
                  item,
                  'end',
                  event.target.x(),
                  event.target.y(),
                ),
                {
                  record: false,
                },
              )
            }
            onDragEnd={(event) =>
              onChange(
                updateArrowEndpoint(
                  item,
                  'end',
                  event.target.x(),
                  event.target.y(),
                ),
                {
                  record: false,
                },
              )
            }
          />
        </>
      )}
    </>
  )
}

export function CollageModal({
  open,
  active = true,
  embedded = false,
  insertPos,
  onClose,
  onInsert,
}: CollageModalProps) {
  const [presetKey, setPresetKey] = useState<ActivePresetKey>('article')
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: DEFAULT_CANVAS_PRESET.width,
    height: DEFAULT_CANVAS_PRESET.height,
  })
  const [canvasSizeDraft, setCanvasSizeDraft] = useState({
    width: String(DEFAULT_CANVAS_PRESET.width),
    height: String(DEFAULT_CANVAS_PRESET.height),
  })
  const [items, setItems] = useState<CollageItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [sidePanelMode, setSidePanelMode] =
    useState<SidePanelMode>('properties')
  const [libraryQuery, setLibraryQuery] = useState('')
  const [libraryResults, setLibraryResults] = useState<OpenImageLibraryItem[]>(
    [],
  )
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [librarySearched, setLibrarySearched] = useState(false)
  const [libraryError, setLibraryError] = useState('')
  const [iconQuery, setIconQuery] = useState('')
  const [selectedIconCategory, setSelectedIconCategory] = useState<
    CollageIconCategory | 'all'
  >('all')
  const [recentIconNames, setRecentIconNames] = useState<string[]>([])
  const [alignmentGuides, setAlignmentGuides] = useState<SnapGuide[]>([])
  const [background, setBackground] = useState('#ffffff')
  const [canvasShadow, setCanvasShadow] = useState<CanvasShadowSettings>({
    enabled: false,
    color: '#000000',
    blur: 28,
    opacity: 0.2,
    offsetX: 0,
    offsetY: 14,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [fontLoadStatus, setFontLoadStatus] = useState<
    Record<string, FontLoadStatus>
  >({})
  const modalRef = useRef<HTMLDivElement | null>(null)
  const stageViewportRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<Konva.Stage | null>(null)
  const transformerRef = useRef<Konva.Transformer | null>(null)
  const nodeRefs = useRef(new Map<string, Konva.Node>())
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const historyRef = useRef<CollageHistorySnapshot[]>([])
  const latestSnapshotRef = useRef<CollageHistorySnapshot | null>(null)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId],
  )
  const libraryItems =
    libraryResults.length > 0 ? libraryResults : COLLAGE_OPEN_IMAGE_LIBRARY
  const transformerAnchors =
    selectedItem?.type === 'text'
      ? TEXT_TRANSFORM_ANCHORS
      : selectedItem?.type === 'icon'
        ? ICON_TRANSFORM_ANCHORS
        : IMAGE_TRANSFORM_ANCHORS
  const stageScale = getFitStageScale(
    canvasSize.width,
    canvasSize.height,
    viewportSize.width,
    viewportSize.height,
    30,
  )
  const stageDisplayWidth = Math.max(
    1,
    Math.round(canvasSize.width * stageScale),
  )
  const stageDisplayHeight = Math.max(
    1,
    Math.round(canvasSize.height * stageScale),
  )
  const iconCategories = useMemo(() => getCollageIconCategories(), [])
  const iconResults = useMemo(
    () => searchCollageIcons(iconQuery, selectedIconCategory),
    [iconQuery, selectedIconCategory],
  )
  const recentIcons = useMemo(
    () =>
      recentIconNames
        .map((name) => COLLAGE_ICON_LIBRARY.find((icon) => icon.name === name))
        .filter((icon): icon is CollageIconConfig => Boolean(icon)),
    [recentIconNames],
  )

  latestSnapshotRef.current = {
    presetKey,
    canvasSize,
    items,
    background,
    canvasShadow,
  }

  const captureHistorySnapshot = useCallback(() => {
    const snapshot = latestSnapshotRef.current
    if (!snapshot) return

    historyRef.current = pushCollageHistorySnapshot(
      historyRef.current,
      createCollageHistorySnapshot(snapshot),
    )
    setCanUndo(true)
  }, [])

  const undoLastChange = useCallback(() => {
    const result = popCollageHistorySnapshot(historyRef.current)
    if (!result.snapshot) return

    historyRef.current = result.history
    setCanUndo(historyRef.current.length > 0)

    const snapshot = createCollageHistorySnapshot(result.snapshot)
    setPresetKey(snapshot.presetKey)
    setCanvasSize(snapshot.canvasSize)
    setCanvasSizeDraft({
      width: String(snapshot.canvasSize.width),
      height: String(snapshot.canvasSize.height),
    })
    setItems(snapshot.items)
    setBackground(snapshot.background)
    setCanvasShadow(snapshot.canvasShadow)
    setSelectedId(null)
    setEditingTextId(null)
    setAlignmentGuides([])
    setError(null)
  }, [])

  const loadCollageFontForUi = useCallback(async (font: CollageFontOption) => {
    setFontLoadStatus((current) => ({
      ...current,
      [font.id]: current[font.id] === 'ready' ? 'ready' : 'loading',
    }))

    try {
      await ensureCollageFontLoaded(font)
      setFontLoadStatus((current) => ({ ...current, [font.id]: 'ready' }))
      stageRef.current?.batchDraw()
    } catch {
      setFontLoadStatus((current) => ({ ...current, [font.id]: 'failed' }))
    }
  }, [])

  const setNodeRef = useCallback((id: string, node: Konva.Node | null) => {
    if (node) {
      nodeRefs.current.set(id, node)
    } else {
      nodeRefs.current.delete(id)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const selectedNode =
      selectedItem &&
      selectedItem.type !== 'arrow' &&
      editingTextId !== selectedItem.id
        ? nodeRefs.current.get(selectedItem.id)
        : null
    transformerRef.current?.nodes(selectedNode ? [selectedNode] : [])
    transformerRef.current?.getLayer()?.batchDraw()
  }, [editingTextId, items, open, selectedItem])

  useEffect(() => {
    if (!open || !active) return
    requestAnimationFrame(() =>
      modalRef.current?.focus({ preventScroll: true }),
    )
  }, [active, open])

  useEffect(() => {
    if (!open || !active) return
    setRecentIconNames(getRecentCollageIcons())
  }, [active, open])

  useEffect(() => {
    if (!open || !active) return
    COLLAGE_FONT_OPTIONS.forEach((font) => {
      void loadCollageFontForUi(font)
    })
  }, [active, loadCollageFontForUi, open])

  useEffect(() => {
    if (!open || !active) return
    const element = stageViewportRef.current
    if (!element) return

    let frame = 0
    const updateSize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        setViewportSize({
          width: element.clientWidth,
          height: element.clientHeight,
        })
      })
    }
    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(element)
    updateSize()

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
    }
  }, [active, open])

  useEffect(() => {
    if (!open) {
      setEditingTextId(null)
      historyRef.current = []
      latestSnapshotRef.current = null
      setCanUndo(false)
    }
  }, [open])

  useEffect(() => {
    if (!open || !active) return

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isEditableTarget =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      if (isEditableTarget) return

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undoLastChange()
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      if (!selectedId) return

      event.preventDefault()
      captureHistorySnapshot()
      setItems((current) => current.filter((item) => item.id !== selectedId))
      setSelectedId(null)
      setEditingTextId(null)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    active,
    captureHistorySnapshot,
    onClose,
    open,
    selectedId,
    undoLastChange,
  ])

  const updateItem = useCallback(
    (nextItem: CollageItem, options: { record?: boolean } = {}) => {
      if (options.record !== false) {
        captureHistorySnapshot()
      }
      setItems((current) =>
        current.map((item) => (item.id === nextItem.id ? nextItem : item)),
      )
    },
    [captureHistorySnapshot],
  )

  const selectItem = useCallback((id: string) => {
    setSelectedId(id)
    setSidePanelMode('properties')
  }, [])

  const updateCanvasSize = useCallback(
    (nextSize: CanvasSize, options: { record?: boolean } = {}) => {
      if (options.record !== false) {
        captureHistorySnapshot()
      }
      setPresetKey('custom')
      const clampedSize = clampCanvasSize(nextSize)
      setCanvasSize(clampedSize)
      setCanvasSizeDraft({
        width: String(clampedSize.width),
        height: String(clampedSize.height),
      })
      setAlignmentGuides([])
      setError(null)
    },
    [captureHistorySnapshot],
  )

  const applyPreset = (nextPreset: (typeof CANVAS_PRESETS)[number]) => {
    captureHistorySnapshot()
    setPresetKey(nextPreset.key)
    const nextSize = { width: nextPreset.width, height: nextPreset.height }
    setCanvasSize(nextSize)
    setCanvasSizeDraft({
      width: String(nextSize.width),
      height: String(nextSize.height),
    })
    setAlignmentGuides([])
    setError(null)
  }

  const updateCanvasSizeDraft = (
    dimension: keyof CanvasSize,
    value: string,
  ) => {
    setCanvasSizeDraft((current) => ({ ...current, [dimension]: value }))
  }

  const commitCanvasSizeDraft = (dimension: keyof CanvasSize) => {
    const max = dimension === 'width' ? MAX_CANVAS_WIDTH : MAX_CANVAS_HEIGHT
    const value = parseCanvasDimensionInput(canvasSizeDraft[dimension], max)

    if (!value) {
      setCanvasSizeDraft((current) => ({
        ...current,
        [dimension]: String(canvasSize[dimension]),
      }))
      setError(
        `画布${dimension === 'width' ? '宽度' : '高度'}请输入 1-${max} 的正整数`,
      )
      return
    }

    updateCanvasSize({ ...canvasSize, [dimension]: value })
  }

  const getNodeBounds = (
    item: ImageItem | IconItem | TextItem,
    node: Konva.Node,
  ) => ({
    id: item.id,
    x: node.x(),
    y: node.y(),
    width: item.type === 'text' ? item.width : item.width,
    height:
      item.type === 'text'
        ? Math.max(
            item.fontSize *
              (item.lineHeight || DEFAULT_COLLAGE_TEXT_STYLE.lineHeight),
            node.height(),
          )
        : item.height,
  })

  const snapNodeDuringDrag = (
    item: ImageItem | IconItem | TextItem,
    node: Konva.Node,
  ) => {
    const activeBounds = getNodeBounds(item, node)
    const otherBounds = items
      .map(getItemBounds)
      .filter(
        (bounds): bounds is NonNullable<ReturnType<typeof getItemBounds>> =>
          Boolean(bounds),
      )
    const guides = findSnapGuides({
      bounds: otherBounds,
      canvasSize,
      activeBounds,
      threshold: SNAP_GUIDE_OFFSET / stageScale,
    })
    const snapped = applySnapGuides(node.x(), node.y(), guides)
    node.position(snapped)
    setAlignmentGuides(guides)
  }

  const endNodeDrag = (
    item: ImageItem | IconItem | TextItem,
    node: Konva.Node,
  ) => {
    setAlignmentGuides([])
    updateItem({ ...item, x: node.x(), y: node.y() })
  }

  const beginCanvasResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    captureHistorySnapshot()
    const startX = event.clientX
    const startY = event.clientY
    const startSize = canvasSize

    const onPointerMove = (moveEvent: PointerEvent) => {
      const nextWidth =
        startSize.width + (moveEvent.clientX - startX) / stageScale
      const nextHeight =
        startSize.height + (moveEvent.clientY - startY) / stageScale
      updateCanvasSize(
        { width: nextWidth, height: nextHeight },
        { record: false },
      )
    }

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  const addLoadedImages = useCallback(
    (loaded: LoadedImage[]) => {
      if (loaded.length === 0) return

      captureHistorySnapshot()
      const imageIds = loaded.map(() => createId('image'))
      setItems((current) => {
        const hasImages = current.some((item) => item.type === 'image')
        const imageItems = hasImages
          ? loaded.map((image, index) => {
              const fitted = fitImageIntoBox(
                image,
                canvasSize.width * 0.42,
                canvasSize.height * 0.42,
              )
              return {
                id: imageIds[index] || createId('image'),
                type: 'image' as const,
                src: image.src,
                x: Math.max(
                  24,
                  canvasSize.width / 2 - fitted.width / 2 + index * 24,
                ),
                y: Math.max(
                  24,
                  canvasSize.height / 2 - fitted.height / 2 + index * 24,
                ),
                width: fitted.width,
                height: fitted.height,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                shadow: createDefaultImageShadow(),
              }
            })
          : layoutImages(
              loaded,
              canvasSize.width,
              canvasSize.height,
              (() => {
                let index = 0
                return () => imageIds[index++] || createId('image')
              })(),
            )

        return [...current, ...imageItems]
      })

      const selectedImageId = imageIds.at(-1)
      if (selectedImageId) selectItem(selectedImageId)
    },
    [canvasSize.height, canvasSize.width, captureHistorySnapshot, selectItem],
  )

  const addImages = useCallback(
    async (files: File[]) => {
      const imageFiles = files.filter(isImageFile)
      if (imageFiles.length === 0) return

      setBusy(true)
      setError(null)

      try {
        const loaded = await Promise.all(imageFiles.map(readImageFile))
        addLoadedImages(loaded)
      } catch (nextError) {
        setError(
          nextError instanceof Error ? nextError.message : '图片处理失败',
        )
      } finally {
        setBusy(false)
      }
    },
    [addLoadedImages],
  )

  const addOpenLibraryImage = useCallback(
    async (item: OpenImageLibraryItem) => {
      setBusy(true)
      setError(null)

      try {
        if (item.downloadLocation) {
          await fetch(
            `/api/editor/unsplash?action=download&downloadLocation=${encodeURIComponent(item.downloadLocation)}`,
          ).catch(() => null)
        }
        const loaded = await loadImageSource(item.src, '图库图片加载失败')
        addLoadedImages([loaded])
        setSidePanelMode('properties')
      } catch (nextError) {
        setError(
          nextError instanceof Error ? nextError.message : '图库图片加载失败',
        )
      } finally {
        setBusy(false)
      }
    },
    [addLoadedImages],
  )

  const searchOpenLibrary = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault()
      const query = libraryQuery.trim()

      if (!query) {
        setLibraryResults([])
        setLibrarySearched(false)
        setLibraryError('')
        return
      }

      setLibraryLoading(true)
      setLibrarySearched(true)
      setLibraryError('')

      try {
        const params = new URLSearchParams({
          q: query,
          per_page: '12',
        })
        const res = await fetch(`/api/editor/unsplash?${params.toString()}`)
        const data = (await res.json().catch(() => ({}))) as {
          items?: OpenImageLibraryItem[]
          error?: string
        }

        if (!res.ok) {
          throw new Error(data.error || '图库搜索失败')
        }

        setLibraryResults(Array.isArray(data.items) ? data.items : [])
      } catch (nextError) {
        setLibraryResults([])
        setLibraryError(
          nextError instanceof Error ? nextError.message : '图库搜索失败',
        )
      } finally {
        setLibraryLoading(false)
      }
    },
    [libraryQuery],
  )

  const handleFiles = useCallback(
    (fileList: FileList | File[] | null | undefined) => {
      const files = fileList ? Array.from(fileList) : []
      void addImages(files)
    },
    [addImages],
  )

  useEffect(() => {
    if (!open || !active) return

    const onPaste = (event: ClipboardEvent) => {
      const directFiles = Array.from(event.clipboardData?.files || [])
      const itemFiles = Array.from(event.clipboardData?.items || [])
        .map((item) => (item.kind === 'file' ? item.getAsFile() : null))
        .filter((file): file is File => Boolean(file))
      const imageFiles = getImageFiles(
        directFiles.length > 0 ? directFiles : itemFiles,
      )
      const targetInsideModal =
        event.target instanceof Node &&
        Boolean(modalRef.current?.contains(event.target))

      if (
        !shouldInterceptCollagePaste({
          hasImageFiles: imageFiles.length > 0,
          targetInsideModal,
        })
      )
        return

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()

      if (imageFiles.length > 0) {
        void addImages(imageFiles)
      }
    }

    document.addEventListener('paste', onPaste, true)
    return () => document.removeEventListener('paste', onPaste, true)
  }, [active, addImages, open])

  const addText = () => {
    captureHistorySnapshot()
    const fontSize = Math.min(
      96,
      Math.max(42, Math.round(canvasSize.width / 24)),
    )
    const item: TextItem = {
      id: createId('text'),
      type: 'text',
      text: '文字',
      x: canvasSize.width * 0.12,
      y: canvasSize.height * 0.12,
      width: Math.min(
        Math.max(360, canvasSize.width * 0.46),
        canvasSize.width * 0.72,
      ),
      fontSize,
      fill: '#111111',
      ...DEFAULT_COLLAGE_TEXT_STYLE,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    }
    setItems((current) => [...current, item])
    selectItem(item.id)
  }

  const addArrow = () => {
    captureHistorySnapshot()
    const item: ArrowItem = {
      id: createId('arrow'),
      type: 'arrow',
      x1: canvasSize.width * 0.28,
      y1: canvasSize.height * 0.48,
      x2: canvasSize.width * 0.62,
      y2: canvasSize.height * 0.48,
      stroke: '#ef4444',
      strokeWidth: 8,
    }
    setItems((current) => [...current, item])
    selectItem(item.id)
  }

  const addIcon = async (icon: CollageIconConfig) => {
    const iconName = toLucideIconName(icon.name)
    if (!iconName) {
      setError('这个图标当前不可用')
      return
    }

    setBusy(true)
    setError(null)
    try {
      await dynamicIconImports[iconName]()
      captureHistorySnapshot()
      const size = Math.min(
        180,
        Math.max(
          88,
          Math.round(Math.min(canvasSize.width, canvasSize.height) * 0.16),
        ),
      )
      const item: IconItem = {
        id: createId('icon'),
        type: 'icon',
        name: icon.name,
        x: canvasSize.width / 2 - size / 2,
        y: canvasSize.height / 2 - size / 2,
        width: size,
        height: size,
        stroke: '#111111',
        strokeWidth: 2.4,
        opacity: 1,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      }
      setItems((current) => [...current, item])
      selectItem(item.id)
      setEditingTextId(null)
      setRecentIconNames(addRecentCollageIcon(icon.name))
    } catch {
      setError('图标加载失败')
    } finally {
      setBusy(false)
    }
  }

  const arrangeGrid = () => {
    const images = items.filter(
      (item): item is ImageItem => item.type === 'image',
    )
    if (images.length === 0) return

    captureHistorySnapshot()
    const loaded = images.map((item) => ({
      src: item.src,
      width: item.width * item.scaleX,
      height: item.height * item.scaleY,
    }))
    const nextImages = layoutImages(loaded, canvasSize.width, canvasSize.height)
    let imageIndex = 0

    setItems((current) =>
      current.map((item) => {
        if (item.type !== 'image') return item
        const nextImage = nextImages[imageIndex]
        imageIndex += 1
        return { ...nextImage, id: item.id, src: item.src, shadow: item.shadow }
      }),
    )
  }

  const removeSelected = () => {
    if (!selectedId) return
    captureHistorySnapshot()
    setItems((current) => current.filter((item) => item.id !== selectedId))
    setSelectedId(null)
    setEditingTextId(null)
  }

  const duplicateSelected = () => {
    if (!selectedItem) return

    captureHistorySnapshot()
    const nextId = createId(selectedItem.type)
    const nextItem: CollageItem =
      selectedItem.type === 'arrow'
        ? {
            ...selectedItem,
            id: nextId,
            x1: selectedItem.x1 + 24,
            y1: selectedItem.y1 + 24,
            x2: selectedItem.x2 + 24,
            y2: selectedItem.y2 + 24,
          }
        : {
            ...selectedItem,
            id: nextId,
            x: selectedItem.x + 24,
            y: selectedItem.y + 24,
          }

    setItems((current) => {
      const index = current.findIndex((item) => item.id === selectedItem.id)
      if (index < 0) return [...current, nextItem]
      return [
        ...current.slice(0, index + 1),
        nextItem,
        ...current.slice(index + 1),
      ]
    })
    selectItem(nextId)
    setEditingTextId(null)
  }

  const moveSelectedLayer = (
    direction: 'forward' | 'backward' | 'front' | 'back',
  ) => {
    if (!selectedId) return

    captureHistorySnapshot()
    setItems((current) => {
      const index = current.findIndex((item) => item.id === selectedId)
      if (index < 0) return current

      const next = [...current]
      const [item] = next.splice(index, 1)
      if (!item) return current

      if (direction === 'front') {
        next.push(item)
      } else if (direction === 'back') {
        next.unshift(item)
      } else {
        const targetIndex =
          direction === 'forward'
            ? Math.min(next.length, index + 1)
            : Math.max(0, index - 1)
        next.splice(targetIndex, 0, item)
      }

      return next
    })
  }

  const exportDataUrl = async () => {
    const stage = stageRef.current
    if (!stage) return ''
    const usedFonts = new Map<string, CollageFontOption>()
    items.forEach((item) => {
      if (item.type !== 'text') return
      const font = findCollageFontByFamily(item.fontFamily)
      if (font) usedFonts.set(font.id, font)
    })
    await Promise.allSettled(
      Array.from(usedFonts.values()).map((font) =>
        ensureCollageFontLoaded(font),
      ),
    )
    const iconExports = await Promise.all(
      items.map(async (item) => {
        if (item.type !== 'icon') return null
        const dataUrl = await getCollageIconDataUrl(
          item.name,
          item.stroke,
          item.strokeWidth,
          item.opacity,
        )
        if (!dataUrl) return null
        const loaded = await loadImageSource(dataUrl, '图标导出失败')
        return { id: item.id, loaded }
      }),
    )
    const iconExportMap = new Map(
      iconExports
        .filter((entry): entry is { id: string; loaded: LoadedImage } =>
          Boolean(entry),
        )
        .map((entry) => [entry.id, entry.loaded]),
    )
    flushSync(() => {
      setItems((current) =>
        current.map((item) => {
          if (item.type !== 'icon') return item
          const exportIcon = iconExportMap.get(item.id)
          if (!exportIcon) return item
          return {
            id: item.id,
            type: 'image',
            src: exportIcon.src,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            rotation: item.rotation,
            scaleX: item.scaleX,
            scaleY: item.scaleY,
            shadow: createDefaultImageShadow(),
          }
        }),
      )
      setSelectedId(null)
      setEditingTextId(null)
      setAlignmentGuides([])
    })
    transformerRef.current?.nodes([])
    const previous = {
      width: stage.width(),
      height: stage.height(),
      scaleX: stage.scaleX(),
      scaleY: stage.scaleY(),
    }
    stage.width(canvasSize.width)
    stage.height(canvasSize.height)
    stage.scale({ x: 1, y: 1 })
    stage.draw()
    await waitForNextFrame()
    const dataUrl = stage.toDataURL({
      mimeType: 'image/webp',
      quality: 0.92,
      pixelRatio: 2,
    })
    flushSync(() => {
      setItems(items)
    })
    stage.width(previous.width)
    stage.height(previous.height)
    stage.scale({ x: previous.scaleX, y: previous.scaleY })
    stage.batchDraw()
    return addCanvasShadowToDataUrl(dataUrl, canvasShadow)
  }

  const handleDownload = async () => {
    const dataUrl = await exportDataUrl()
    if (dataUrl) downloadCanvasImage(dataUrl, `collage-${Date.now()}.webp`)
  }

  const handleInsert = async () => {
    if (items.length === 0) {
      setError('先添加图片、文字或箭头')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const dataUrl = await exportDataUrl()
      if (!dataUrl) throw new Error('拼图导出失败')
      const file = await dataUrlToFile(dataUrl, `collage-${Date.now()}.webp`)
      await onInsert(file, insertPos)
      onClose()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '拼图插入失败')
    } finally {
      setBusy(false)
    }
  }

  const updateSelectedText = (updates: Partial<TextItem>) => {
    if (!selectedItem || selectedItem.type !== 'text') return
    updateItem({ ...selectedItem, ...updates })
  }

  const updateSelectedImageShadow = (updates: Partial<ShadowSettings>) => {
    if (!selectedItem || selectedItem.type !== 'image') return
    updateItem({
      ...selectedItem,
      shadow: {
        ...selectedItem.shadow,
        ...updates,
      },
    })
  }

  const updateSelectedIcon = (updates: Partial<IconItem>) => {
    if (!selectedItem || selectedItem.type !== 'icon') return
    updateItem({ ...selectedItem, ...updates })
  }

  const updateSelectedArrow = (updates: Partial<ArrowItem>) => {
    if (!selectedItem || selectedItem.type !== 'arrow') return
    updateItem({ ...selectedItem, ...updates })
  }

  const updateCanvasShadow = (updates: Partial<CanvasShadowSettings>) => {
    captureHistorySnapshot()
    setCanvasShadow((current) => ({ ...current, ...updates }))
  }

  const updateBackground = (nextBackground: string) => {
    captureHistorySnapshot()
    setBackground(nextBackground)
  }

  if (!open) return null

  return (
    <div
      ref={modalRef}
      role={embedded ? undefined : 'dialog'}
      aria-modal={embedded ? undefined : 'true'}
      tabIndex={-1}
      className={
        embedded
          ? 'flex h-full min-h-0 w-full overflow-hidden bg-[var(--background)]'
          : 'fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm'
      }
      onDrop={(event) => {
        event.preventDefault()
        handleFiles(event.dataTransfer.files)
      }}
      onDragOver={(event) => event.preventDefault()}
    >
      <div
        className={
          embedded
            ? 'flex h-full min-h-0 w-full overflow-hidden bg-[var(--background)]'
            : 'flex h-[min(820px,92vh)] w-[min(1180px,96vw)] overflow-hidden rounded-xl border border-[var(--editor-line)] bg-[var(--background)] shadow-2xl'
        }
      >
        <div className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-[var(--editor-line)] bg-[var(--editor-panel)] px-2 py-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--editor-muted)] transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-accent)]"
            title="添加图片"
            aria-label="添加图片"
          >
            <ImagePlus className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setSidePanelMode('library')}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition ${
              sidePanelMode === 'library'
                ? 'bg-[var(--editor-accent)]/10 text-[var(--editor-accent)]'
                : 'text-[var(--editor-muted)] hover:bg-[var(--editor-soft)] hover:text-[var(--editor-accent)]'
            }`}
            title="开放图库"
            aria-label="开放图库"
          >
            <Images className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={addText}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--editor-muted)] transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-accent)]"
            title="添加文字"
            aria-label="添加文字"
          >
            <Type className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={addArrow}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--editor-muted)] transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-accent)]"
            title="添加箭头"
            aria-label="添加箭头"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setSidePanelMode('icons')}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition ${
              sidePanelMode === 'icons'
                ? 'bg-[var(--editor-accent)]/10 text-[var(--editor-accent)]'
                : 'text-[var(--editor-muted)] hover:bg-[var(--editor-soft)] hover:text-[var(--editor-accent)]'
            }`}
            title="图标库"
            aria-label="图标库"
          >
            <Shapes className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={undoLastChange}
            disabled={!canUndo}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--editor-muted)] transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-accent)] disabled:cursor-not-allowed disabled:opacity-35"
            title="撤销"
            aria-label="撤销"
          >
            <Undo2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={arrangeGrid}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--editor-muted)] transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-accent)]"
            title="宫格排列"
            aria-label="宫格排列"
          >
            <Grid2X2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={duplicateSelected}
            disabled={!selectedId}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--editor-muted)] transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-accent)] disabled:cursor-not-allowed disabled:opacity-35"
            title="复制选中"
            aria-label="复制选中"
          >
            <Copy className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={removeSelected}
            disabled={!selectedId}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--editor-muted)] transition hover:bg-[var(--editor-soft)] hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-35"
            title="删除选中"
            aria-label="删除选中"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          {!embedded ? (
            <div className="mt-auto">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--editor-muted)] transition hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)]"
                title="关闭"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-[var(--editor-line)] px-4 py-2">
            <div className="flex flex-wrap items-center gap-2">
              {CANVAS_PRESETS.map((nextPreset) => (
                <button
                  key={nextPreset.key}
                  type="button"
                  onClick={() => applyPreset(nextPreset)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    presetKey === nextPreset.key
                      ? 'bg-[var(--editor-accent)] text-white'
                      : 'border border-[var(--editor-line)] text-[var(--editor-muted)] hover:bg-[var(--editor-soft)] hover:text-[var(--editor-ink)]'
                  }`}
                >
                  {nextPreset.label}
                </button>
              ))}
              <div className="ml-2 flex items-center gap-1 text-xs text-[var(--editor-muted)]">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={canvasSizeDraft.width}
                  onChange={(event) =>
                    updateCanvasSizeDraft('width', event.target.value)
                  }
                  onBlur={() => commitCanvasSizeDraft('width')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commitCanvasSizeDraft('width')
                  }}
                  className="h-7 w-20 rounded border border-[var(--editor-line)] bg-[var(--background)] px-2 text-xs text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
                  aria-label="画布宽度"
                />
                <span>x</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={canvasSizeDraft.height}
                  onChange={(event) =>
                    updateCanvasSizeDraft('height', event.target.value)
                  }
                  onBlur={() => commitCanvasSizeDraft('height')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commitCanvasSizeDraft('height')
                  }}
                  className="h-7 w-20 rounded border border-[var(--editor-line)] bg-[var(--background)] px-2 text-xs text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
                  aria-label="画布高度"
                />
              </div>
              <label className="ml-2 inline-flex items-center gap-2 text-xs text-[var(--editor-muted)]">
                <span>背景</span>
                <input
                  type="color"
                  value={background}
                  onChange={(event) => updateBackground(event.target.value)}
                  className="h-7 w-8 cursor-pointer rounded border border-[var(--editor-line)] bg-transparent"
                />
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={items.length === 0 || busy}
                className="rounded-md border border-[var(--editor-line)] px-3 py-1.5 text-sm text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                导出
              </button>
              <button
                type="button"
                onClick={() => void handleInsert()}
                disabled={items.length === 0 || busy}
                className="inline-flex items-center gap-1.5 rounded-md bg-[var(--editor-accent)] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <Send className="h-3.5 w-3.5" />
                {busy ? '处理中...' : '插入文章'}
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1">
            <div
              ref={stageViewportRef}
              className="flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-[var(--editor-app-bg)] p-4"
            >
              <div
                className="relative rounded-lg border border-[var(--editor-line)] bg-[var(--background)] p-2"
                style={{
                  width: stageDisplayWidth + CANVAS_FRAME_PADDING * 2,
                  height: stageDisplayHeight + CANVAS_FRAME_PADDING * 2,
                  boxShadow: canvasShadow.enabled
                    ? `0 ${Math.max(8, canvasShadow.offsetY)}px ${Math.max(18, canvasShadow.blur * 1.4)}px ${shadowColorWithOpacity(canvasShadow.color, canvasShadow.opacity)}`
                    : 'none',
                }}
              >
                <Stage
                  ref={stageRef}
                  width={stageDisplayWidth}
                  height={stageDisplayHeight}
                  scaleX={stageScale}
                  scaleY={stageScale}
                  onMouseDown={(event) => {
                    if (event.target === event.target.getStage()) {
                      setSelectedId(null)
                      setEditingTextId(null)
                    }
                  }}
                  onTouchStart={(event) => {
                    if (event.target === event.target.getStage()) {
                      setSelectedId(null)
                      setEditingTextId(null)
                    }
                  }}
                  className="overflow-hidden rounded-md"
                >
                  <Layer>
                    <Rect
                      x={0}
                      y={0}
                      width={canvasSize.width}
                      height={canvasSize.height}
                      fill={background}
                      onClick={() => {
                        setSelectedId(null)
                        setEditingTextId(null)
                      }}
                      onTap={() => {
                        setSelectedId(null)
                        setEditingTextId(null)
                      }}
                    />
                    {items.map((item) => {
                      if (item.type === 'image') {
                        return (
                          <ImageNode
                            key={item.id}
                            item={item}
                            onChange={updateItem}
                            onDragMove={snapNodeDuringDrag}
                            onDragEnd={endNodeDrag}
                            onSelect={() => {
                              selectItem(item.id)
                              setEditingTextId(null)
                            }}
                            setNodeRef={setNodeRef}
                          />
                        )
                      }

                      if (item.type === 'text') {
                        return (
                          <Text
                            key={item.id}
                            ref={(node) => setNodeRef(item.id, node)}
                            x={item.x}
                            y={item.y}
                            text={item.text}
                            width={item.width}
                            fontSize={item.fontSize}
                            fill={item.fill}
                            fontFamily={item.fontFamily || TEXT_FONT_FAMILY}
                            fontStyle={getKonvaTextFontStyle(item)}
                            align={
                              item.align || DEFAULT_COLLAGE_TEXT_STYLE.align
                            }
                            lineHeight={
                              item.lineHeight ||
                              DEFAULT_COLLAGE_TEXT_STYLE.lineHeight
                            }
                            letterSpacing={
                              item.letterSpacing ||
                              DEFAULT_COLLAGE_TEXT_STYLE.letterSpacing
                            }
                            rotation={item.rotation}
                            scaleX={item.scaleX}
                            scaleY={item.scaleY}
                            draggable={editingTextId !== item.id}
                            onClick={() => {
                              selectItem(item.id)
                              setEditingTextId(null)
                            }}
                            onTap={() => {
                              selectItem(item.id)
                              setEditingTextId(null)
                            }}
                            onDblClick={() => {
                              selectItem(item.id)
                              setEditingTextId(item.id)
                            }}
                            onDblTap={() => {
                              selectItem(item.id)
                              setEditingTextId(item.id)
                            }}
                            onDragMove={(event) =>
                              snapNodeDuringDrag(item, event.target)
                            }
                            onDragEnd={(event) =>
                              endNodeDrag(item, event.target)
                            }
                            onTransformEnd={(event) => {
                              const node = event.target
                              const width = getTransformedTextWidth(
                                item.width,
                                node.scaleX(),
                              )
                              node.scaleX(1)
                              node.scaleY(1)
                              updateItem({
                                ...item,
                                x: node.x(),
                                y: node.y(),
                                rotation: node.rotation(),
                                width,
                                scaleX: 1,
                                scaleY: 1,
                              })
                            }}
                          />
                        )
                      }

                      if (item.type === 'icon') {
                        return (
                          <IconNode
                            key={item.id}
                            item={item}
                            onChange={updateItem}
                            onDragMove={snapNodeDuringDrag}
                            onDragEnd={endNodeDrag}
                            onSelect={() => {
                              selectItem(item.id)
                              setEditingTextId(null)
                            }}
                            setNodeRef={setNodeRef}
                          />
                        )
                      }

                      return (
                        <ArrowNode
                          key={item.id}
                          item={item}
                          selected={selectedId === item.id}
                          onChange={updateItem}
                          onBeginChange={captureHistorySnapshot}
                          onSelect={() => {
                            selectItem(item.id)
                            setEditingTextId(null)
                          }}
                        />
                      )
                    })}
                    {alignmentGuides.map((guide) => (
                      <KonvaLine
                        key={`${guide.orientation}-${guide.lineGuide}`}
                        points={
                          guide.orientation === 'V'
                            ? [
                                guide.lineGuide,
                                0,
                                guide.lineGuide,
                                canvasSize.height,
                              ]
                            : [
                                0,
                                guide.lineGuide,
                                canvasSize.width,
                                guide.lineGuide,
                              ]
                        }
                        stroke={SNAP_GUIDE_COLOR}
                        strokeWidth={1 / stageScale}
                        dash={[6 / stageScale, 6 / stageScale]}
                        listening={false}
                      />
                    ))}
                    <Transformer
                      ref={transformerRef}
                      rotateEnabled
                      flipEnabled={false}
                      enabledAnchors={transformerAnchors}
                      borderStroke={CONTROL_COLOR}
                      anchorStroke={CONTROL_COLOR}
                      anchorFill="#ffffff"
                      anchorSize={9}
                      ignoreStroke
                      boundBoxFunc={(oldBox, newBox) =>
                        Math.abs(newBox.width) < MIN_TRANSFORM_SIZE ||
                        Math.abs(newBox.height) < MIN_TRANSFORM_SIZE
                          ? oldBox
                          : newBox
                      }
                    />
                  </Layer>
                </Stage>
                {selectedItem?.type === 'text' &&
                  editingTextId === selectedItem.id && (
                    <TextEditOverlay
                      key={selectedItem.id}
                      item={selectedItem}
                      stageScale={stageScale}
                      onCommit={(text) => {
                        updateItem({ ...selectedItem, text })
                        setEditingTextId(null)
                      }}
                      onCancel={() => setEditingTextId(null)}
                    />
                  )}
                {items.length === 0 && (
                  <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm text-[var(--stone-gray)]">
                    粘贴或拖入图片
                  </div>
                )}
                <button
                  type="button"
                  onPointerDown={beginCanvasResize}
                  className="absolute -bottom-2 -right-2 h-5 w-5 rounded-full border border-[var(--editor-line)] bg-[var(--background)] shadow-sm"
                  style={{ cursor: 'nwse-resize' }}
                  title="拖拽调整画布大小"
                  aria-label="拖拽调整画布大小"
                />
              </div>
            </div>

            <aside className="w-64 shrink-0 overflow-y-auto border-l border-[var(--editor-line)] bg-[var(--editor-panel)] p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  handleFiles(event.target.files)
                  event.currentTarget.value = ''
                }}
              />

              <div className="mb-4 grid grid-cols-3 gap-1 rounded-lg bg-[var(--editor-soft)] p-1">
                <button
                  type="button"
                  onClick={() => setSidePanelMode('properties')}
                  className={`rounded-md px-2 py-1.5 text-xs font-medium transition ${
                    sidePanelMode === 'properties'
                      ? 'bg-white text-[var(--editor-ink)] shadow-sm'
                      : 'text-[var(--editor-muted)] hover:text-[var(--editor-ink)]'
                  }`}
                >
                  属性
                </button>
                <button
                  type="button"
                  onClick={() => setSidePanelMode('library')}
                  className={`rounded-md px-2 py-1.5 text-xs font-medium transition ${
                    sidePanelMode === 'library'
                      ? 'bg-white text-[var(--editor-ink)] shadow-sm'
                      : 'text-[var(--editor-muted)] hover:text-[var(--editor-ink)]'
                  }`}
                >
                  图库
                </button>
                <button
                  type="button"
                  onClick={() => setSidePanelMode('icons')}
                  className={`rounded-md px-2 py-1.5 text-xs font-medium transition ${
                    sidePanelMode === 'icons'
                      ? 'bg-white text-[var(--editor-ink)] shadow-sm'
                      : 'text-[var(--editor-muted)] hover:text-[var(--editor-ink)]'
                  }`}
                >
                  图标
                </button>
              </div>

              {sidePanelMode === 'library' ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-[var(--stone-gray)]">
                      开放图库
                    </div>
                    <div className="mt-1 text-xs leading-5 text-[var(--editor-muted)]">
                      搜索 Unsplash 或使用内置素材。
                    </div>
                  </div>
                  <form
                    onSubmit={(event) => void searchOpenLibrary(event)}
                    className="flex gap-2"
                  >
                    <input
                      type="search"
                      value={libraryQuery}
                      onChange={(event) => setLibraryQuery(event.target.value)}
                      placeholder="搜索图片"
                      className="min-w-0 flex-1 rounded-md border border-[var(--editor-line)] bg-white px-2.5 py-2 text-sm text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
                    />
                    <button
                      type="submit"
                      disabled={libraryLoading}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--editor-accent)] text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                      title="搜索"
                      aria-label="搜索"
                    >
                      {libraryLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </button>
                  </form>
                  {librarySearched && !libraryLoading ? (
                    <div className="text-xs text-[var(--editor-muted)]">
                      {libraryResults.length > 0
                        ? `找到 ${libraryResults.length} 张图片`
                        : '未找到结果'}
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2">
                    {libraryItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => void addOpenLibraryImage(item)}
                        disabled={busy}
                        className="group overflow-hidden rounded-lg border border-[var(--editor-line)] bg-white text-left transition hover:border-[var(--editor-accent)] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          crossOrigin="anonymous"
                          className="aspect-[4/3] w-full object-cover"
                          loading="lazy"
                        />
                        <div className="space-y-0.5 px-2 py-2">
                          <div className="truncate text-xs font-semibold text-[var(--editor-ink)]">
                            {item.title}
                          </div>
                          <div className="truncate text-[11px] text-[var(--editor-muted)]">
                            {item.category} · {item.source}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {libraryError && (
                    <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      {libraryError}
                    </div>
                  )}
                  {error && (
                    <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {error}
                    </div>
                  )}
                </div>
              ) : sidePanelMode === 'icons' ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-[var(--stone-gray)]">
                      图标库
                    </div>
                    <div className="mt-1 text-xs leading-5 text-[var(--editor-muted)]">
                      搜索 Lucide 图标，插入后可调颜色、线宽和透明度。
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--editor-muted)]" />
                    <input
                      type="search"
                      value={iconQuery}
                      onChange={(event) => setIconQuery(event.target.value)}
                      placeholder="搜索图标"
                      className="w-full rounded-md border border-[var(--editor-line)] bg-white py-2 pl-8 pr-2.5 text-sm text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
                    />
                  </div>
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {(['all', ...iconCategories] as const).map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setSelectedIconCategory(category)}
                        className={`shrink-0 rounded-md border px-2 py-1 text-xs transition ${
                          selectedIconCategory === category
                            ? 'border-[var(--editor-accent)] bg-[var(--editor-accent)] text-white'
                            : 'border-[var(--editor-line)] bg-white text-[var(--editor-muted)] hover:text-[var(--editor-ink)]'
                        }`}
                      >
                        {category === 'all' ? '全部' : category}
                      </button>
                    ))}
                  </div>
                  {recentIcons.length > 0 &&
                  selectedIconCategory === 'all' &&
                  !iconQuery.trim() ? (
                    <div>
                      <div className="mb-2 text-xs font-medium text-[var(--editor-muted)]">
                        最近使用
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {recentIcons.map((icon) => {
                          const iconName = toLucideIconName(icon.name)
                          return (
                            <button
                              key={`recent-${icon.name}`}
                              type="button"
                              onClick={() => void addIcon(icon)}
                              className="flex aspect-square flex-col items-center justify-center rounded-lg border border-[var(--editor-line)] bg-white p-2 text-[var(--editor-ink)] transition hover:border-[var(--editor-accent)] hover:text-[var(--editor-accent)]"
                              title={icon.name}
                            >
                              {iconName ? (
                                <DynamicIcon
                                  name={iconName}
                                  className="h-5 w-5"
                                />
                              ) : (
                                <Shapes className="h-5 w-5" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-4 gap-2">
                    {iconResults.map((icon) => {
                      const iconName = toLucideIconName(icon.name)
                      return (
                        <button
                          key={icon.name}
                          type="button"
                          onClick={() => void addIcon(icon)}
                          disabled={!iconName || busy}
                          className="group flex aspect-square flex-col items-center justify-center rounded-lg border border-[var(--editor-line)] bg-white p-2 text-[var(--editor-ink)] transition hover:border-[var(--editor-accent)] hover:text-[var(--editor-accent)] disabled:cursor-not-allowed disabled:opacity-40"
                          title={icon.name}
                        >
                          {iconName ? (
                            <DynamicIcon name={iconName} className="h-5 w-5" />
                          ) : (
                            <Shapes className="h-5 w-5" />
                          )}
                          <span className="mt-1 w-full truncate text-center text-[9px] text-[var(--editor-muted)] group-hover:text-[var(--editor-accent)]">
                            {icon.name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {iconResults.length === 0 ? (
                    <div className="rounded-md bg-white px-3 py-6 text-center text-sm text-[var(--editor-muted)]">
                      未找到图标
                    </div>
                  ) : null}
                  {error && (
                    <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {error}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-[var(--stone-gray)]">
                      选中对象
                    </div>
                    <div className="mt-2 text-sm text-[var(--editor-ink)]">
                      {selectedItem
                        ? selectedItem.type === 'image'
                          ? '图片'
                          : selectedItem.type === 'text'
                            ? '文字'
                            : selectedItem.type === 'icon'
                              ? '图标'
                              : '箭头'
                        : '未选择'}
                    </div>
                  </div>

                  {selectedItem ? (
                    <div className="border-t border-[var(--editor-line)] pt-4">
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--stone-gray)]">
                        <Layers className="h-3.5 w-3.5" />
                        图层
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => moveSelectedLayer('forward')}
                          className="inline-flex items-center justify-center gap-1 rounded-md border border-[var(--editor-line)] px-2 py-1.5 text-xs text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)]"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                          上移
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSelectedLayer('backward')}
                          className="inline-flex items-center justify-center gap-1 rounded-md border border-[var(--editor-line)] px-2 py-1.5 text-xs text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)]"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                          下移
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSelectedLayer('front')}
                          className="rounded-md border border-[var(--editor-line)] px-2 py-1.5 text-xs text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)]"
                        >
                          置顶
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSelectedLayer('back')}
                          className="rounded-md border border-[var(--editor-line)] px-2 py-1.5 text-xs text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)]"
                        >
                          置底
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={duplicateSelected}
                        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--editor-line)] px-2 py-1.5 text-xs text-[var(--editor-ink)] transition hover:bg-[var(--editor-soft)]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        复制选中
                      </button>
                    </div>
                  ) : null}

                  <div className="border-t border-[var(--editor-line)] pt-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-[var(--stone-gray)]">
                      画布
                    </div>
                    <label className="mt-3 flex items-center justify-between gap-3 text-xs font-medium text-[var(--editor-muted)]">
                      <span>导出阴影</span>
                      <input
                        type="checkbox"
                        checked={canvasShadow.enabled}
                        onChange={(event) =>
                          updateCanvasShadow({ enabled: event.target.checked })
                        }
                      />
                    </label>
                    {canvasShadow.enabled && (
                      <div className="mt-3 space-y-3">
                        <label className="block text-xs font-medium text-[var(--editor-muted)]">
                          颜色
                          <input
                            type="color"
                            value={canvasShadow.color}
                            onChange={(event) =>
                              updateCanvasShadow({ color: event.target.value })
                            }
                            className="mt-1 h-8 w-full rounded border border-[var(--editor-line)] bg-transparent"
                          />
                        </label>
                        <label className="block text-xs font-medium text-[var(--editor-muted)]">
                          模糊
                          <input
                            type="range"
                            min={0}
                            max={72}
                            value={canvasShadow.blur}
                            onChange={(event) =>
                              updateCanvasShadow({
                                blur: Number(event.target.value),
                              })
                            }
                            className="mt-2 w-full"
                          />
                        </label>
                        <label className="block text-xs font-medium text-[var(--editor-muted)]">
                          透明度
                          <input
                            type="range"
                            min={0}
                            max={0.6}
                            step={0.02}
                            value={canvasShadow.opacity}
                            onChange={(event) =>
                              updateCanvasShadow({
                                opacity: Number(event.target.value),
                              })
                            }
                            className="mt-2 w-full"
                          />
                        </label>
                        <label className="block text-xs font-medium text-[var(--editor-muted)]">
                          偏移 X
                          <input
                            type="range"
                            min={-64}
                            max={64}
                            value={canvasShadow.offsetX}
                            onChange={(event) =>
                              updateCanvasShadow({
                                offsetX: Number(event.target.value),
                              })
                            }
                            className="mt-2 w-full"
                          />
                        </label>
                        <label className="block text-xs font-medium text-[var(--editor-muted)]">
                          偏移 Y
                          <input
                            type="range"
                            min={-64}
                            max={64}
                            value={canvasShadow.offsetY}
                            onChange={(event) =>
                              updateCanvasShadow({
                                offsetY: Number(event.target.value),
                              })
                            }
                            className="mt-2 w-full"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {selectedItem?.type === 'image' && (
                    <div className="border-t border-[var(--editor-line)] pt-4">
                      <label className="flex items-center justify-between gap-3 text-xs font-medium text-[var(--editor-muted)]">
                        <span>图片阴影</span>
                        <input
                          type="checkbox"
                          checked={selectedItem.shadow.enabled}
                          onChange={(event) =>
                            updateSelectedImageShadow({
                              enabled: event.target.checked,
                            })
                          }
                        />
                      </label>
                      {selectedItem.shadow.enabled && (
                        <div className="mt-3 space-y-3">
                          <label className="block text-xs font-medium text-[var(--editor-muted)]">
                            颜色
                            <input
                              type="color"
                              value={selectedItem.shadow.color}
                              onChange={(event) =>
                                updateSelectedImageShadow({
                                  color: event.target.value,
                                })
                              }
                              className="mt-1 h-8 w-full rounded border border-[var(--editor-line)] bg-transparent"
                            />
                          </label>
                          <label className="block text-xs font-medium text-[var(--editor-muted)]">
                            模糊
                            <input
                              type="range"
                              min={0}
                              max={64}
                              value={selectedItem.shadow.blur}
                              onChange={(event) =>
                                updateSelectedImageShadow({
                                  blur: Number(event.target.value),
                                })
                              }
                              className="mt-2 w-full"
                            />
                          </label>
                          <label className="block text-xs font-medium text-[var(--editor-muted)]">
                            透明度
                            <input
                              type="range"
                              min={0}
                              max={0.8}
                              step={0.02}
                              value={selectedItem.shadow.opacity}
                              onChange={(event) =>
                                updateSelectedImageShadow({
                                  opacity: Number(event.target.value),
                                })
                              }
                              className="mt-2 w-full"
                            />
                          </label>
                          <label className="block text-xs font-medium text-[var(--editor-muted)]">
                            偏移 X
                            <input
                              type="range"
                              min={-48}
                              max={48}
                              value={selectedItem.shadow.offsetX}
                              onChange={(event) =>
                                updateSelectedImageShadow({
                                  offsetX: Number(event.target.value),
                                })
                              }
                              className="mt-2 w-full"
                            />
                          </label>
                          <label className="block text-xs font-medium text-[var(--editor-muted)]">
                            偏移 Y
                            <input
                              type="range"
                              min={-48}
                              max={48}
                              value={selectedItem.shadow.offsetY}
                              onChange={(event) =>
                                updateSelectedImageShadow({
                                  offsetY: Number(event.target.value),
                                })
                              }
                              className="mt-2 w-full"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedItem?.type === 'text' && (
                    <>
                      <label className="block text-xs font-medium text-[var(--editor-muted)]">
                        文字
                        <textarea
                          value={selectedItem.text}
                          onChange={(event) =>
                            updateSelectedText({ text: event.target.value })
                          }
                          className="mt-1 h-24 w-full resize-none rounded-md border border-[var(--editor-line)] bg-[var(--background)] px-2 py-2 text-sm text-[var(--editor-ink)] outline-none focus:border-[var(--editor-accent)]"
                        />
                      </label>
                      <div>
                        <div className="mb-2 text-xs font-medium text-[var(--editor-muted)]">
                          字体
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {COLLAGE_FONT_OPTIONS.map((font) => {
                            const loadStatus = fontLoadStatus[font.id]
                            const isLoading = loadStatus === 'loading'
                            const isFailed = loadStatus === 'failed'
                            return (
                              <button
                                key={font.id}
                                type="button"
                                onClick={() => {
                                  updateSelectedText({
                                    fontFamily: font.family,
                                  })
                                  void loadCollageFontForUi(font)
                                }}
                                className={`relative rounded-lg border px-2 py-2 text-center transition ${
                                  selectedItem.fontFamily === font.family
                                    ? 'border-[var(--editor-accent)] bg-[var(--editor-accent)]/8 text-[var(--editor-accent)]'
                                    : 'border-[var(--editor-line)] bg-white text-[var(--editor-ink)] hover:bg-[var(--editor-soft)]'
                                }`}
                                title={
                                  isFailed
                                    ? `${font.label} 外部字体加载失败，将使用后备字体`
                                    : font.label
                                }
                              >
                                {isLoading ? (
                                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                                ) : (
                                  <div
                                    className="text-lg font-semibold"
                                    style={{ fontFamily: font.family }}
                                  >
                                    {font.preview}
                                  </div>
                                )}
                                <div className="mt-0.5 truncate text-[11px]">
                                  {font.label}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 text-xs font-medium text-[var(--editor-muted)]">
                          样式
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedText({
                                fontWeight:
                                  selectedItem.fontWeight === '700'
                                    ? '400'
                                    : '700',
                              })
                            }
                            className={`inline-flex h-8 items-center justify-center rounded-md border transition ${
                              selectedItem.fontWeight === '700'
                                ? 'border-[var(--editor-accent)] bg-[var(--editor-accent)]/8 text-[var(--editor-accent)]'
                                : 'border-[var(--editor-line)] text-[var(--editor-ink)] hover:bg-[var(--editor-soft)]'
                            }`}
                            aria-label="加粗"
                            title="加粗"
                          >
                            <Bold className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedText({
                                fontStyle:
                                  selectedItem.fontStyle === 'italic'
                                    ? 'normal'
                                    : 'italic',
                              })
                            }
                            className={`inline-flex h-8 items-center justify-center rounded-md border transition ${
                              selectedItem.fontStyle === 'italic'
                                ? 'border-[var(--editor-accent)] bg-[var(--editor-accent)]/8 text-[var(--editor-accent)]'
                                : 'border-[var(--editor-line)] text-[var(--editor-ink)] hover:bg-[var(--editor-soft)]'
                            }`}
                            aria-label="斜体"
                            title="斜体"
                          >
                            <Italic className="h-4 w-4" />
                          </button>
                          {[
                            {
                              value: 'left' as const,
                              icon: AlignLeft,
                              label: '左对齐',
                            },
                            {
                              value: 'center' as const,
                              icon: AlignCenter,
                              label: '居中',
                            },
                            {
                              value: 'right' as const,
                              icon: AlignRight,
                              label: '右对齐',
                            },
                          ].map((option) => {
                            const Icon = option.icon
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                  updateSelectedText({ align: option.value })
                                }
                                className={`inline-flex h-8 items-center justify-center rounded-md border transition ${
                                  selectedItem.align === option.value
                                    ? 'border-[var(--editor-accent)] bg-[var(--editor-accent)]/8 text-[var(--editor-accent)]'
                                    : 'border-[var(--editor-line)] text-[var(--editor-ink)] hover:bg-[var(--editor-soft)]'
                                }`}
                                aria-label={option.label}
                                title={option.label}
                              >
                                <Icon className="h-4 w-4" />
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <label className="block text-xs font-medium text-[var(--editor-muted)]">
                        字号: {selectedItem.fontSize}
                        <input
                          type="range"
                          min={18}
                          max={320}
                          value={selectedItem.fontSize}
                          onChange={(event) =>
                            updateSelectedText({
                              fontSize: Number(event.target.value),
                            })
                          }
                          className="mt-2 w-full"
                        />
                      </label>
                      <label className="block text-xs font-medium text-[var(--editor-muted)]">
                        颜色
                        <input
                          type="color"
                          value={selectedItem.fill}
                          onChange={(event) =>
                            updateSelectedText({ fill: event.target.value })
                          }
                          className="mt-1 h-8 w-full rounded border border-[var(--editor-line)] bg-transparent"
                        />
                      </label>
                      <label className="block text-xs font-medium text-[var(--editor-muted)]">
                        行高:{' '}
                        {(
                          selectedItem.lineHeight ||
                          DEFAULT_COLLAGE_TEXT_STYLE.lineHeight
                        ).toFixed(2)}
                        <input
                          type="range"
                          min={0.9}
                          max={2.4}
                          step={0.05}
                          value={
                            selectedItem.lineHeight ||
                            DEFAULT_COLLAGE_TEXT_STYLE.lineHeight
                          }
                          onChange={(event) =>
                            updateSelectedText({
                              lineHeight: Number(event.target.value),
                            })
                          }
                          className="mt-2 w-full"
                        />
                      </label>
                      <label className="block text-xs font-medium text-[var(--editor-muted)]">
                        字距: {selectedItem.letterSpacing || 0}px
                        <input
                          type="range"
                          min={0}
                          max={24}
                          value={selectedItem.letterSpacing || 0}
                          onChange={(event) =>
                            updateSelectedText({
                              letterSpacing: Number(event.target.value),
                            })
                          }
                          className="mt-2 w-full"
                        />
                      </label>
                    </>
                  )}

                  {selectedItem?.type === 'icon' && (
                    <>
                      <label className="block text-xs font-medium text-[var(--editor-muted)]">
                        颜色
                        <input
                          type="color"
                          value={selectedItem.stroke}
                          onChange={(event) =>
                            updateSelectedIcon({ stroke: event.target.value })
                          }
                          className="mt-1 h-8 w-full rounded border border-[var(--editor-line)] bg-transparent"
                        />
                      </label>
                      <label className="block text-xs font-medium text-[var(--editor-muted)]">
                        线宽: {selectedItem.strokeWidth.toFixed(1)}
                        <input
                          type="range"
                          min={0.8}
                          max={8}
                          step={0.2}
                          value={selectedItem.strokeWidth}
                          onChange={(event) =>
                            updateSelectedIcon({
                              strokeWidth: Number(event.target.value),
                            })
                          }
                          className="mt-2 w-full"
                        />
                      </label>
                      <label className="block text-xs font-medium text-[var(--editor-muted)]">
                        透明度: {Math.round(selectedItem.opacity * 100)}%
                        <input
                          type="range"
                          min={0.1}
                          max={1}
                          step={0.05}
                          value={selectedItem.opacity}
                          onChange={(event) =>
                            updateSelectedIcon({
                              opacity: Number(event.target.value),
                            })
                          }
                          className="mt-2 w-full"
                        />
                      </label>
                    </>
                  )}

                  {selectedItem?.type === 'arrow' && (
                    <>
                      <label className="block text-xs font-medium text-[var(--editor-muted)]">
                        粗细
                        <input
                          type="range"
                          min={2}
                          max={24}
                          value={selectedItem.strokeWidth}
                          onChange={(event) =>
                            updateSelectedArrow({
                              strokeWidth: Number(event.target.value),
                            })
                          }
                          className="mt-2 w-full"
                        />
                      </label>
                      <label className="block text-xs font-medium text-[var(--editor-muted)]">
                        颜色
                        <input
                          type="color"
                          value={selectedItem.stroke}
                          onChange={(event) =>
                            updateSelectedArrow({ stroke: event.target.value })
                          }
                          className="mt-1 h-8 w-full rounded border border-[var(--editor-line)] bg-transparent"
                        />
                      </label>
                    </>
                  )}

                  {error && (
                    <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
