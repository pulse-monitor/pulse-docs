import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import HeroShots from './HeroShots.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout: () =>
    // 用 home-hero-image 插槽把默认的单张图换成轮播
    h(DefaultTheme.Layout, null, {
      'home-hero-image': () => h(HeroShots),
    }),
}
