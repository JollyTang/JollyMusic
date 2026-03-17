<template>
  <view class="page">
    <view v-if="playlistStore.loading" class="loading">
      <view class="loading-spinner" />
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else>
      <view v-if="playlistStore.currentTracks.length === 0" class="empty">
        <text class="empty-icon">🎵</text>
        <text class="empty-text">歌单还是空的</text>
        <text class="empty-hint">去搜索BV号添加曲目吧</text>
      </view>

      <view v-else class="track-list">
        <view class="list-header">
          <view class="play-all" @tap="playAll">
            <view class="play-all-btn">
              <text class="play-all-icon">▶</text>
            </view>
            <text class="play-all-text">播放全部 ({{ playlistStore.currentTracks.length }})</text>
          </view>
        </view>

        <TrackItem
          v-for="track in playlistStore.currentTracks"
          :key="track.id"
          :track="track"
          :is-active="isTrackPlaying(track)"
          :show-delete="true"
          @play="playTrack(track)"
          @delete="confirmRemove(track)"
        />
      </view>
    </view>

    <MiniPlayer />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { usePlaylistStore } from '../../stores/playlist';
import { usePlayerStore } from '../../stores/player';
import TrackItem from '../../components/track-item/track-item.vue';
import MiniPlayer from '../../components/mini-player/mini-player.vue';
import type { Track } from '../../utils/api';

const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();
const playlistId = ref(0);

onMounted(() => {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  playlistId.value = Number(page.$page?.options?.id || page.options?.id || 0);
  if (playlistId.value) {
    playlistStore.fetchTracks(playlistId.value);
  }
});

function playTrack(track: Track) {
  playerStore.play(track);
}

function playAll() {
  if (playlistStore.currentTracks.length > 0) {
    playerStore.setQueue(playlistStore.currentTracks, 0);
  }
}

function isTrackPlaying(track: Track): boolean {
  const ct = playerStore.currentTrack;
  return !!ct && ct.bvid === track.bvid && ct.cid === track.cid;
}

function confirmRemove(track: Track) {
  uni.showModal({
    title: '移除曲目',
    content: `确定要移除「${track.title}」吗？`,
    success: (res) => {
      if (res.confirm) {
        playlistStore.removeTrack(playlistId.value, track.id);
      }
    },
  });
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  padding-bottom: 200rpx;
  background-color: #f5f5f7;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 200rpx 0;
}

.loading-spinner {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid #e5e5ea;
  border-top-color: #fb7299;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 20rpx;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  color: #8e8e93;
  font-size: 28rpx;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 180rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #8e8e93;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #c7c7cc;
}

.list-header {
  margin-bottom: 16rpx;
}

.play-all {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
}

.play-all-btn {
  width: 52rpx;
  height: 52rpx;
  background: linear-gradient(135deg, #fb7299, #f04e7d);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-all-icon {
  font-size: 22rpx;
  color: #ffffff;
  margin-left: 4rpx;
}

.play-all-text {
  font-size: 30rpx;
  color: #1d1d1f;
  font-weight: 500;
}
</style>
