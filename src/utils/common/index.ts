import qrcode from 'qrcode'

export function url2QRcore(url: string): string {
  let strImg = ''
  qrcode.toString(url, { width: 64 }, (e, s) => {
    if (e) {
      console.log(e)
    }
    strImg = s
  })
  return strImg
}
export function url2Img(url: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(url2QRcore(url))}`
}
