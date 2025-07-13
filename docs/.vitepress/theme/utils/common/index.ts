import qrcode from 'qrcode'



export const url2QRcore = (url: string): string => {
    let strImg = '';
    const qcode = qrcode.toString(url, { width: 64 }, (e, s) => {
        if (e) {
            console.log(e)
        }
        strImg = s
    })
    return strImg
}
export const url2Img = (url: string): string => {
    return `data:image/svg+xml;utf8,${encodeURIComponent(url2QRcore(url))}`
}