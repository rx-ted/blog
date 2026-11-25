import { describe, expect, it } from 'vitest'
import { explainWechatPublishError } from '@/lib/wechat-publish-errors'

describe('wechat publish errors', () => {
  it('maps WeChat description limit errors to actionable copy', () => {
    expect(
      explainWechatPublishError(
        new Error(
          'description size out of limit hint errcode=45004 path=/cgi-bin/draft/add',
        ),
      ),
    ).toBe('微信公众号摘要/描述超出限制，请把摘要控制在 120 bytes 以内后重试。')
  })

  it('maps WeChat title limit errors to the draft API boundary', () => {
    expect(
      explainWechatPublishError(
        new Error(
          'title size out of limit hint errcode=45003 path=/cgi-bin/draft/add',
        ),
      ),
    ).toBe(
      '微信草稿 API 标题超出限制，请把标题控制在 64 个字以内后重试。微信草稿 add API 实测支持 64 个字符，65 个字符会返回 45003；官方文档仍写 32，发布前以实测接口边界为准。',
    )
  })
})
