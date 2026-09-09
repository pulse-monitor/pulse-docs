<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

/**
 * 首页 hero 位置的截图轮播。
 *
 * 用淡入淡出而不是横向滑动：这几张图的构图差别很大（深色首页、浅色首页、
 * 单机详情、列表），滑动会让人以为是同一个界面在翻页；淡入淡出更像
 * 「换一张给你看」。
 *
 * 不放手机截图 —— 它的宽高比和另外四张差太多，混在一起会让容器高度乱跳。
 *
 * 四张图的比例并不一致（1.60 / 1.44 / 1.89）。所以边框和阴影画在 <img> 上而不是
 * 外层框上，配 object-fit: contain：每张都按自己的比例完整显示、不裁掉内容，
 * 外层框的高度是写死的，切换时页面不会跳。
 */
const shots = [
  { src: '/shots/home-dark.webp', alt: 'Pulse 首页（深色）', w: 1600, h: 1000 },
  { src: '/shots/home-light.webp', alt: 'Pulse 首页（浅色）', w: 1600, h: 1000 },
  { src: '/shots/detail.webp', alt: '单机详情：硬件、系统、六张图表', w: 1400, h: 972 },
  { src: '/shots/list.webp', alt: '列表视图：一行一台', w: 1400, h: 739 },
]

const INTERVAL = 4500
const at = ref(0)
const paused = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  // 用户关了动效就停在第一张，下面的点仍然能手动切
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  timer = setInterval(() => {
    if (!paused.value) at.value = (at.value + 1) % shots.length
  }, INTERVAL)
})
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="hero-shots" @mouseenter="paused = true" @mouseleave="paused = false">
    <div class="frame">
      <!-- 四张都渲染出来、靠 opacity 切换：这样浏览器会一次性把图都取回来，
           切到下一张时不会先白一下再出现 -->
      <img
        v-for="(s, i) in shots"
        :key="s.src"
        :src="s.src"
        :alt="s.alt"
        :class="{ on: i === at }"
        :aria-hidden="i !== at"
        :width="s.w"
        :height="s.h"
        :loading="i === 0 ? 'eager' : 'lazy'"
        decoding="async"
      />
    </div>
    <div class="dots" role="tablist" aria-label="切换截图">
      <button
        v-for="(s, i) in shots"
        :key="s.src"
        role="tab"
        :aria-selected="i === at"
        :aria-label="s.alt"
        :class="{ on: i === at }"
        @click="at = i"
      />
    </div>
  </div>
</template>

<style scoped>
.hero-shots {
  width: 100%;
  max-width: 640px;
}
.frame {
  position: relative;
  /* 高度写死（按占比最大的那张首页图算），切换时不会跳 */
  aspect-ratio: 1600 / 1000;
}
.frame img {
  position: absolute;
  inset: 0;
  margin: auto;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  /* contain 而不是 cover：宁可四周留点空，也不裁掉界面内容 */
  object-fit: contain;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  box-shadow:
    0 1px 2px rgb(0 0 0 / 0.06),
    0 14px 36px -10px rgb(0 0 0 / 0.24);
  opacity: 0;
  transition: opacity 0.7s ease;
}
.frame img.on {
  opacity: 1;
}
.dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 14px;
}
.dots button {
  height: 6px;
  width: 6px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--vp-c-gray-3);
  cursor: pointer;
  transition: all 0.25s ease;
}
.dots button.on {
  width: 18px;
  background: var(--vp-c-brand-1);
}
@media (prefers-reduced-motion: reduce) {
  .frame img {
    transition: none;
  }
}
</style>
