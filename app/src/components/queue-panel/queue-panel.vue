<template>
  <view v-if="visible" class="overlay" @tap="$emit('close')">
    <view class="panel" @tap.stop>
      <!-- Header -->
      <view class="panel-header">
        <view class="header-left">
          <text class="panel-title">播放队列</text>
          <text class="panel-count">{{ playerStore.queue.length }} 首</text>
        </view>
        <view class="header-right">
          <view class="header-btn clear-btn" @tap="confirmClear">
            <text class="header-btn-text">清空</text>
          </view>
          <view class="header-btn close-btn" @tap="$emit('close')">
            <text class="close-icon">×</text>
          </view>
        </view>
      </view>

      <!-- Queue List -->
      <scroll-view
        v-if="playerStore.queue.length > 0"
        scroll-y
        :scroll-into-view="scrollTarget"
        class="queue-scroll"
      >
        <view
          v-for="(track, idx) in playerStore.queue"
          :key="`${track.bvid}-${track.cid}-${idx}`"
          :id="`qi-${idx}`"
          class="queue-item"
          :class="{
            active: idx === playerStore.currentIndex,
            dragging: dragIndex === idx,
            'drag-over': dragOverIndex === idx && dragIndex !== idx
          }"
          :draggable="true"
          @dragstart="onDragStart(idx, $event)"
          @dragover.prevent="onDragOver(idx)"
          @dragend="onDragEnd"
          @drop.prevent="onDrop(idx)"
          @tap="playerStore.play(track)"
        >
          <view class="item-index">
            <text v-if="idx === playerStore.currentIndex" class="now-icon">▶</text>
            <text v-else class="index-num">{{ idx + 1 }}</text>
          </view>
          <view class="item-info">
            <text class="item-name" :class="{ 'name-active': idx === playerStore.currentIndex }">{{ track.title }}</text>
            <text class="item-artist">{{ track.artist }}</text>
          </view>
          <text class="item-remove" @tap.stop="playerStore.removeFromQueue(idx)">×</text>
        </view>
      </scroll-view>

      <!-- Empty -->
      <view v-else class="empty">
        <text class="empty-icon">🎵</text>
        <text class="empty-text">队列是空的</text>
        <text class="empty-hint">去搜索添加一些歌曲吧</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { usePlayerStore } from '../../stores/player';

const props = defineProps<{ visible: boolean }>();
defineEmits<{ close: [] }>();

const playerStore = usePlayerStore();
const dragIndex = ref(-1);
const dragOverIndex = ref(-1);

const scrollTarget = computed(() => {
  if (!props.visible || playerStore.currentIndex < 0) return '';
  return `qi-${playerStore.currentIndex}`;
});

function onDragStart(idx: number, e: any) {
  dragIndex.value = idx;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }
}

function onDragOver(idx: number) {
  dragOverIndex.value = idx;
}

function onDrop(toIdx: number) {
  if (dragIndex.value >= 0 && dragIndex.value !== toIdx) {
    playerStore.moveInQueue(dragIndex.value, toIdx);
  }
  dragIndex.value = -1;
  dragOverIndex.value = -1;
}

function onDragEnd() {
  dragIndex.value = -1;
  dragOverIndex.value = -1;
}

function confirmClear() {
  if (playerStore.queue.length === 0) return;
  uni.showModal({
    title: '清空队列',
    content: '确定要清空播放队列吗？',
    success: (res) => {
      if (res.confirm) playerStore.clearQueue();
    },
  });
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 500;
  display: flex;
  justify-content: flex-end;
}

.panel {
  width: 72%;
  max-width: 680rpx;
  height: 100%;
  background: linear-gradient(180deg, #fdf2f4 0%, #ffffff 15%);
  box-shadow: -8rpx 0 40rpx rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.25s ease-out;
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 28rpx 24rpx;
  padding-top: calc(24rpx + env(safe-area-inset-top) + 44px);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}

.panel-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1d1d1f;
}

.panel-count {
  font-size: 24rpx;
  color: #8e8e93;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.header-btn {
  padding: 10rpx 20rpx;
  border-radius: 20rpx;
  cursor: pointer;
}

.clear-btn {
  background-color: #f2f2f7;
}

.header-btn-text {
  font-size: 24rpx;
  color: #fb7299;
}

.close-btn {
  width: 52rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f2f2f7;
  border-radius: 50%;
}

.close-icon {
  font-size: 36rpx;
  color: #8e8e93;
  line-height: 1;
}

.queue-scroll {
  flex: 1;
  overflow-y: auto;
}

.queue-item {
  display: flex;
  align-items: center;
  padding: 22rpx 28rpx;
  cursor: grab;
  transition: background-color 0.15s, opacity 0.15s;
}

.queue-item:not(:last-child) {
  border-bottom: 1rpx solid #f5f5f7;
}

.queue-item.active {
  background: linear-gradient(90deg, #fff5f7, #ffffff);
}

.queue-item.dragging {
  opacity: 0.35;
}

.queue-item.drag-over {
  box-shadow: 0 -3rpx 0 0 #fb7299 inset;
}

.item-index {
  width: 48rpx;
  flex-shrink: 0;
  text-align: center;
}

.now-icon {
  font-size: 22rpx;
  color: #fb7299;
}

.index-num {
  font-size: 24rpx;
  color: #c7c7cc;
}

.item-info {
  flex: 1;
  overflow: hidden;
  padding: 0 16rpx;
}

.item-name {
  font-size: 28rpx;
  color: #1d1d1f;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4rpx;
}

.name-active {
  color: #fb7299;
  font-weight: 600;
}

.item-artist {
  font-size: 22rpx;
  color: #8e8e93;
  display: block;
}

.item-remove {
  font-size: 36rpx;
  color: #d1d1d6;
  padding: 8rpx 4rpx 8rpx 12rpx;
  flex-shrink: 0;
  cursor: pointer;
}

.item-remove:active {
  color: #fb7299;
}

.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.empty-icon { font-size: 64rpx; }
.empty-text { font-size: 28rpx; color: #8e8e93; }
.empty-hint { font-size: 24rpx; color: #c7c7cc; }
</style>
