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
          :src="api.proxyImage(playerStore.currentTrack.cover)"
          mode="aspectFill"
        />
      </view>

      <view class="track-info">
        <text class="track-title">{{ playerStore.currentTrack.title }}</text>
        <text class="track-artist">{{ playerStore.currentTrack.artist }}</text>
      </view>

      <view class="action-row">
        <view class="action-btn" @tap="addToPlaylist">
          <SvgIcon name="heart" :size="52" color="rgba(255,255,255,0.7)" :clickable="true" />
          <text class="action-label">收藏</text>
        </view>
      </view>

      <view class="progress-section">
        <view class="progress-bar" @tap="onProgressTap">
          <view v-if="playerHoverPercent >= 0" class="player-time-tooltip" :style="{ left: playerHoverPercent + '%' }">
            <text class="player-tooltip-text">{{ playerHoverTimeText }}</text>
          </view>
          <view class="progress-bg" id="playerProgressBar">
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
          <SvgIcon :name="playerStore.playMode" :size="52" color="#ffffff" :clickable="true" />
        </view>
        <view class="control-btn" @tap="playerStore.playPrev()">
          <SvgIcon name="prev" :size="56" color="#ffffff" :clickable="true" />
        </view>
        <view class="play-pause-btn" @tap="playerStore.togglePlay()">
          <SvgIcon :name="playerStore.isPlaying ? 'pause' : 'play'" :size="60" color="#ffffff" />
        </view>
        <view class="control-btn" @tap="playerStore.playNext()">
          <SvgIcon name="next" :size="56" color="#ffffff" :clickable="true" />
        </view>
        <view class="control-btn" @tap="showQueue = true">
          <SvgIcon name="queue" :size="52" color="rgba(255,255,255,0.6)" :clickable="true" />
        </view>
      </view>

      <text class="mode-label">{{ playerStore.playModeLabel }}</text>
    </view>

    <view v-else class="empty">
      <text class="empty-icon">🎵</text>
      <text class="empty-text">暂无播放内容</text>
      <text class="empty-hint">去搜索BV号开始播放吧</text>
    </view>

    <QueuePanel :visible="showQueue" @close="showQueue = false" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { usePlayerStore } from '../../stores/player';
import { usePlaylistStore } from '../../stores/playlist';
import { api } from '../../utils/api';
import QueuePanel from '../../components/queue-panel/queue-panel.vue';
import SvgIcon from '../../components/icon/SvgIcon.vue';

const playerStore = usePlayerStore();
const playlistStore = usePlaylistStore();
const showQueue = ref(false);
const playerHoverPercent = ref(-1);

const playerHoverTimeText = computed(() => {
  if (playerHoverPercent.value < 0 || !playerStore.totalDuration) return '';
  const seconds = (playerHoverPercent.value / 100) * playerStore.totalDuration;
  return playerStore.formatTime(seconds);
});

function handlePlayerMouseMove(e: MouseEvent) {
  if (!playerStore.totalDuration) return;
  const el = document.getElementById('playerProgressBar');
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const pad = 10;
  if (e.clientY < rect.top - pad || e.clientY > rect.bottom + pad ||
      e.clientX < rect.left || e.clientX > rect.right) {
    playerHoverPercent.value = -1;
    return;
  }
  playerHoverPercent.value = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
}

onMounted(() => {
  document.addEventListener('mousemove', handlePlayerMouseMove);
});

onUnmounted(() => {
  document.removeEventListener('mousemove', handlePlayerMouseMove);
});

const progressPercent = computed(() => {
  if (!playerStore.totalDuration) return 0;
  return (playerStore.currentTime / playerStore.totalDuration) * 100;
});


function goBack() {
  uni.navigateBack();
}


async function addToPlaylist() {
  const track = playerStore.currentTrack;
  if (!track) return;

  await playlistStore.fetchPlaylists();

  if (playlistStore.playlists.length === 0) {
    uni.showModal({
      title: '暂无歌单',
      content: '是否创建一个新歌单？',
      success: (res) => {
        if (res.confirm) {
          uni.switchTab({ url: '/pages/playlists/playlists' });
        }
      },
    });
    return;
  }

  uni.showActionSheet({
    itemList: playlistStore.playlists.map((p) => p.name),
    success: (res) => {
      const pl = playlistStore.playlists[res.tapIndex];
      playlistStore.addTrack(pl.id, {
        bvid: track.bvid,
        cid: track.cid,
        title: track.title,
        artist: track.artist,
        cover: track.cover,
        duration: track.duration,
      });
    },
  });
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

.action-row {
  display: flex;
  justify-content: center;
  gap: 60rpx;
  margin-bottom: 36rpx;
  width: 100%;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  cursor: pointer;
}


.action-label {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.4);
}

.progress-section {
  width: 100%;
  margin-bottom: 40rpx;
}

.progress-bar {
  padding: 20rpx 0;
  cursor: pointer;
  position: relative;
}

.player-time-tooltip {
  position: absolute;
  top: -10rpx;
  transform: translateX(-50%);
  background-color: rgba(255, 255, 255, 0.85);
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  pointer-events: none;
  white-space: nowrap;
}

.player-tooltip-text {
  font-size: 22rpx;
  color: #1d1d1f;
}

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
  cursor: pointer;
}


.play-pause-btn {
  width: 120rpx;
  height: 120rpx;
  background: linear-gradient(135deg, #fb7299, #f04e7d);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.12s ease;
  box-shadow: 0 8rpx 30rpx rgba(251, 114, 153, 0.4);
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

</style>
