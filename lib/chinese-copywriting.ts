const CJK = '\u3400-\u9fff\uf900-\ufaff'
const CJK_RE = `[${CJK}]`
const ASCII_RE = '[A-Za-z0-9%]'

const PUNCTUATION_MAP: Record<string, string> = {
  ',': '，',
  '.': '。',
  ':': '：',
  ';': '；',
  '?': '？',
  '!': '！',
}

function normalizeAsciiPunctuationNearChinese(value: string): string {
  return value.replace(
    new RegExp(
      `(${CJK_RE})\\s*([,.:;?!])\\s*|\\s*([,.:;?!])\\s*(${CJK_RE})`,
      'gu',
    ),
    (
      _match,
      leftCjk: string | undefined,
      leftPunc: string | undefined,
      rightPunc: string | undefined,
      rightCjk: string | undefined,
    ) => {
      if (leftCjk && leftPunc) {
        return `${leftCjk}${PUNCTUATION_MAP[leftPunc] ?? leftPunc}`
      }
      if (rightPunc && rightCjk) {
        return `${PUNCTUATION_MAP[rightPunc] ?? rightPunc}${rightCjk}`
      }
      return _match
    },
  )
}

export function formatChineseCopywritingText(input: string): string {
  if (!input) return input

  let text = input

  text = normalizeAsciiPunctuationNearChinese(text)

  text = text
    .replace(new RegExp(`(${CJK_RE})\\s*\\(`, 'gu'), '$1（')
    .replace(new RegExp(`\\(\\s*(${CJK_RE})`, 'gu'), '（$1')
    .replace(new RegExp(`(${CJK_RE})\\s*\\)`, 'gu'), '$1）')
    .replace(new RegExp(`\\)\\s*(${CJK_RE})`, 'gu'), '）$1')
    .replace(/（\s*([^）\n]*?)\s*\)/gu, '（$1）')
    .replace(/\s+([，。！？；：、）》」』”’])/gu, '$1')
    .replace(/([（《「『“‘])\s+/gu, '$1')
    .replace(new RegExp(`([，。！？；：、])\\s+(${CJK_RE})`, 'gu'), '$1$2')
    .replace(new RegExp(`([）》」』”’])\\s+(${CJK_RE})`, 'gu'), '$1$2')
    .replace(new RegExp(`(${CJK_RE})(${ASCII_RE})`, 'gu'), '$1 $2')
    .replace(new RegExp(`(${ASCII_RE})(${CJK_RE})`, 'gu'), '$1 $2')
    .replace(/([！？])[!?]+/g, '$1')
    .replace(/([，。！？；：、])\1+/gu, '$1')
    .replace(/([!?])\1+/g, '$1')

  return text
}
