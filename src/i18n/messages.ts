import type { App } from '@/theme/app';

import auth from './messages/auth';
import blog from './messages/blog';
import common from './messages/common';
import dashboard from './messages/dashboard';
import search from './messages/search';

export type MessageSchema = Record<string, string>;

export const messages: Record<App.Locale, MessageSchema> = {
  'zh-CN': {
    ...common['zh-CN'],
    ...auth['zh-CN'],
    ...blog['zh-CN'],
    ...dashboard['zh-CN'],
    ...search['zh-CN'],
  },
  en: {
    ...common.en,
    ...auth.en,
    ...blog.en,
    ...dashboard.en,
    ...search.en,
  },
};
