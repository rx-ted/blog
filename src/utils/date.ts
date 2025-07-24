export function formatDate(
  input: number | string | Date,
  fmt = 'yyyy-MM-dd hh:mm:ss'
): string {
  const d = input instanceof Date ? input : new Date(input);

  const map: Record<string, number> = {
    'M+': d.getMonth() + 1,
    'd+': d.getDate(),
    'h+': d.getHours(),
    'm+': d.getMinutes(),
    's+': d.getSeconds(),
    'q+': Math.floor((d.getMonth() + 3) / 3),
    S: d.getMilliseconds(),
  };

  // 年份
  fmt = fmt.replace(/(y+)/g, (_, match) =>
    d.getFullYear().toString().slice(4 - match.length)
  );

  // 其他
  for (const [pattern, value] of Object.entries(map)) {
    fmt = fmt.replace(new RegExp(`(${pattern})`), (_, match) =>
      match.length === 1
        ? value.toString()
        : value.toString().padStart(match.length, '0')
    );
  }

  return fmt;
}

export function formatShowDate(date: Date | string) {
  const source = new Date(date);
  const now = new Date();
  const diff = now.getTime() - source.getTime();
  const oneSeconds = 1000;
  const oneMinute = oneSeconds * 60;
  const oneHour = oneMinute * 60;
  const oneDay = oneHour * 24;
  const oneWeek = oneDay * 7;
  if (diff < oneMinute) {
    return `${Math.floor(diff / oneSeconds)}秒前`;
  }
  if (diff < oneHour) {
    return `${Math.floor(diff / oneMinute)}分钟前`;
  }
  if (diff < oneDay) {
    return `${Math.floor(diff / oneHour)}小时前`;
  }
  if (diff < oneWeek) {
    return `${Math.floor(diff / oneDay)}天前`;
  }

  return formatDate(source, 'yyyy-MM-dd');
}
