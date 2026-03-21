<template>
  <view class="item" @tap="$emit('play')">
    <image class="item-cover" :src="api.proxyImage(track.cover)" mode="aspectFill" />
    <view class="item-info">
      <text class="item-title" :class="{ active: isActive }">{{ track.title }}</text>
      <text class="item-artist">{{ track.artist }} · {{ formatDuration(track.duration) }}</text>
    </view>
    <view v-if="showDelete" class="item-delete" @tap.stop="$emit('delete')">
      <text class="delete-icon">×</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { api, type Track } from '../../utils/api';

defineProps<{
  track: Track;
  isActive?: boolean;
  showDelete?: boolean;
}>();
defineEmits<{ play: []; delete: [] }>();

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
</script>

<style scoped>
.item {
  display: flex;
  align-items: center;
  padding: 18rpx 16rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 1rpx 8rpx rgba(0, 0, 0, 0.03);
  cursor: pointer;
}

.item-cover {
  width: 88rpx;
  height: 88rpx;
  border-radius: 12rpx;
  margin-right: 20rpx;
}

.item-info {
  flex: 1;
  overflow: hidden;
}

.item-title {
  font-size: 28rpx;
  color: #1d1d1f;
  display: block;
  margin-bottom: 6rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.item-title.active {
  color: #fb7299;
}

.item-artist {
  font-size: 22rpx;
  color: #8e8e93;
}

.item-delete {
  padding: 10rpx 16rpx;
}

.delete-icon {
  font-size: 36rpx;
  color: #c7c7cc;
}
</style>
