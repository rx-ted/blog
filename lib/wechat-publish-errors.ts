import {
  WECHAT_DRAFT_DIGEST_MAX_BYTES,
  WECHAT_DRAFT_TITLE_LIMIT_HINT,
  WECHAT_DRAFT_TITLE_MAX_CHARS,
} from './wechat-publish-limits'

export function explainWechatPublishError(input: unknown): string {
  const message = input instanceof Error ? input.message : String(input || '')
  const normalized = message.toLowerCase()

  if (
    /errcode=45004\b/.test(message) ||
    normalized.includes('description size out of limit')
  ) {
    return `微信公众号摘要/描述超出限制，请把摘要控制在 ${WECHAT_DRAFT_DIGEST_MAX_BYTES} bytes 以内后重试。`
  }

  if (
    /errcode=45003\b/.test(message) ||
    normalized.includes('title size out of limit')
  ) {
    return `微信草稿 API 标题超出限制，请把标题控制在 ${WECHAT_DRAFT_TITLE_MAX_CHARS} 个字以内后重试。${WECHAT_DRAFT_TITLE_LIMIT_HINT}`
  }

  if (
    /errcode=45002\b/.test(message) ||
    normalized.includes('content size out of limit')
  ) {
    return '微信公众号正文内容超出限制，请减少正文长度或图片数量后重试。'
  }

  if (
    /errcode=45005\b/.test(message) ||
    normalized.includes('url size out of limit')
  ) {
    return '微信公众号原文链接超出限制或格式不正确，请检查原文链接后重试。'
  }

  return message || '提交公众号发布失败'
}
