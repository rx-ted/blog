import type { NextRequest } from 'next/server'
import {
  ensureAuthenticatedRequest,
  getRouteEnvWithDb,
  jsonError,
  jsonOk,
  parseJsonBody,
} from '@/lib/server/route-helpers'
import {
  assertWechatBridgeReady,
  fetchWechatBridgeJson,
  getWechatBridgeConfig,
} from '@/lib/wechat-bridge-config'
import { resolvePostCoverImage } from '@/lib/default-cover-images'
import { getSiteUrl } from '@/lib/site-config'
import { explainWechatPublishError } from '@/lib/wechat-publish-errors'
import {
  formatWechatPublishCheckSummary,
  getBlockingWechatPublishChecks,
  inspectWechatPublishInput,
} from '@/lib/wechat-publish-inspect'
import {
  WECHAT_DEFAULT_AUTHOR,
  WECHAT_DEFAULT_NEED_OPEN_COMMENT,
} from '@/lib/wechat-publish-defaults'
import {
  WECHAT_DRAFT_AUTHOR_MAX_CHARS,
  WECHAT_DRAFT_DIGEST_MAX_BYTES,
  WECHAT_DRAFT_DIGEST_MAX_CHARS,
  truncateWechatText,
} from '@/lib/wechat-publish-limits'

interface PublishWechatBody {
  account_id?: string
  title?: string
  content_html?: string
  author?: string
  digest?: string
  content_source_url?: string
  cover_image_url?: string
  publish_now?: boolean
  need_open_comment?: boolean
  only_fans_can_comment?: boolean
  dry_run?: boolean
}

const WECHAT_PUBLISH_TIMEOUT_MS = 180_000

function createWechatPublishTimeoutSignal() {
  return typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(WECHAT_PUBLISH_TIMEOUT_MS)
    : undefined
}

function isRequestTimeoutError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' || error.name === 'TimeoutError')
  )
}

export async function POST(req: NextRequest) {
  const route = await getRouteEnvWithDb('DB unavailable')
  if (!route.ok) return route.response

  const unauthorized = await ensureAuthenticatedRequest(req, route.db)
  if (unauthorized) return unauthorized

  try {
    const body = await parseJsonBody<PublishWechatBody>(req)
    const accountId = (body.account_id || '').trim()
    const rawTitle = body.title || ''
    const title = rawTitle.trim()
    const contentHtml = (body.content_html || '').trim()
    const rawAuthor = body.author || ''
    const author =
      truncateWechatText(rawAuthor, WECHAT_DRAFT_AUTHOR_MAX_CHARS) ||
      truncateWechatText(WECHAT_DEFAULT_AUTHOR, WECHAT_DRAFT_AUTHOR_MAX_CHARS)
    const rawDigest = body.digest || ''
    const digest = truncateWechatText(
      rawDigest,
      WECHAT_DRAFT_DIGEST_MAX_CHARS,
      WECHAT_DRAFT_DIGEST_MAX_BYTES,
    )
    const needOpenComment =
      body.need_open_comment === undefined
        ? WECHAT_DEFAULT_NEED_OPEN_COMMENT
        : Boolean(body.need_open_comment)
    const onlyFansCanComment =
      needOpenComment && Boolean(body.only_fans_can_comment)
    const requestedCoverImageUrl = (body.cover_image_url || '').trim()
    const coverImageUrl = resolvePostCoverImage(
      {
        cover_image: requestedCoverImageUrl,
        title,
      },
      { baseUrl: getSiteUrl() },
    )
    const inspect = inspectWechatPublishInput({
      accountId,
      title: rawTitle,
      normalizedTitle: title,
      author: rawAuthor,
      normalizedAuthor: author,
      digest: rawDigest,
      normalizedDigest: digest,
      contentHtml,
      coverImageUrl: requestedCoverImageUrl,
      resolvedCoverImageUrl: coverImageUrl,
    })

    if (body.dry_run) {
      return jsonOk({
        success: true,
        inspect,
        normalized: {
          title,
          author,
          digest,
          cover_image_url: coverImageUrl,
        },
      })
    }

    if (!accountId) return jsonError('请选择公众号账号', 400)
    if (!title) return jsonError('文章标题不能为空', 400)
    if (!contentHtml) return jsonError('文章内容不能为空', 400)

    const blockingChecks = getBlockingWechatPublishChecks(inspect.checks)
    if (blockingChecks.length > 0) {
      return jsonError(
        `公众号发布前检查未通过：${formatWechatPublishCheckSummary(blockingChecks)}`,
        400,
      )
    }

    const config = assertWechatBridgeReady(
      await getWechatBridgeConfig(route.db, route.env),
    )
    const result = await fetchWechatBridgeJson<Record<string, unknown>>(
      config,
      '/v1/wechat/publish',
      {
        method: 'POST',
        signal: createWechatPublishTimeoutSignal(),
        body: JSON.stringify({
          account_id: accountId,
          title,
          content_html: contentHtml,
          author,
          digest,
          content_source_url: (body.content_source_url || '').trim(),
          cover_image_url: coverImageUrl,
          publish_now: Boolean(body.publish_now),
          need_open_comment: needOpenComment,
          only_fans_can_comment: onlyFansCanComment,
        }),
      },
    )

    return jsonOk(result)
  } catch (error) {
    if (isRequestTimeoutError(error)) {
      return jsonError(
        '提交公众号发布超时，文章图片较多时可能需要更久。请稍后查看公众号草稿，或重试。',
        504,
      )
    }
    return jsonError(explainWechatPublishError(error), 500)
  }
}
