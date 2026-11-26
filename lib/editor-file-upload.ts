import type { EditorInstance } from 'novel'

export interface UploadedEditorFile {
  url: string
  type: string
  name: string
  assetId?: number
}

export interface UploadEditorFileOptions {
  postId?: number | null
  slug?: string | null
  role?: 'inline' | 'cover'
  source?: 'upload' | 'collage'
}

function sanitizeFilenameSegment(value: string) {
  return (
    value
      .trim()
      // biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally strip control characters from filenames
      .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  )
}

function getFilenameExtension(value: string) {
  const match = value.match(/\.([a-z0-9]{2,8})$/i)
  return match?.[0]?.toLowerCase() ?? ''
}

export function buildEditorImageFilename(
  imageUrl: string,
  fallbackName = 'image',
) {
  const urlSegment =
    imageUrl.split('/').pop()?.split('?')[0]?.split('#')[0] ?? ''
  const fallbackBase = fallbackName.replace(/\.[^.]+$/, '')
  const preferredBase =
    sanitizeFilenameSegment(fallbackBase) ||
    sanitizeFilenameSegment(urlSegment.replace(/\.[^.]+$/, ''))
  const extension = getFilenameExtension(urlSegment) || '.webp'
  return `${preferredBase || 'image'}${extension}`
}

export function downloadEditorImage(imageUrl: string, fallbackName?: string) {
  if (typeof document === 'undefined') return

  const anchor = document.createElement('a')
  anchor.href = imageUrl
  anchor.download = buildEditorImageFilename(imageUrl, fallbackName)
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

const CLIPBOARD_IMAGE_MIME_TYPE = 'image/png'

type ClipboardItemConstructor = typeof ClipboardItem & {
  supports?: (type: string) => boolean
}

function getClipboardItemConstructor() {
  if (
    typeof window === 'undefined' ||
    typeof window.ClipboardItem === 'undefined'
  )
    return null
  return window.ClipboardItem as ClipboardItemConstructor
}

function browserSupportsClipboardImageType(type: string) {
  const ClipboardItemCtor = getClipboardItemConstructor()
  if (!ClipboardItemCtor) return false
  if (typeof ClipboardItemCtor.supports !== 'function') return true
  return ClipboardItemCtor.supports(type)
}

function loadBlobAsImage(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    if (
      typeof window === 'undefined' ||
      typeof window.Image === 'undefined' ||
      typeof URL === 'undefined' ||
      typeof URL.createObjectURL !== 'function'
    ) {
      reject(new Error('当前浏览器不支持复制图片'))
      return
    }

    const image = new window.Image()
    const objectUrl = URL.createObjectURL(blob)
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('图片转换失败'))
    }
    image.src = objectUrl
  })
}

async function convertImageBlobToPng(blob: Blob) {
  if (typeof document === 'undefined') {
    throw new Error('当前浏览器不支持复制图片')
  }

  const image = await loadBlobAsImage(blob)
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width || 1
  canvas.height = image.naturalHeight || image.height || 1

  const context = canvas.getContext('2d')
  if (!context || typeof canvas.toBlob !== 'function') {
    throw new Error('当前浏览器不支持复制图片')
  }

  context.drawImage(image, 0, 0)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((pngBlob) => {
      if (pngBlob) {
        resolve(pngBlob)
        return
      }

      reject(new Error('图片转换失败'))
    }, CLIPBOARD_IMAGE_MIME_TYPE)
  })
}

async function normalizeImageBlobForClipboard(blob: Blob) {
  if ((blob.type || '').toLowerCase() === CLIPBOARD_IMAGE_MIME_TYPE) return blob
  return convertImageBlobToPng(blob)
}

export async function copyEditorImage(imageUrl: string) {
  const ClipboardItemCtor = getClipboardItemConstructor()
  if (
    typeof navigator === 'undefined' ||
    !navigator.clipboard?.write ||
    !ClipboardItemCtor ||
    !browserSupportsClipboardImageType(CLIPBOARD_IMAGE_MIME_TYPE)
  ) {
    throw new Error('当前浏览器不支持复制图片')
  }

  const response = await fetch(imageUrl, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`图片获取失败 (${response.status})`)
  }

  const blob = await response.blob()
  const clipboardBlob = await normalizeImageBlobForClipboard(blob)

  try {
    await navigator.clipboard.write([
      new ClipboardItemCtor({
        [CLIPBOARD_IMAGE_MIME_TYPE]: clipboardBlob,
      }),
    ])
  } catch (error) {
    if (
      error instanceof Error &&
      /not supported|ClipboardItem/i.test(error.message)
    ) {
      throw new Error('当前浏览器不支持复制图片')
    }

    throw error
  }
}

export async function uploadEditorFile(
  file: File,
  onProgress?: (percent: number) => void,
  options: UploadEditorFileOptions = {},
): Promise<UploadedEditorFile> {
  const formData = new FormData()
  formData.append('file', file)
  if (options.postId) formData.append('postId', String(options.postId))
  if (options.slug) formData.append('slug', options.slug)
  if (options.role) formData.append('role', options.role)
  if (options.source) formData.append('source', options.source)

  return new Promise<UploadedEditorFile>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.withCredentials = true
    xhr.timeout = 5 * 60 * 1000

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText) as {
            success?: boolean
            url?: string
            type?: string
            name?: string
            assetId?: number
            error?: string
          }

          if (result.success && typeof result.url === 'string') {
            resolve({
              url: result.url,
              type: result.type || file.type,
              name: result.name || file.name,
              assetId: Number.isFinite(result.assetId)
                ? Number(result.assetId)
                : undefined,
            })
            return
          }

          reject(new Error(result.error || '文件上传失败'))
        } catch {
          reject(new Error('解析响应失败'))
        }
        return
      }

      if (xhr.status === 401) {
        reject(new Error('登录已过期，请刷新页面后重试'))
        return
      }

      if (xhr.status === 413) {
        reject(new Error('文件太大，最大支持 100MB'))
        return
      }

      reject(new Error(`上传失败 (${xhr.status})`))
    })

    xhr.addEventListener('error', () => {
      reject(
        new Error(
          `网络错误，文件可能太大（${(file.size / 1024 / 1024).toFixed(1)}MB）`,
        ),
      )
    })
    xhr.addEventListener('timeout', () => reject(new Error('上传超时')))

    xhr.open('POST', '/api/uploads')
    xhr.send(formData)
  })
}

export function createUploadPlaceholderMarker() {
  return `⏳upload-${Date.now()}`
}

export function buildUploadPlaceholderText(file: File, marker: string) {
  if (file.type.startsWith('video/')) {
    return `📤 视频上传中... [${marker}]`
  }

  if (file.type.startsWith('audio/')) {
    return `📤 音频上传中... [${marker}]`
  }

  return `📤 ${file.name} 上传中... [${marker}]`
}

export function insertUploadPlaceholder(
  editor: EditorInstance,
  file: File,
  marker: string,
) {
  editor
    .chain()
    .focus()
    .insertContent({
      type: 'paragraph',
      content: [
        { type: 'text', text: buildUploadPlaceholderText(file, marker) },
      ],
    })
    .run()
}

export function removeUploadPlaceholder(
  editor: EditorInstance,
  marker: string,
) {
  const { state } = editor
  const { doc } = state
  let placeholderPos: number | null = null
  let placeholderNodeSize = 0

  doc.descendants((node, pos) => {
    if (node.isBlock && node.textContent.includes(marker)) {
      placeholderPos = pos
      placeholderNodeSize = node.nodeSize
      return false
    }
  })

  if (placeholderPos === null) return false

  editor.view.dispatch(
    state.tr.delete(placeholderPos, placeholderPos + placeholderNodeSize),
  )
  return true
}

export function insertUploadedFileIntoEditor(
  editor: EditorInstance,
  file: File,
  uploaded: UploadedEditorFile,
) {
  if (file.type.startsWith('video/')) {
    editor
      .chain()
      .focus()
      // @ts-expect-error - setVideo is defined in video-extension.tsx
      .setVideo({ src: uploaded.url, title: uploaded.name || file.name })
      .run()
    return
  }

  if (file.type.startsWith('audio/')) {
    // @ts-expect-error - setAudio is defined in audio-extension.tsx
    editor.chain().focus().setAudio({ src: uploaded.url }).run()
    return
  }

  editor
    .chain()
    .focus()
    .insertContent(
      `<p><a href="${uploaded.url}" target="_blank" rel="noopener">📎 ${file.name}</a></p>`,
    )
    .run()
}

export function insertGeneratedImageAtPosition(
  editor: EditorInstance,
  imageUrl: string,
  alt: string,
  insertPos: number | null,
) {
  const chain = editor.chain().focus()

  if (Number.isFinite(insertPos)) {
    chain.setTextSelection(Number(insertPos))
  }

  chain
    .insertContent([
      { type: 'image', attrs: { src: imageUrl, alt } },
      { type: 'paragraph' },
    ])
    .run()
}

export function insertGeneratedImageAfterNode(
  editor: EditorInstance,
  imageUrl: string,
  alt: string,
  nodePos: number | null,
) {
  if (!Number.isFinite(nodePos)) {
    insertGeneratedImageAtPosition(editor, imageUrl, alt, nodePos)
    return
  }

  const imageNode = editor.state.doc.nodeAt(Number(nodePos))
  const insertPos = imageNode
    ? Number(nodePos) + imageNode.nodeSize
    : Number(nodePos)
  insertGeneratedImageAtPosition(editor, imageUrl, alt, insertPos)
}

export function replaceImageNodeAtPosition(
  editor: EditorInstance,
  imageUrl: string,
  alt: string,
  nodePos: number | null,
) {
  if (!Number.isFinite(nodePos)) return false

  const pos = Number(nodePos)
  const node = editor.state.doc.nodeAt(pos)
  const imageType = editor.state.schema.nodes.image

  if (node?.type.name !== 'image' || !imageType) return false

  const nextNode = imageType.create({
    ...node.attrs,
    src: imageUrl,
    alt,
  })

  const transaction = editor.state.tr
    .replaceWith(pos, pos + node.nodeSize, nextNode)
    .scrollIntoView()

  editor.view.dispatch(transaction)
  return true
}
