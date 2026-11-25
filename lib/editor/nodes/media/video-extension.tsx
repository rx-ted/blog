import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { ExternalLink, Play, VideoIcon, X } from 'lucide-react'
import { useState } from 'react'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      setVideo: (options: { src: string; title?: string }) => ReturnType
    }
  }
}

interface VideoNodeAttrs {
  src: string
  title?: string
}

function getVideoLabel(src: string, title?: string) {
  const trimmedTitle = title?.trim()
  if (trimmedTitle) return trimmedTitle

  const fallback = src.split('#')[0]?.split('?')[0]?.split('/').filter(Boolean).at(-1)
  if (!fallback) return '视频'

  try {
    return decodeURIComponent(fallback)
  } catch {
    return fallback
  }
}

function getVideoMeta(src: string) {
  try {
    const url = new URL(src, window.location.origin)
    if (url.origin === window.location.origin) return url.pathname
    return url.hostname
  } catch {
    return src
  }
}

function VideoComponent({ node }: NodeViewProps) {
  const { src, title } = node.attrs
  const [previewState, setPreviewState] = useState({
    src,
    open: false,
    error: false,
  })
  const label = getVideoLabel(src, title)
  const meta = getVideoMeta(src)
  const previewOpen = previewState.src === src && previewState.open
  const previewError = previewState.src === src && previewState.error

  const openPreview = () => {
    setPreviewState({ src, open: true, error: false })
  }

  const closePreview = () => {
    setPreviewState({ src, open: false, error: false })
  }

  return (
    <NodeViewWrapper data-type="video" className="video-wrapper video-node-view">
      <div className="editor-video-card" contentEditable={false}>
        {previewOpen ? (
          <div className="editor-video-preview">
            <div className="editor-video-preview-bar">
              <div className="editor-video-title">
                <VideoIcon className="h-4 w-4" aria-hidden />
                <span>{label}</span>
              </div>
              <button
                type="button"
                className="editor-video-icon-button"
                title="收起预览"
                aria-label="收起预览"
                onMouseDown={(event) => event.preventDefault()}
                onClick={closePreview}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            {previewError ? (
              <div className="editor-video-error">
                <span>视频加载失败</span>
                <a href={src} target="_blank" rel="noopener noreferrer">
                  打开链接
                </a>
              </div>
            ) : (
              <video
                src={src}
                controls
                playsInline
                webkit-playsinline="true"
                x5-playsinline="true"
                x5-video-player-type="h5"
                x-webkit-airplay="true"
                className="editor-video-player"
                preload="none"
                onError={() => setPreviewState({ src, open: true, error: true })}
              >
                您的浏览器不支持视频播放
              </video>
            )}
          </div>
        ) : (
          <div className="editor-video-placeholder">
            <div className="editor-video-thumb" aria-hidden>
              <VideoIcon className="h-5 w-5" />
            </div>
            <div className="editor-video-copy">
              <div className="editor-video-title">{label}</div>
              <div className="editor-video-meta">{meta}</div>
            </div>
            <div className="editor-video-actions">
              <button
                type="button"
                className="editor-video-action"
                title="预览视频"
                aria-label="预览视频"
                onMouseDown={(event) => event.preventDefault()}
                onClick={openPreview}
              >
                <Play className="h-4 w-4" aria-hidden />
                <span>预览</span>
              </button>
              <a
                className="editor-video-icon-button"
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                title="新窗口打开"
                aria-label="新窗口打开"
                onMouseDown={(event) => event.preventDefault()}
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

export const VideoNode = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('src'),
        renderHTML: (attributes) => ({ src: attributes.src }),
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('title'),
        renderHTML: (attributes) =>
          attributes.title ? { title: attributes.title } : {},
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'video[src]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'video',
      mergeAttributes(HTMLAttributes, {
        controls: '',
        playsinline: '',
        'webkit-playsinline': 'true',
        'x5-playsinline': 'true',
        'x5-video-player-type': 'h5',
        'x-webkit-airplay': 'true',
        preload: 'metadata',
        style: 'max-width:100%;max-height:600px',
      }),
      '您的浏览器不支持视频播放',
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoComponent)
  },

  addCommands() {
    return {
      setVideo:
        (options: VideoNodeAttrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },
})
