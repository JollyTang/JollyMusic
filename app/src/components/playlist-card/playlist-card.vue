<template>
  <view class="card" @tap="$emit('tap')">
    <view class="card-cover">
      <image
        v-if="coverUrl"
        class="cover-img"
        :src="coverUrl"
        mode="aspectFill"
      />
      <view v-else class="cover-placeholder">
        <text class="icon-text">♫</text>
      </view>
    </view>
    <view class="card-info">
      <text class="card-name">{{ playlist.name }}</text>
      <text class="card-count">{{ playlist.tracks?.length || 0 }} 首</text>
    </view>
    <view class="card-actions" @tap.stop="$emit('delete')">
      <text class="delete-btn">删除</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Playlist } from '../../utils/api';
import { api } from '../../utils/api';

const props = defineProps<{ playlist: Playlist }>();
defineEmits<{ tap: []; delete: [] }>();

const coverUrl = computed(() => {
  const raw = props.playlist.cover || props.playlist.tracks?.[0]?.cover || '';
  return raw ? api.proxyImage(raw) : '';
});
</script>

<style scoped>
.card {
  display: flex;
  align-items: center;
  padding: 24rpx 20rpx;
  background-color: #ffffff;
  border-radius: 20rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  cursor: pointer;
}

.card-cover {
  width: 96rpx;
  height: 96rpx;
  border-radius: 16rpx;
  overflow: hidden;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.cover-img {
  width: 100%;
  height: 100%;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #fb7299, #f04e7d);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(251, 114, 153, 0.25);
}

.icon-text {
  font-size: 44rpx;
  color: #ffffff;
}

.card-info {
  flex: 1;
}

.card-name {
  font-size: 30rpx;
  color: #1d1d1f;
  display: block;
  margin-bottom: 6rpx;
  font-weight: 500;
}

.card-count {
  font-size: 24rpx;
  color: #8e8e93;
}

.delete-btn {
  font-size: 26rpx;
  color: #c7c7cc;
  padding: 10rpx 20rpx;
}
</style>
