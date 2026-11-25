import hljs from 'highlight.js/lib/common'

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function getCodeLanguage(code: HTMLElement) {
  const languageClass = Array.from(code.classList).find((className) =>
    className.startsWith('language-'),
  )
  const fromClass = languageClass?.replace(/^language-/, '').trim()
  const fromData = code.getAttribute('data-language')?.trim()
  const language = fromClass || fromData || ''
  return language.toLowerCase()
}

export function isMermaidLanguage(language: string) {
  return language.toLowerCase() === 'mermaid'
}

export function isPlantUmlLanguage(language: string) {
  const normalized = language.toLowerCase()
  return normalized === 'plantuml' || normalized === 'puml'
}

export function isInfographicLanguage(language: string) {
  return language.toLowerCase() === 'infographic'
}

export function isVisualDiagramLanguage(language: string) {
  return (
    isMermaidLanguage(language) ||
    isPlantUmlLanguage(language) ||
    isInfographicLanguage(language)
  )
}

// WeChat export renders plain code blocks without syntax highlighting:
// each line is emitted as escaped text inside a single-color line span.
export function buildPlainCodeLinesHtml(codeText: string) {
  return codeText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(
      (line, index) =>
        `<span class="wechat-code-row"><span class="wechat-code-line-number" aria-hidden="true">${index + 1}</span><span class="wechat-code-line">${escapeHtml(line) || '&nbsp;'}</span></span>`,
    )
    .join('')
}

export function highlightCodeToHtml(codeText: string, language = '') {
  const normalizedLanguage = language.toLowerCase()

  try {
    if (normalizedLanguage && hljs.getLanguage(normalizedLanguage)) {
      return hljs.highlight(codeText, { language: normalizedLanguage }).value
    }

    return hljs.highlightAuto(codeText).value
  } catch {
    return escapeHtml(codeText)
  }
}

export function highlightCodeElement(code: HTMLElement) {
  if (code.dataset.highlighted === 'true') return

  const language = getCodeLanguage(code)
  if (isVisualDiagramLanguage(language)) return

  const codeText = code.textContent || ''
  if (!codeText.trim()) return

  code.innerHTML = highlightCodeToHtml(codeText, language)
  code.dataset.highlighted = 'true'
}
