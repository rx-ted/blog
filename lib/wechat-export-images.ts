export type WechatExportImageVariant = 'content' | 'cover'

export function rewriteWechatExportImageUrl(
  input: string,
  baseUrl: string,
  variant: WechatExportImageVariant,
) {
  const url = new URL(input, baseUrl)

  if (
    url.origin === new URL(baseUrl).origin &&
    url.pathname.startsWith('/api/images/')
  ) {
    if (variant === 'content') {
      url.searchParams.set('w', '1280')
      url.searchParams.set('q', '82')
      url.searchParams.set('format', 'jpeg')
    } else {
      url.searchParams.set('w', '1280')
      url.searchParams.set('h', '720')
      url.searchParams.set('fit', 'cover')
      url.searchParams.set('q', '92')
      url.searchParams.set('format', 'jpeg')
    }
  }

  return url.toString()
}
