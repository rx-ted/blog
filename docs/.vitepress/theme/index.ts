import BlogTheme from '../../../src'

export default {
  ...BlogTheme,
  enhanceApp(ctx: any) {
    BlogTheme?.enhanceApp?.(ctx)
  },
}
