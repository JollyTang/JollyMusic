<template>
  <view
    class="icon-wrap"
    :class="{ 'icon-btn': clickable }"
    :style="{ width: size + 'rpx', height: size + 'rpx' }"
  >
    <!-- Player controls -->
    <svg v-if="name === 'play'" :width="svgSize" :height="svgSize" viewBox="0 0 24 24" fill="none">
      <path d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28A1 1 0 008 5.14z" :fill="color"/>
    </svg>
    <svg v-else-if="name === 'pause'" :width="svgSize" :height="svgSize" viewBox="0 0 24 24" fill="none">
      <rect x="6" y="4" width="4" height="16" rx="1" :fill="color"/>
      <rect x="14" y="4" width="4" height="16" rx="1" :fill="color"/>
    </svg>
    <svg v-else-if="name === 'prev'" :width="svgSize" :height="svgSize" viewBox="0 0 24 24" fill="none">
      <path d="M6 4h2v16H6V4zm12 .47L10.26 12 18 19.53V4.47z" :fill="color"/>
    </svg>
    <svg v-else-if="name === 'next'" :width="svgSize" :height="svgSize" viewBox="0 0 24 24" fill="none">
      <path d="M18 4h-2v16h2V4zM6 4.47v15.06L13.74 12 6 4.47z" :fill="color"/>
    </svg>

    <!-- Mode icons -->
    <svg v-else-if="name === 'sequence'" :width="svgSize" :height="svgSize" viewBox="0 0 24 24" fill="none">
      <path d="M4 15h2v2H4v-2zm4 0h12v2H8v-2zm-4-4h2v2H4v-2zm4 0h12v2H8v-2zm-4-4h2v2H4V7zm4 0h12v2H8V7z" :fill="color"/>
    </svg>
    <svg v-else-if="name === 'random'" :width="svgSize" :height="svgSize" viewBox="0 0 24 24" fill="none">
      <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm-.83 9.41l-1.41 1.41 3.13 3.13L13.5 20H20v-6.5l-2.04 2.04-4.29-4.13z" :fill="color"/>
    </svg>
    <svg v-else-if="name === 'loop'" :width="svgSize" :height="svgSize" viewBox="0 0 24 24" fill="none">
      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" :fill="color"/>
      <text x="12" y="14.5" text-anchor="middle" :fill="color" font-size="7" font-weight="700">1</text>
    </svg>

    <!-- Action icons -->
    <svg v-else-if="name === 'heart'" :width="svgSize" :height="svgSize" viewBox="0 0 24 24" fill="none">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" :fill="color" :opacity="filled ? 1 : 0.15"/>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" :stroke="color" stroke-width="1.5" fill="none"/>
    </svg>
    <svg v-else-if="name === 'bilibili'" :width="svgSize" :height="svgSize" viewBox="0 0 24 24" fill="none">
      <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 01-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 01.16-.187l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906l-1.174 1.094zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773H5.333zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373z" :fill="color"/>
    </svg>
    <svg v-else-if="name === 'queue'" :width="svgSize" :height="svgSize" viewBox="0 0 24 24" fill="none">
      <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" :fill="color"/>
    </svg>
    <svg v-else-if="name === 'close'" :width="svgSize" :height="svgSize" viewBox="0 0 24 24" fill="none">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" :fill="color"/>
    </svg>
    <svg v-else-if="name === 'search'" :width="svgSize" :height="svgSize" viewBox="0 0 24 24" fill="none">
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" :fill="color"/>
    </svg>
    <svg v-else-if="name === 'delete'" :width="svgSize" :height="svgSize" viewBox="0 0 24 24" fill="none">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" :fill="color"/>
    </svg>
    <svg v-else-if="name === 'share'" :width="svgSize" :height="svgSize" viewBox="0 0 24 24" fill="none">
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" :fill="color"/>
    </svg>
    <svg v-else-if="name === 'drag'" :width="svgSize" :height="svgSize" viewBox="0 0 24 24" fill="none">
      <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" :fill="color"/>
    </svg>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  name: string;
  size?: number;
  color?: string;
  clickable?: boolean;
  filled?: boolean;
}>(), {
  size: 40,
  color: '#3c3c43',
  clickable: false,
  filled: false,
});

const svgSize = computed(() => Math.round(props.size * 0.6) + 'rpx');
</script>

<style scoped>
.icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-btn {
  cursor: pointer;
  border-radius: 50%;
  transition: transform 0.12s ease, background-color 0.15s;
}

.icon-btn:active {
  transform: scale(0.85);
  background-color: rgba(0, 0, 0, 0.05);
}
</style>
