export function formatDate(date: Date | string | number, fmt = 'yyyy-MM-dd hh:mm:ss') {
  const d = date instanceof Date ? date : new Date(date)

  const o: Record<string, number> = {
    'M+': d.getMonth() + 1, // 月份
    'd+': d.getDate(), // 日
    'h+': d.getHours(), // 小时
    'm+': d.getMinutes(), // 分
    's+': d.getSeconds(), // 秒
    'q+': Math.floor((d.getMonth() + 3) / 3), // 季度
    'S': d.getMilliseconds(), // 毫秒
  }

  // 年份替换
  fmt = fmt.replace(/(y+)/, (_, yearMatch) =>
    `${d.getFullYear()}`.slice(4 - yearMatch.length))

  // 其他替换
  for (const k in o) {
    fmt = fmt.replace(new RegExp(`(${k})`), (_, match) => {
      const val = o[k].toString()
      return match.length === 1 ? val : val.padStart(match.length, '0')
    })
  }

  return fmt
}

export function formatShowDate(date: Date | string) {
  const source = +new Date(date)
  const now = +new Date()
  const diff = now - source
  const oneSeconds = 1000
  const oneMinute = oneSeconds * 60
  const oneHour = oneMinute * 60
  const oneDay = oneHour * 24
  const oneWeek = oneDay * 7
  if (diff < oneMinute) {
    return `${Math.floor(diff / oneSeconds)}秒前`
  }
  if (diff < oneHour) {
    return `${Math.floor(diff / oneMinute)}分钟前`
  }
  if (diff < oneDay) {
    return `${Math.floor(diff / oneHour)}小时前`
  }
  if (diff < oneWeek) {
    return `${Math.floor(diff / oneDay)}天前`
  }

  return formatDate(new Date(date), 'yyyy-MM-dd')
}
