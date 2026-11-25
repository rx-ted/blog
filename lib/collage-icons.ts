export type CollageIconCategory =
  | '箭头'
  | '形状'
  | 'UI'
  | '社交'
  | '文件'
  | '编辑'
  | '媒体'
  | '商业'
  | '天气'
  | '其他'

export type CollageIconConfig = {
  name: string
  category: CollageIconCategory
  keywords: string[]
}

export const COLLAGE_RECENT_ICONS_KEY = 'qmblog_collage_recent_icons'
export const MAX_RECENT_COLLAGE_ICONS = 8

export const COLLAGE_ICON_LIBRARY: CollageIconConfig[] = [
  {
    name: 'ArrowUp',
    category: '箭头',
    keywords: ['arrow', 'up', '上', '箭头'],
  },
  {
    name: 'ArrowDown',
    category: '箭头',
    keywords: ['arrow', 'down', '下', '箭头'],
  },
  {
    name: 'ArrowLeft',
    category: '箭头',
    keywords: ['arrow', 'left', '左', '箭头'],
  },
  {
    name: 'ArrowRight',
    category: '箭头',
    keywords: ['arrow', 'right', '右', '箭头'],
  },
  {
    name: 'ArrowUpRight',
    category: '箭头',
    keywords: ['arrow', 'right', '右上', '增长'],
  },
  {
    name: 'ArrowDownRight',
    category: '箭头',
    keywords: ['arrow', 'right', '右下', '下降'],
  },
  {
    name: 'ChevronRight',
    category: '箭头',
    keywords: ['chevron', 'right', '右', '切换'],
  },
  {
    name: 'ChevronsRight',
    category: '箭头',
    keywords: ['chevrons', 'right', '双右'],
  },
  {
    name: 'RefreshCw',
    category: '箭头',
    keywords: ['refresh', '刷新', '循环'],
  },
  { name: 'Repeat', category: '箭头', keywords: ['repeat', '重复', '循环'] },
  { name: 'Shuffle', category: '箭头', keywords: ['shuffle', '随机', '打乱'] },
  { name: 'MoveUpRight', category: '箭头', keywords: ['move', '移动', '右上'] },

  { name: 'Circle', category: '形状', keywords: ['circle', '圆', '圆形'] },
  { name: 'Square', category: '形状', keywords: ['square', '方', '方形'] },
  {
    name: 'Triangle',
    category: '形状',
    keywords: ['triangle', '三角', '三角形'],
  },
  { name: 'Diamond', category: '形状', keywords: ['diamond', '菱形', '钻石'] },
  { name: 'Star', category: '形状', keywords: ['star', '星', '星星'] },
  {
    name: 'Sparkles',
    category: '形状',
    keywords: ['sparkles', '闪光', '亮点'],
  },
  { name: 'Heart', category: '形状', keywords: ['heart', '爱心', '喜欢'] },
  { name: 'Crown', category: '形状', keywords: ['crown', '皇冠', '精选'] },
  { name: 'Award', category: '形状', keywords: ['award', '奖章', '奖励'] },
  {
    name: 'ShieldCheck',
    category: '形状',
    keywords: ['shield', '安全', '验证'],
  },
  { name: 'Zap', category: '形状', keywords: ['zap', '闪电', '效率'] },
  { name: 'Flame', category: '形状', keywords: ['flame', '火', '热门'] },

  { name: 'Search', category: 'UI', keywords: ['search', '搜索', '查找'] },
  { name: 'Settings', category: 'UI', keywords: ['settings', '设置', '齿轮'] },
  { name: 'Home', category: 'UI', keywords: ['home', '首页', '主页'] },
  { name: 'User', category: 'UI', keywords: ['user', '用户', '人'] },
  { name: 'Users', category: 'UI', keywords: ['users', '人群', '团队'] },
  { name: 'Bell', category: 'UI', keywords: ['bell', '通知', '提醒'] },
  { name: 'Info', category: 'UI', keywords: ['info', '信息', '提示'] },
  { name: 'CircleAlert', category: 'UI', keywords: ['alert', '警告', '提醒'] },
  { name: 'CircleHelp', category: 'UI', keywords: ['help', '问题', '帮助'] },
  { name: 'Check', category: 'UI', keywords: ['check', '对', '确认'] },
  { name: 'CircleCheck', category: 'UI', keywords: ['check', '完成', '成功'] },
  { name: 'CircleX', category: 'UI', keywords: ['x', '错误', '关闭'] },
  { name: 'Plus', category: 'UI', keywords: ['plus', '添加', '加'] },
  { name: 'Minus', category: 'UI', keywords: ['minus', '减少', '减'] },
  {
    name: 'SlidersHorizontal',
    category: 'UI',
    keywords: ['sliders', '调节', '参数'],
  },
  { name: 'Layers', category: 'UI', keywords: ['layers', '图层', '层级'] },

  {
    name: 'MessageCircle',
    category: '社交',
    keywords: ['message', '消息', '聊天'],
  },
  { name: 'Send', category: '社交', keywords: ['send', '发送', '飞机'] },
  { name: 'Share2', category: '社交', keywords: ['share', '分享', '转发'] },
  { name: 'ThumbsUp', category: '社交', keywords: ['thumbs', '点赞', '赞'] },
  { name: 'Smile', category: '社交', keywords: ['smile', '笑脸', '表情'] },
  { name: 'AtSign', category: '社交', keywords: ['at', '@', '提及'] },
  { name: 'Hash', category: '社交', keywords: ['hash', '#', '话题'] },
  { name: 'PhoneCall', category: '社交', keywords: ['phone', '电话', '通话'] },

  { name: 'FileText', category: '文件', keywords: ['file', '文档', '文本'] },
  {
    name: 'FolderOpen',
    category: '文件',
    keywords: ['folder', '文件夹', '打开'],
  },
  { name: 'Download', category: '文件', keywords: ['download', '下载'] },
  { name: 'Upload', category: '文件', keywords: ['upload', '上传'] },
  { name: 'Save', category: '文件', keywords: ['save', '保存'] },
  { name: 'Copy', category: '文件', keywords: ['copy', '复制'] },
  { name: 'Link', category: '文件', keywords: ['link', '链接'] },
  { name: 'Archive', category: '文件', keywords: ['archive', '归档', '压缩'] },

  { name: 'Pencil', category: '编辑', keywords: ['pencil', '编辑', '铅笔'] },
  { name: 'Type', category: '编辑', keywords: ['type', '文字', '字体'] },
  {
    name: 'Highlighter',
    category: '编辑',
    keywords: ['highlighter', '高亮', '标记'],
  },
  {
    name: 'Palette',
    category: '编辑',
    keywords: ['palette', '颜色', '调色板'],
  },
  { name: 'Pipette', category: '编辑', keywords: ['pipette', '取色', '吸管'] },
  { name: 'Brush', category: '编辑', keywords: ['brush', '画笔', '绘画'] },
  { name: 'WandSparkles', category: '编辑', keywords: ['wand', '魔法', 'AI'] },
  { name: 'Crop', category: '编辑', keywords: ['crop', '裁剪', '剪裁'] },

  { name: 'Image', category: '媒体', keywords: ['image', '图片', '照片'] },
  { name: 'Camera', category: '媒体', keywords: ['camera', '相机', '拍照'] },
  { name: 'Video', category: '媒体', keywords: ['video', '视频'] },
  { name: 'Music', category: '媒体', keywords: ['music', '音乐'] },
  { name: 'Play', category: '媒体', keywords: ['play', '播放'] },
  { name: 'Mic', category: '媒体', keywords: ['mic', '麦克风', '音频'] },
  {
    name: 'Monitor',
    category: '媒体',
    keywords: ['monitor', '屏幕', '显示器'],
  },
  { name: 'Smartphone', category: '媒体', keywords: ['phone', '手机', '移动'] },

  {
    name: 'ShoppingCart',
    category: '商业',
    keywords: ['cart', '购物车', '电商'],
  },
  {
    name: 'CreditCard',
    category: '商业',
    keywords: ['credit', 'card', '支付'],
  },
  { name: 'DollarSign', category: '商业', keywords: ['dollar', '钱', '美元'] },
  {
    name: 'TrendingUp',
    category: '商业',
    keywords: ['trending', '增长', '上涨'],
  },
  {
    name: 'TrendingDown',
    category: '商业',
    keywords: ['trending', '下降', '下跌'],
  },
  { name: 'ChartLine', category: '商业', keywords: ['chart', '图表', '趋势'] },
  {
    name: 'ChartNoAxesColumn',
    category: '商业',
    keywords: ['chart', '柱状图', '数据'],
  },
  {
    name: 'BriefcaseBusiness',
    category: '商业',
    keywords: ['briefcase', '商业', '工作'],
  },

  { name: 'Sun', category: '天气', keywords: ['sun', '太阳', '晴天'] },
  { name: 'Moon', category: '天气', keywords: ['moon', '月亮', '夜晚'] },
  { name: 'Cloud', category: '天气', keywords: ['cloud', '云', '天气'] },
  { name: 'CloudRain', category: '天气', keywords: ['rain', '雨', '下雨'] },
  { name: 'Snowflake', category: '天气', keywords: ['snow', '雪', '雪花'] },
  { name: 'Umbrella', category: '天气', keywords: ['umbrella', '雨伞', '伞'] },

  {
    name: 'Calendar',
    category: '其他',
    keywords: ['calendar', '日历', '日期'],
  },
  { name: 'Clock', category: '其他', keywords: ['clock', '时间', '时钟'] },
  { name: 'MapPin', category: '其他', keywords: ['map', '位置', '地图'] },
  { name: 'Globe', category: '其他', keywords: ['globe', '全球', '网络'] },
  { name: 'Wifi', category: '其他', keywords: ['wifi', '网络', '无线'] },
  { name: 'QrCode', category: '其他', keywords: ['qr', '二维码', '扫码'] },
  { name: 'Key', category: '其他', keywords: ['key', '钥匙', '密钥'] },
  { name: 'Lock', category: '其他', keywords: ['lock', '锁', '安全'] },
]

export function getCollageIconCategories(): CollageIconCategory[] {
  return Array.from(new Set(COLLAGE_ICON_LIBRARY.map((icon) => icon.category)))
}

export function searchCollageIcons(
  query: string,
  category: CollageIconCategory | 'all' = 'all',
) {
  const normalizedQuery = query.trim().toLowerCase()
  return COLLAGE_ICON_LIBRARY.filter((icon) => {
    if (category !== 'all' && icon.category !== category) return false
    if (!normalizedQuery) return true
    return (
      icon.name.toLowerCase().includes(normalizedQuery) ||
      icon.category.toLowerCase().includes(normalizedQuery) ||
      icon.keywords.some((keyword) =>
        keyword.toLowerCase().includes(normalizedQuery),
      )
    )
  })
}

export function getRecentCollageIcons(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = window.localStorage.getItem(COLLAGE_RECENT_ICONS_KEY)
    if (!stored) return []
    const names = JSON.parse(stored)
    return Array.isArray(names)
      ? names.filter((name): name is string => typeof name === 'string')
      : []
  } catch {
    return []
  }
}

export function addRecentCollageIcon(iconName: string): string[] {
  if (typeof window === 'undefined') return []

  const next = [
    iconName,
    ...getRecentCollageIcons().filter((name) => name !== iconName),
  ].slice(0, MAX_RECENT_COLLAGE_ICONS)
  window.localStorage.setItem(COLLAGE_RECENT_ICONS_KEY, JSON.stringify(next))
  return next
}
