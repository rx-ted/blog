import BlogTheme from '@rx-ted/theme'
import './theme.var.css'
import { h } from 'vue'
import ChangeThemeDemo from './ChangeThemeDemo.vue'
import JoinGroup from './JoinGroup.vue'
import { Component } from 'vue';

let layout: Component | undefined | string = BlogTheme.Layout;
if (layout === undefined) {
  layout = ""
}

export default {
  ...BlogTheme,
  Layout: h(layout, undefined, {
    'doc-before': () => h(JoinGroup),
    'doc-after': () => h(JoinGroup, { showImg: true }),
  }),
  enhanceApp(ctx: any) {
    BlogTheme?.enhanceApp?.(ctx)
    ctx.app.component('ChangeThemeDemo', ChangeThemeDemo)
  }
}