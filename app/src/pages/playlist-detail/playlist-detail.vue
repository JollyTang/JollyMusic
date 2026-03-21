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
        <view class="detail-header">
          <text class="detail-title" @tap="renamePlaylist">{{ currentPlaylist?.name || '歌单' }}</text>
          <text class="rename-hint" @tap="renamePlaylist">✎</text>
        </view>

        <view class="list-header">
          <view class="play-all" @tap="playAll">
            <view class="play-all-btn">
              <text class="play-all-icon">▶</text>
            </view>
            <text class="play-all-text">播放全部 ({{ playlistStore.currentTracks.length }})</text>
          </view>
          <view class="action-btn-sm" @tap="sharePlaylist">
            <text class="action-btn-text share-color">分享</text>
          </view>
        </view>

        <view
          v-for="(track, idx) in playlistStore.currentTracks"
          :key="track.id"
          class="drag-track-item"
          :class="{ dragging: dragIndex === idx, 'drag-over': dragOverIndex === idx && dragIndex !== idx }"
          :draggable="true"
          @dragstart="onDragStart(idx, $event)"
          @dragover.prevent="onDragOver(idx)"
          @dragend="onDragEnd"
          @drop.prevent="onDrop(idx)"
        >
          <TrackItem
            :track="track"
            :is-active="isTrackPlaying(track)"
            :show-delete="true"
            @play="playTrack(track)"
            @delete="confirmRemove(track)"
          />
        </view>
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

    <MiniPlayer :no-tab-bar="true" />
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
const currentPlaylist = ref<any>(null);
const dragIndex = ref(-1);
const dragOverIndex = ref(-1);

onMounted(() => {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  playlistId.value = page.$page?.options?.id || page.options?.id || '';
  if (playlistId.value) {
    playlistStore.fetchTracks(playlistId.value);
    currentPlaylist.value = playlistStore.getPlaylistById(playlistId.value);
  }
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
    playlistStore.reorderTrack(playlistId.value, dragIndex.value, toIdx);
  }
  dragIndex.value = -1;
  dragOverIndex.value = -1;
}

function onDragEnd() {
  dragIndex.value = -1;
  dragOverIndex.value = -1;
}

function renamePlaylist() {
  const pl = playlistStore.getPlaylistById(playlistId.value);
  if (!pl) return;
  uni.showModal({
    title: '重命名歌单',
    content: pl.name,
    editable: true,
    placeholderText: '输入新名称',
    success: (res) => {
      if (res.confirm && res.content?.trim()) {
        playlistStore.renamePlaylist(playlistId.value, res.content.trim());
        currentPlaylist.value = playlistStore.getPlaylistById(playlistId.value);
        uni.showToast({ title: '已重命名', icon: 'success' });
      }
    },
  });
}


function playTrack(track: Track) {
  const idx = playlistStore.currentTracks.findIndex(
    (t) => t.bvid === track.bvid && t.cid === track.cid
  );
  playerStore.setQueue(playlistStore.currentTracks, idx >= 0 ? idx : 0);
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

.play-all {
  cursor: pointer;
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

.detail-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.detail-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1d1d1f;
  cursor: pointer;
}

.rename-hint {
  font-size: 28rpx;
  color: #c7c7cc;
  cursor: pointer;
}

.action-btn-sm {
  padding: 10rpx 24rpx;
  background-color: #ffffff;
  border-radius: 30rpx;
  cursor: pointer;
  border: 2rpx solid #e5e5ea;
}

.action-btn-text {
  font-size: 26rpx;
  color: #1d1d1f;
  font-weight: 500;
}

.share-color {
  color: #fb7299;
}

.drag-track-item {
  cursor: grab;
  transition: opacity 0.15s, box-shadow 0.15s;
}

.drag-track-item.dragging {
  opacity: 0.35;
}

.drag-track-item.drag-over {
  box-shadow: 0 -4rpx 0 0 #fb7299;
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
