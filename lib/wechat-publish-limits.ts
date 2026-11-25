export const WECHAT_DRAFT_TITLE_MAX_CHARS = 64
export const WECHAT_DRAFT_AUTHOR_MAX_CHARS = 16
export const WECHAT_DRAFT_DIGEST_MAX_CHARS = 128
export const WECHAT_DRAFT_DIGEST_MAX_BYTES = 120

// Official draft/add docs still say 32 chars, but the live API accepts 64
// and rejects 65 with errcode 45003. Verified on 2026-06-16.
export const WECHAT_DRAFT_TITLE_LIMIT_HINT =
  '微信草稿 add API 实测支持 64 个字符，65 个字符会返回 45003；官方文档仍写 32，发布前以实测接口边界为准。'

export function truncateWechatText(
  input: string,
  maxChars: number,
  maxBytes?: number,
): string {
  const normalized = input.trim()
  if (!normalized) return ''

  if (maxBytes === undefined) {
    const chars = Array.from(normalized)
    return chars.length > maxChars
      ? chars.slice(0, maxChars).join('')
      : normalized
  }

  const encoder = new TextEncoder()
  let output = ''
  let byteLength = 0
  let charLength = 0

  for (const char of normalized) {
    const nextByteLength = encoder.encode(char).byteLength
    if (charLength >= maxChars || byteLength + nextByteLength > maxBytes) {
      break
    }
    output += char
    byteLength += nextByteLength
    charLength += 1
  }

  return output
}
