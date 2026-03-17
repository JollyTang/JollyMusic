<template>
  <view class="page">
    <view class="header">
      <text class="page-title">我的歌单</text>
      <view class="create-btn" @tap="showCreate">
        <text class="create-text">+ 新建</text>
      </view>
    </view>

    <view v-if="playlistStore.loading" class="loading">
      <view class="loading-spinner" />
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else-if="playlistStore.playlists.length === 0" class="empty">
      <text class="empty-icon">♫</text>
      <text class="empty-text">还没有歌单</text>
      <text class="empty-hint">点击右上角「+ 新建」创建一个吧</text>
    </view>

    <view v-else class="list">
      <PlaylistCard
        v-for="pl in playlistStore.playlists"
        :key="pl.id"
        :playlist="pl"
        @tap="goDetail(pl.id)"
        @delete="confirmDelete(pl)"
      />
    </view>

    <MiniPlayer />
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { usePlaylistStore } from '../../stores/playlist';
import PlaylistCard from '../../components/playlist-card/playlist-card.vue';
import MiniPlayer from '../../components/mini-player/mini-player.vue';
import type { Playlist } from '../../utils/api';

const playlistStore = usePlaylistStore();

onShow(() => {
  playlistStore.fetchPlaylists();
});

function showCreate() {
  uni.showModal({
    title: '新建歌单',
    editable: true,
    placeholderText: '请输入歌单名称',
    success: (res) => {
      if (res.confirm && res.content?.trim()) {
        playlistStore.createPlaylist(res.content.trim());
      }
    },
  });
}

function confirmDelete(pl: Playlist) {
  uni.showModal({
    title: '删除歌单',
    content: `确定要删除「${pl.name}」吗？`,
    success: (res) => {
      if (res.confirm) {
        playlistStore.deletePlaylist(pl.id);
      }
    },
  });
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/playlist-detail/playlist-detail?id=${id}` });
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  padding-bottom: 200rpx;
  background-color: #f5f5f7;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0 28rpx;
}

.page-title {
  font-size: 38rpx;
  font-weight: 700;
  color: #1d1d1f;
}

.create-btn {
  padding: 14rpx 32rpx;
  background: linear-gradient(135deg, #fb7299, #f04e7d);
  border-radius: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(251, 114, 153, 0.3);
}

.create-text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 500;
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
  font-size: 100rpx;
  margin-bottom: 24rpx;
  opacity: 0.2;
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
</style>
