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
          <view class="share-btn" @tap="sharePlaylist">
            <text class="share-btn-text">分享</text>
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

    <!-- share code modal -->
    <view v-if="showShareModal" class="modal-overlay" @tap="showShareModal = false">
      <view class="modal-panel" @tap.stop>
        <text class="modal-title">分享歌单</text>
        <text class="modal-desc">复制以下分享码发给朋友，对方可一键导入</text>
        <view class="code-box">
          <text class="code-text" selectable>{{ shareCode }}</text>
        </view>
        <view class="modal-actions">
          <view class="modal-btn modal-btn-primary" @tap="copyShareCode">
            <text class="modal-btn-text">复制分享码</text>
          </view>
          <view class="modal-btn" @tap="showShareModal = false">
            <text class="modal-btn-text-secondary">关闭</text>
          </view>
        </view>
      </view>
    </view>

    <MiniPlayer />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { usePlaylistStore } from '../../stores/playlist';
import { usePlayerStore } from '../../stores/player';
import { generateShareCode } from '../../utils/share';
import TrackItem from '../../components/track-item/track-item.vue';
import MiniPlayer from '../../components/mini-player/mini-player.vue';
import type { Track } from '../../utils/api';

const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();
const playlistId = ref('');
const showShareModal = ref(false);
const shareCode = ref('');

onMounted(() => {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  playlistId.value = page.$page?.options?.id || page.options?.id || '';
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

function sharePlaylist() {
  const pl = playlistStore.getPlaylistById(playlistId.value);
  if (!pl || pl.tracks.length === 0) {
    uni.showToast({ title: '歌单为空，无法分享', icon: 'none' });
    return;
  }
  shareCode.value = generateShareCode(pl);
  showShareModal.value = true;
}

function copyShareCode() {
  uni.setClipboardData({
    data: shareCode.value,
    success: () => {
      uni.showToast({ title: '已复制到剪贴板', icon: 'success' });
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

.empty-icon { font-size: 80rpx; margin-bottom: 24rpx; }
.empty-text { font-size: 32rpx; color: #8e8e93; margin-bottom: 12rpx; }
.empty-hint { font-size: 26rpx; color: #c7c7cc; }

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.play-all-icon { font-size: 22rpx; color: #ffffff; margin-left: 4rpx; }
.play-all-text { font-size: 30rpx; color: #1d1d1f; font-weight: 500; }

.share-btn {
  padding: 12rpx 28rpx;
  background-color: #ffffff;
  border-radius: 30rpx;
  border: 2rpx solid #e5e5ea;
}

.share-btn-text {
  font-size: 26rpx;
  color: #fb7299;
  font-weight: 500;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.45);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-panel {
  width: 85%;
  max-width: 600rpx;
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
}

.modal-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1d1d1f;
  display: block;
  text-align: center;
  margin-bottom: 12rpx;
}

.modal-desc {
  font-size: 26rpx;
  color: #8e8e93;
  display: block;
  text-align: center;
  margin-bottom: 28rpx;
}

.code-box {
  background-color: #f2f2f7;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 28rpx;
  max-height: 300rpx;
  overflow-y: auto;
  word-break: break-all;
}

.code-text {
  font-size: 24rpx;
  color: #3c3c43;
  line-height: 1.6;
  font-family: monospace;
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.modal-btn {
  padding: 22rpx;
  border-radius: 16rpx;
  text-align: center;
}

.modal-btn-primary {
  background: linear-gradient(135deg, #fb7299, #f04e7d);
}

.modal-btn-text {
  font-size: 30rpx;
  color: #ffffff;
  font-weight: 500;
}

.modal-btn-text-secondary {
  font-size: 28rpx;
  color: #8e8e93;
}
</style>
