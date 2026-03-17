<template>
  <view class="page">
    <view class="status-bar" />

    <view v-if="playerStore.currentTrack" class="player">
      <view class="top-bar">
        <text class="back-btn" @tap="goBack">←</text>
        <view class="top-info">
          <text class="top-title">正在播放</text>
        </view>
        <view class="top-placeholder" />
      </view>

      <view class="cover-wrap">
        <image
          class="cover"
          :class="{ spinning: playerStore.isPlaying }"
          :src="playerStore.currentTrack.cover"
          mode="aspectFill"
        />
      </view>

      <view class="track-info">
        <text class="track-title">{{ playerStore.currentTrack.title }}</text>
        <text class="track-artist">{{ playerStore.currentTrack.artist }}</text>
      </view>

      <view class="progress-section">
        <view class="progress-bar" @tap="onProgressTap">
          <view class="progress-bg">
            <view class="progress-fill" :style="{ width: progressPercent + '%' }" />
            <view class="progress-dot" :style="{ left: progressPercent + '%' }" />
          </view>
        </view>
        <view class="time-labels">
          <text class="time">{{ playerStore.formatTime(playerStore.currentTime) }}</text>
          <text class="time">{{ playerStore.formatTime(playerStore.totalDuration) }}</text>
        </view>
      </view>

      <view class="controls">
        <view class="control-btn" @tap="playerStore.togglePlayMode()">
          <text class="mode-icon">{{ modeIcon }}</text>
        </view>
        <view class="control-btn" @tap="playerStore.playPrev()">
          <text class="nav-icon">⏮</text>
        </view>
        <view class="play-pause-btn" @tap="playerStore.togglePlay()">
          <text class="play-icon">{{ playerStore.isPlaying ? '⏸' : '▶' }}</text>
        </view>
        <view class="control-btn" @tap="playerStore.playNext()">
          <text class="nav-icon">⏭</text>
        </view>
        <view class="control-btn" @tap="showQueue = !showQueue">
          <text class="list-icon">☰</text>
        </view>
      </view>

      <text class="mode-label">{{ playerStore.playModeLabel }}</text>
    </view>

    <view v-else class="empty">
      <text class="empty-icon">🎵</text>
      <text class="empty-text">暂无播放内容</text>
      <text class="empty-hint">去搜索BV号开始播放吧</text>
    </view>

    <view v-if="showQueue" class="queue-overlay" @tap="showQueue = false">
      <view class="queue-panel" @tap.stop>
        <view class="queue-handle" />
        <view class="queue-header">
          <text class="queue-title">播放队列 ({{ playerStore.queue.length }})</text>
          <text class="queue-close" @tap="showQueue = false">关闭</text>
        </view>
        <scroll-view scroll-y class="queue-list">
          <view
            v-for="(track, idx) in playerStore.queue"
            :key="`${track.bvid}-${track.cid}`"
            class="queue-item"
            :class="{ active: idx === playerStore.currentIndex }"
            @tap="playerStore.play(track)"
          >
            <text class="queue-idx">{{ idx + 1 }}</text>
            <view class="queue-info">
              <text class="queue-name">{{ track.title }}</text>
              <text class="queue-artist">{{ track.artist }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePlayerStore } from '../../stores/player';

const playerStore = usePlayerStore();
const showQueue = ref(false);

const progressPercent = computed(() => {
  if (!playerStore.totalDuration) return 0;
  return (playerStore.currentTime / playerStore.totalDuration) * 100;
});

const modeIcon = computed(() => {
  const icons: Record<string, string> = { sequence: '🔁', random: '🔀', loop: '🔂' };
  return icons[playerStore.playMode] || '🔁';
});

function goBack() {
  uni.navigateBack();
}

function onProgressTap(e: any) {
  const touch = e.touches?.[0] || e.changedTouches?.[0];
  if (!touch || !playerStore.totalDuration) return;
  uni.createSelectorQuery()
    .select('.progress-bg')
    .boundingClientRect((rect: any) => {
      if (!rect) return;
      const percent = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
      playerStore.seekTo(percent * playerStore.totalDuration);
    })
    .exec();
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #2d1b3d 0%, #1a1a2e 40%, #0f0f1a 100%);
  display: flex;
  flex-direction: column;
}

.status-bar {
  height: env(safe-area-inset-top);
}

.player {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 40rpx;
}

.top-bar {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
}

.back-btn {
  font-size: 40rpx;
  color: #ffffff;
  padding: 10rpx;
}

.top-info { text-align: center; }

.top-title {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.6);
}

.top-placeholder { width: 60rpx; }

.cover-wrap {
  margin: 40rpx 0 50rpx;
}

.cover {
  width: 480rpx;
  height: 480rpx;
  border-radius: 50%;
  border: 8rpx solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.4);
}

.spinning {
  animation: spin 20s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.track-info {
  text-align: center;
  margin-bottom: 50rpx;
  width: 100%;
}

.track-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #ffffff;
  display: block;
  margin-bottom: 10rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-artist {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.5);
}

.progress-section {
  width: 100%;
  margin-bottom: 40rpx;
}

.progress-bar { padding: 20rpx 0; }

.progress-bg {
  position: relative;
  width: 100%;
  height: 6rpx;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 3rpx;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #fb7299, #f04e7d);
  border-radius: 3rpx;
  transition: width 0.3s linear;
}

.progress-dot {
  position: absolute;
  top: 50%;
  width: 22rpx;
  height: 22rpx;
  background-color: #ffffff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
}

.time-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 10rpx;
}

.time {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.4);
}

.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48rpx;
}

.control-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mode-icon { font-size: 36rpx; }
.nav-icon { font-size: 40rpx; color: #ffffff; }
.list-icon { font-size: 36rpx; color: rgba(255,255,255,0.6); }

.play-pause-btn {
  width: 120rpx;
  height: 120rpx;
  background: linear-gradient(135deg, #fb7299, #f04e7d);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 30rpx rgba(251, 114, 153, 0.4);
}

.play-icon {
  font-size: 44rpx;
  color: #ffffff;
}

.mode-label {
  margin-top: 24rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.3);
}

.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-icon { font-size: 80rpx; margin-bottom: 24rpx; }
.empty-text { font-size: 32rpx; color: rgba(255,255,255,0.5); margin-bottom: 12rpx; }
.empty-hint { font-size: 26rpx; color: rgba(255,255,255,0.3); }

/* Queue */
.queue-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}

.queue-panel {
  width: 100%;
  max-height: 60vh;
  background-color: #1e1e2e;
  border-radius: 28rpx 28rpx 0 0;
  padding: 0 24rpx 24rpx;
}

.queue-handle {
  width: 64rpx;
  height: 8rpx;
  background-color: rgba(255,255,255,0.2);
  border-radius: 4rpx;
  margin: 16rpx auto;
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0 20rpx;
}

.queue-title { font-size: 30rpx; color: #ffffff; font-weight: 500; }
.queue-close { font-size: 28rpx; color: rgba(255,255,255,0.5); }

.queue-list { max-height: 50vh; }

.queue-item {
  display: flex;
  align-items: center;
  padding: 18rpx 12rpx;
  border-radius: 12rpx;
  gap: 16rpx;
}

.queue-item.active { background-color: rgba(251, 114, 153, 0.15); }
.queue-item.active .queue-name { color: #fb7299; }
.queue-item.active .queue-idx { color: #fb7299; }

.queue-idx {
  font-size: 24rpx;
  color: rgba(255,255,255,0.3);
  width: 40rpx;
  text-align: center;
}

.queue-info { flex: 1; overflow: hidden; }

.queue-name {
  font-size: 27rpx;
  color: #ffffff;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4rpx;
}

.queue-artist { font-size: 22rpx; color: rgba(255,255,255,0.4); }
</style>
