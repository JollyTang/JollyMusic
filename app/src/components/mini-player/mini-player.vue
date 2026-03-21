<template>
  <view v-if="playerStore.currentTrack" class="mini-player" :style="{ bottom: noTabBar ? '0px' : '50px' }">
    <view class="mini-layout">
      <!-- Left: cover + info + progress -->
      <view class="mini-left" @tap="goPlayer">
        <image class="mini-cover" :src="api.proxyImage(playerStore.currentTrack.cover)" mode="aspectFill" />
        <view class="mini-center">
          <view class="mini-info">
            <text class="mini-title">{{ playerStore.currentTrack.title }}</text>
            <text class="mini-artist">{{ playerStore.currentTrack.artist }}</text>
          </view>
          <view class="mini-time-row">
            <text class="mini-time">{{ playerStore.formatTime(playerStore.currentTime) }}</text>
            <view class="mini-progress-wrap">
              <view v-if="hoverPercent >= 0" class="time-tooltip" :style="{ left: hoverPercent + '%' }">
                <text class="time-tooltip-text">{{ hoverTimeText }}</text>
              </view>
              <view
                class="mini-progress-bg"
                id="miniProgressBar"
                @touchstart="onTouchStart"
                @touchmove.stop.prevent="onTouchMove"
                @touchend="onTouchEnd"
                @tap.stop="onProgressTap"
              >
                <view class="mini-progress-fill" :style="{ width: progressPercent + '%' }" />
                <view class="mini-progress-dot" :class="{ active: dragging || hoverPercent >= 0 }" :style="{ left: progressPercent + '%' }" />
              </view>
            </view>
            <text class="mini-time">{{ playerStore.formatTime(playerStore.totalDuration) }}</text>
          </view>
        </view>
      </view>

      <!-- Right: controls -->
      <view class="mini-controls">
        <view class="ctrl-btn" @tap.stop="playerStore.playPrev()">
          <SvgIcon name="prev" :size="48" color="#3c3c43" :clickable="true" />
        </view>
        <view class="ctrl-btn play-btn" @tap.stop="playerStore.togglePlay()">
          <SvgIcon :name="playerStore.isPlaying ? 'pause' : 'play'" :size="48" color="#ffffff" />
        </view>
        <view class="ctrl-btn" @tap.stop="playerStore.playNext()">
          <SvgIcon name="next" :size="48" color="#3c3c43" :clickable="true" />
        </view>
        <view class="ctrl-btn" @tap.stop="playerStore.togglePlayMode()">
          <SvgIcon :name="playerStore.playMode" :size="44" color="#3c3c43" :clickable="true" />
        </view>
        <view class="ctrl-btn" @tap.stop="addToPlaylist">
          <SvgIcon name="heart" :size="44" color="#fb7299" :clickable="true" />
        </view>
        <view class="ctrl-btn" @tap.stop="openBilibili">
          <SvgIcon name="bilibili" :size="44" color="#00a1d6" :clickable="true" />
        </view>
        <view class="ctrl-btn" @tap.stop="showQueue = true">
          <SvgIcon name="queue" :size="44" color="#3c3c43" :clickable="true" />
        </view>
      </view>
    </view>

    <QueuePanel :visible="showQueue" @close="showQueue = false" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { usePlayerStore } from '../../stores/player';
import { usePlaylistStore } from '../../stores/playlist';
import { api } from '../../utils/api';
import QueuePanel from '../queue-panel/queue-panel.vue';
import SvgIcon from '../icon/SvgIcon.vue';

const props = defineProps<{ noTabBar?: boolean }>();

const playerStore = usePlayerStore();
const playlistStore = usePlaylistStore();
const dragging = ref(false);
const showQueue = ref(false);
const hoverPercent = ref(-1);

const progressPercent = computed(() => {
  if (!playerStore.totalDuration) return 0;
  return (playerStore.currentTime / playerStore.totalDuration) * 100;
});

const hoverTimeText = computed(() => {
  if (hoverPercent.value < 0 || !playerStore.totalDuration) return '';
  const seconds = (hoverPercent.value / 100) * playerStore.totalDuration;
  return playerStore.formatTime(seconds);
});


function goPlayer() {
  uni.navigateTo({ url: '/pages/player/player' });
}

function openBilibili() {
  const track = playerStore.currentTrack;
  if (!track) return;
  const url = `https://www.bilibili.com/video/${track.bvid}`;
  // #ifdef H5
  window.open(url, '_blank');
  // #endif
  // #ifndef H5
  uni.setClipboardData({
    data: url,
    success: () => uni.showToast({ title: '链接已复制', icon: 'success' }),
  });
  // #endif
}

function getPercentFromEvent(e: any): number | null {
  const clientX = e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX ?? e.clientX;
  if (clientX == null || !playerStore.totalDuration) return null;
  const el = document.getElementById('miniProgressBar');
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
}

function onTouchStart() { dragging.value = true; }
function onTouchMove(e: any) {
  const p = getPercentFromEvent(e);
  if (p != null) playerStore.seekTo(p * playerStore.totalDuration);
}
function onTouchEnd(e: any) {
  const p = getPercentFromEvent(e);
  if (p != null) playerStore.seekTo(p * playerStore.totalDuration);
  dragging.value = false;
}
function onProgressTap(e: any) {
  const p = getPercentFromEvent(e);
  if (p != null) playerStore.seekTo(p * playerStore.totalDuration);
}

function handleMouseMove(e: MouseEvent) {
  if (!playerStore.totalDuration) return;
  const el = document.getElementById('miniProgressBar');
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const pad = 6;
  if (e.clientY < rect.top - pad || e.clientY > rect.bottom + pad ||
      e.clientX < rect.left || e.clientX > rect.right) {
    hoverPercent.value = -1;
    return;
  }
  hoverPercent.value = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
}

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove);
});

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove);
});

async function addToPlaylist() {
  const track = playerStore.currentTrack;
  if (!track) return;
  await playlistStore.fetchPlaylists();
  if (playlistStore.playlists.length === 0) {
    uni.showModal({
      title: '暂无歌单',
      content: '是否创建一个新歌单？',
      success: (res) => {
        if (res.confirm) uni.switchTab({ url: '/pages/playlists/playlists' });
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
</script>

<style scoped>
.mini-player {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 99;
  background-color: #ffffff;
  box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.08);
  border-top: 1rpx solid #f0f0f0;
}

.mini-layout {
  display: flex;
  align-items: center;
  padding: 12rpx 16rpx;
  gap: 16rpx;
}

/* Left section: cover + song info + progress */
.mini-left {
  display: flex;
  align-items: center;
  flex: 7;
  min-width: 0;
  overflow: hidden;
  gap: 14rpx;
  cursor: pointer;
}

.mini-cover {
  width: 72rpx;
  height: 72rpx;
  border-radius: 10rpx;
  flex-shrink: 0;
}

.mini-center {
  flex: 1;
  overflow: hidden;
}

.mini-info {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.mini-title {
  font-size: 26rpx;
  color: #1d1d1f;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1;
}

.mini-artist {
  font-size: 22rpx;
  color: #8e8e93;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Time + progress inline */
.mini-time-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.mini-time {
  font-size: 20rpx;
  color: #8e8e93;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.mini-progress-wrap {
  position: relative;
  flex: 1;
  padding: 8rpx 0;
  cursor: pointer;
}

.mini-progress-bg {
  position: relative;
  width: 100%;
  height: 6rpx;
  background-color: #e5e5ea;
  border-radius: 3rpx;
  transition: height 0.15s;
}

.mini-progress-wrap:hover .mini-progress-bg {
  height: 10rpx;
}

.mini-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #fb7299, #f04e7d);
  border-radius: 3rpx;
  transition: width 0.3s linear;
}

.mini-progress-dot {
  position: absolute;
  top: 50%;
  width: 0;
  height: 0;
  background-color: #fb7299;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.15s, height 0.15s, left 0.3s linear;
}

.mini-progress-dot.active {
  width: 18rpx;
  height: 18rpx;
  box-shadow: 0 2rpx 6rpx rgba(251, 114, 153, 0.4);
}

.time-tooltip {
  position: absolute;
  top: -44rpx;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.75);
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  pointer-events: none;
  white-space: nowrap;
}

.time-tooltip-text {
  font-size: 20rpx;
  color: #ffffff;
}

/* Right section: controls */
.mini-controls {
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  flex: 3;
}

.ctrl-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease;
}

.ctrl-btn:active {
  transform: scale(0.85);
}

.play-btn {
  background: linear-gradient(135deg, #fb7299, #f04e7d);
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  flex: none;
  box-shadow: 0 4rpx 12rpx rgba(251, 114, 153, 0.35);
  cursor: pointer;
}

.play-btn:active {
  transform: scale(0.9);
  box-shadow: 0 2rpx 8rpx rgba(251, 114, 153, 0.5);
}
</style>
