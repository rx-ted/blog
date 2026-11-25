import {
  WECHAT_DRAFT_AUTHOR_MAX_CHARS,
  WECHAT_DRAFT_DIGEST_MAX_BYTES,
  WECHAT_DRAFT_DIGEST_MAX_CHARS,
  WECHAT_DRAFT_TITLE_LIMIT_HINT,
  WECHAT_DRAFT_TITLE_MAX_CHARS,
} from './wechat-publish-limits'

export type WechatPublishCheckLevel = 'error' | 'warning' | 'info'

export type WechatPublishCheckCode =
  | 'MISSING_ACCOUNT'
  | 'MISSING_TITLE'
  | 'MISSING_CONTENT'
  | 'TITLE_TOO_LONG'
  | 'AUTHOR_TOO_LONG'
  | 'DIGEST_TOO_LONG'
  | 'DATA_URL_IMAGE'
  | 'MISSING_COVER'
  | 'COVER_FALLBACK_DEFAULT'
  | 'DUPLICATE_H1'
  | 'LIST_MARKERS_MISSING'
  | 'IMAGE_TIMEOUT_RISK'

export interface WechatPublishCheck {
  level: WechatPublishCheckLevel
  code: WechatPublishCheckCode
  message: string
  field?: string
  suggested_fix?: string
}

export interface WechatPublishReadiness {
  convert_ready: boolean
  upload_ready: boolean
  draft_ready: boolean
  preview_fidelity: 'exact' | 'degraded'
}

export interface WechatPublishInspectSummary {
  image_count: number
  data_url_image_count: number
  remote_image_count: number
  cover_ready: boolean
  estimated_upload_seconds: number
  normalized_changed_fields: string[]
}

export interface WechatPublishInspectResult {
  checks: WechatPublishCheck[]
  readiness: WechatPublishReadiness
  summary: WechatPublishInspectSummary
}

export interface WechatPublishInspectInput {
  accountId?: string
  title?: string
  normalizedTitle?: string
  author?: string
  normalizedAuthor?: string
  digest?: string
  normalizedDigest?: string
  contentHtml?: string
  coverImageUrl?: string
  resolvedCoverImageUrl?: string
}

const IMAGE_TIMEOUT_RISK_COUNT = 12
const encoder = new TextEncoder()

function measureText(input: string) {
  const normalized = input.trim()
  return {
    chars: Array.from(normalized).length,
    bytes: encoder.encode(normalized).byteLength,
  }
}

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&amp;/gi, '&')
    .replace(/&#38;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function extractImageSources(html: string) {
  const sources: string[] = []
  const regex = /<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi

  for (let match = regex.exec(html); match !== null; match = regex.exec(html)) {
    const src = decodeHtmlEntities(
      match[1] || match[2] || match[3] || '',
    ).trim()
    if (src) sources.push(src)
  }

  return sources
}

function stripHtml(input: string) {
  return decodeHtmlEntities(
    input
      .replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
}

function stripStyleAndScript(input: string) {
  return input
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
}

function extractFirstH1Text(html: string) {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)
  return match ? stripHtml(match[1]) : ''
}

function appendLimitCheck(
  checks: WechatPublishCheck[],
  options: {
    field: string
    code: WechatPublishCheckCode
    label: string
    value: string
    normalizedValue?: string
    maxChars: number
    maxBytes?: number
    level?: WechatPublishCheckLevel
    message?: string
    suggestedFix?: string
  },
) {
  const measured = measureText(options.value)
  const exceedsChars = measured.chars > options.maxChars
  const exceedsBytes =
    options.maxBytes !== undefined && measured.bytes > options.maxBytes
  const changed =
    options.normalizedValue !== undefined &&
    options.value.trim() !== '' &&
    options.value.trim() !== options.normalizedValue.trim()

  if (!exceedsChars && !exceedsBytes && !changed) return

  const byteLabel =
    options.maxBytes === undefined ? '' : ` / ${options.maxBytes} bytes`
  checks.push({
    level: options.level || 'warning',
    code: options.code,
    field: options.field,
    message:
      options.message ||
      `${options.label}超出微信草稿 API 限制，提交时会自动截断。`,
    suggested_fix:
      options.suggestedFix ||
      `控制在 ${options.maxChars} 个字${byteLabel}以内。`,
  })
}

function hasListMarkup(html: string) {
  return /<(?:ul|ol)\b/i.test(stripStyleAndScript(html))
}

function hasWechatListMarkers(html: string) {
  return /\bwechat-list-marker\b|data-wechat-list-marker/i.test(
    stripStyleAndScript(html),
  )
}

function changedFields(input: WechatPublishInspectInput) {
  const fields: string[] = []
  if ((input.title || '').trim() !== (input.normalizedTitle || '').trim())
    fields.push('title')
  if (
    (input.author || '').trim() &&
    (input.author || '').trim() !== (input.normalizedAuthor || '').trim()
  )
    fields.push('author')
  if ((input.digest || '').trim() !== (input.normalizedDigest || '').trim())
    fields.push('digest')
  return fields
}

export function inspectWechatPublishInput(
  input: WechatPublishInspectInput,
): WechatPublishInspectResult {
  const checks: WechatPublishCheck[] = []
  const accountId = (input.accountId || '').trim()
  const title = (input.title || '').trim()
  const normalizedTitle = (input.normalizedTitle || title).trim()
  const author = (input.author || '').trim()
  const normalizedAuthor = (input.normalizedAuthor || author).trim()
  const digest = (input.digest || '').trim()
  const normalizedDigest = (input.normalizedDigest || digest).trim()
  const contentHtml = (input.contentHtml || '').trim()
  const coverImageUrl = (input.coverImageUrl || '').trim()
  const resolvedCoverImageUrl = (input.resolvedCoverImageUrl || '').trim()

  if (!accountId) {
    checks.push({
      level: 'error',
      code: 'MISSING_ACCOUNT',
      field: 'account_id',
      message: '请选择公众号账号。',
    })
  }

  if (!normalizedTitle) {
    checks.push({
      level: 'error',
      code: 'MISSING_TITLE',
      field: 'title',
      message: '文章标题不能为空。',
    })
  }

  if (!contentHtml) {
    checks.push({
      level: 'error',
      code: 'MISSING_CONTENT',
      field: 'content_html',
      message: '文章内容不能为空。',
    })
  }

  appendLimitCheck(checks, {
    field: 'title',
    code: 'TITLE_TOO_LONG',
    label: '标题',
    value: title,
    normalizedValue: normalizedTitle,
    maxChars: WECHAT_DRAFT_TITLE_MAX_CHARS,
    level: 'error',
    message: `标题超过微信草稿 API 的 ${WECHAT_DRAFT_TITLE_MAX_CHARS} 个字限制；${WECHAT_DRAFT_TITLE_LIMIT_HINT}`,
    suggestedFix: `缩短标题到 ${WECHAT_DRAFT_TITLE_MAX_CHARS} 个字以内后再自动创建草稿。`,
  })

  appendLimitCheck(checks, {
    field: 'author',
    code: 'AUTHOR_TOO_LONG',
    label: '作者',
    value: author,
    normalizedValue: normalizedAuthor,
    maxChars: WECHAT_DRAFT_AUTHOR_MAX_CHARS,
  })

  appendLimitCheck(checks, {
    field: 'digest',
    code: 'DIGEST_TOO_LONG',
    label: '摘要',
    value: digest,
    normalizedValue: normalizedDigest,
    maxChars: WECHAT_DRAFT_DIGEST_MAX_CHARS,
    maxBytes: WECHAT_DRAFT_DIGEST_MAX_BYTES,
  })

  const imageSources = extractImageSources(contentHtml)
  const dataUrlImageCount = imageSources.filter((src) =>
    /^data:/i.test(src),
  ).length

  if (dataUrlImageCount > 0) {
    checks.push({
      level: 'error',
      code: 'DATA_URL_IMAGE',
      field: 'content_html',
      message: '正文图片不能使用 inline data URL。',
      suggested_fix: '请先把图片上传成公开 URL。',
    })
  }

  if (!resolvedCoverImageUrl) {
    checks.push({
      level: 'error',
      code: 'MISSING_COVER',
      field: 'cover_image_url',
      message: '缺少公众号封面图。',
      suggested_fix: '填写封面图 URL，或保留默认封面。',
    })
  } else if (!coverImageUrl) {
    checks.push({
      level: 'info',
      code: 'COVER_FALLBACK_DEFAULT',
      field: 'cover_image_url',
      message: '将使用默认封面图。',
    })
  }

  const firstH1 = extractFirstH1Text(contentHtml)
  if (firstH1 && normalizedTitle && firstH1 === normalizedTitle) {
    checks.push({
      level: 'warning',
      code: 'DUPLICATE_H1',
      field: 'content_html',
      message: '正文里还有同名一级标题，公众号里可能出现重复标题。',
      suggested_fix: '删除正文开头的同名 H1。',
    })
  }

  if (hasListMarkup(contentHtml) && !hasWechatListMarkers(contentHtml)) {
    checks.push({
      level: 'warning',
      code: 'LIST_MARKERS_MISSING',
      field: 'content_html',
      message: '检测到列表，但没有公众号可见列表标记。',
      suggested_fix: '重新生成公众号格式后再发布。',
    })
  }

  if (imageSources.length >= IMAGE_TIMEOUT_RISK_COUNT) {
    checks.push({
      level: 'warning',
      code: 'IMAGE_TIMEOUT_RISK',
      field: 'content_html',
      message: `正文包含 ${imageSources.length} 张图片，上传可能耗时较久。`,
      suggested_fix: '图片较多时可先创建草稿，稍后到公众号后台确认。',
    })
  }

  const blocking = hasBlockingWechatPublishChecks(checks)
  const listWarning = checks.some(
    (check) => check.code === 'LIST_MARKERS_MISSING',
  )

  return {
    checks,
    readiness: {
      convert_ready: !blocking,
      upload_ready: !blocking && dataUrlImageCount === 0,
      draft_ready:
        !blocking && Boolean(accountId) && Boolean(resolvedCoverImageUrl),
      preview_fidelity: listWarning ? 'degraded' : 'exact',
    },
    summary: {
      image_count: imageSources.length,
      data_url_image_count: dataUrlImageCount,
      remote_image_count: imageSources.length - dataUrlImageCount,
      cover_ready: Boolean(resolvedCoverImageUrl),
      estimated_upload_seconds:
        imageSources.length === 0 ? 0 : Math.max(8, imageSources.length * 7),
      normalized_changed_fields: changedFields({
        ...input,
        normalizedTitle,
        normalizedAuthor,
        normalizedDigest,
      }),
    },
  }
}

export function hasBlockingWechatPublishChecks(checks: WechatPublishCheck[]) {
  return checks.some((check) => check.level === 'error')
}

export function getBlockingWechatPublishChecks(checks: WechatPublishCheck[]) {
  return checks.filter((check) => check.level === 'error')
}

export function formatWechatPublishCheckSummary(checks: WechatPublishCheck[]) {
  return checks.map((check) => check.message).join(' ')
}
