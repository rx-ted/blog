'use client'

import { InputRule, Node, mergeAttributes, nodeInputRule } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { useState, useEffect, useRef } from 'react'
import katex from 'katex'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathBlock: {
      setMathBlock: (options: { latex?: string; displayMode?: boolean }) => ReturnType
    }
    inlineMath: {
      setInlineMath: (options: { latex: string }) => ReturnType
    }
  }
}

// ── React 组件：数学公式渲染 ──
function MathComponent(props: ReactNodeViewProps) {
  const { node, updateAttributes, selected } = props
  const latex = (node.attrs.latex as string) || ''
  const displayMode = (node.attrs.displayMode as boolean) ?? false
  const [editing, setEditing] = useState(!latex)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const renderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!editing && latex && renderRef.current) {
      try {
        katex.render(latex, renderRef.current, {
          displayMode,
          throwOnError: false,
          output: 'html',
        })
      } catch {
        renderRef.current.textContent = latex
      }
    }
  }, [latex, displayMode, editing])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  if (editing) {
    return (
      <NodeViewWrapper className="math-node-editing" data-type="math">
        <div className="math-editor-container">
          <label className="math-editor-label">
            {displayMode ? '块级公式 (LaTeX)' : '行内公式 (LaTeX)'}
          </label>
          <textarea
            ref={inputRef}
            defaultValue={latex}
            placeholder="E = mc^2"
            rows={displayMode ? 3 : 1}
            className="math-editor-input"
            onBlur={(e) => {
              const val = e.target.value.trim()
              if (val) {
                updateAttributes({ latex: val })
                setEditing(false)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                const val = (e.target as HTMLTextAreaElement).value.trim()
                if (val) {
                  updateAttributes({ latex: val })
                  setEditing(false)
                }
              }
              if (e.key === 'Escape') {
                setEditing(false)
              }
            }}
          />
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper
      className={`math-node-rendered ${selected ? 'math-selected' : ''}`}
      data-type="math"
      onClick={() => setEditing(true)}
      title="点击编辑公式"
    >
      <div ref={renderRef} className={displayMode ? 'math-display' : 'math-inline'} />
    </NodeViewWrapper>
  )
}

function InlineMathComponent(props: ReactNodeViewProps) {
  const { node, updateAttributes, selected } = props
  const latex = (node.attrs.latex as string) || ''
  const [editing, setEditing] = useState(!latex)
  const inputRef = useRef<HTMLInputElement>(null)
  const renderRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!editing && latex && renderRef.current) {
      try {
        katex.render(latex, renderRef.current, {
          displayMode: false,
          throwOnError: false,
          output: 'html',
        })
      } catch {
        renderRef.current.textContent = latex
      }
    }
  }, [latex, editing])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  if (editing) {
    return (
      <NodeViewWrapper as="span" className="math-inline-editing" data-type="inline-math">
        <input
          ref={inputRef}
          defaultValue={latex}
          placeholder="E = mc^2"
          className="math-inline-input"
          onBlur={(event) => {
            const value = event.target.value.trim()
            if (value) updateAttributes({ latex: value })
            setEditing(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              const value = (event.target as HTMLInputElement).value.trim()
              if (value) updateAttributes({ latex: value })
              setEditing(false)
            }
            if (event.key === 'Escape') setEditing(false)
          }}
        />
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper
      as="span"
      className={`math-inline-rendered ${selected ? 'math-selected' : ''}`}
      data-type="inline-math"
      onClick={() => setEditing(true)}
      title="点击编辑公式"
    >
      <span ref={renderRef} className="math-inline" />
    </NodeViewWrapper>
  )
}

// ── Tiptap Node 扩展 ──
export const MathNode = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-math-latex') || element.getAttribute('latex') || element.textContent || '',
      },
      displayMode: {
        default: true,
        parseHTML: (element) => element.getAttribute('data-display-mode') !== 'false',
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-math-latex]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const latex = HTMLAttributes.latex || ''
    const displayMode = HTMLAttributes.displayMode !== false
    return [
      'div',
      mergeAttributes(
        { 'data-math-latex': latex, 'data-display-mode': String(displayMode), class: 'math-block-wrapper' },
        HTMLAttributes
      ),
      latex,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathComponent)
  },

  addCommands() {
    return {
      setMathBlock:
        (options: { latex?: string; displayMode?: boolean }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { latex: options.latex ?? '', displayMode: options.displayMode ?? true },
          })
        },
    }
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /^\$\$\s*([^$]+?)\s*\$\$$/,
        type: this.type,
        getAttributes: match => ({ latex: match[1]?.trim() || '', displayMode: true }),
      }),
    ]
  },
})

export const InlineMathNode = Node.create({
  name: 'inlineMath',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-math-latex') || element.getAttribute('latex') || element.textContent || '',
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-math-latex]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const latex = HTMLAttributes.latex || ''
    return [
      'span',
      mergeAttributes(
        { 'data-math-latex': latex, 'data-display-mode': 'false', class: 'math-inline-wrapper' },
        HTMLAttributes,
      ),
      latex,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineMathComponent)
  },

  addCommands() {
    return {
      setInlineMath:
        (options: { latex: string }) =>
        ({ commands }) => commands.insertContent({
          type: this.name,
          attrs: { latex: options.latex },
        }),
    }
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\$([^$\n]+?)\$$/,
        handler: ({ state, range, match }) => {
          const latex = match[1]?.trim()
          if (!latex) return

          const before = state.doc.textBetween(Math.max(0, range.from - 1), range.from, '\0', '\0')
          if (before === '$') return

          const node = this.type.create({ latex })
          const transaction = state.tr.replaceWith(range.from, range.to, node)
          this.editor.view.dispatch(transaction)
        },
      }),
    ]
  },
})
