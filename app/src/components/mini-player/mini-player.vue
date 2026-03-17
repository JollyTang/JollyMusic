<template>
  <view v-if="playerStore.currentTrack" class="mini-player" @tap="goPlayer">
    <view class="mini-progress">
      <view class="mini-progress-fill" :style="{ width: progressPercent + '%' }" />
    </view>
    <view class="mini-content">
      <image class="mini-cover" :src="playerStore.currentTrack.cover" mode="aspectFill" />
      <view class="mini-info">
        <text class="mini-title">{{ playerStore.currentTrack.title }}</text>
        <text class="mini-artist">{{ playerStore.currentTrack.artist }}</text>
      </view>
      <view class="mini-controls">
        <view class="mini-btn" @tap.stop="addToPlaylist">
          <text class="mini-fav-icon">♡</text>
        </view>
        <view class="mini-btn" @tap.stop="playerStore.togglePlay()">
          <text class="mini-play-icon">{{ playerStore.isPlaying ? '⏸' : '▶' }}</text>
        </view>
        <view class="mini-btn" @tap.stop="playerStore.playNext()">
          <text class="mini-next-icon">⏭</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePlayerStore } from '../../stores/player';
import { usePlaylistStore } from '../../stores/playlist';

const playerStore = usePlayerStore();
const playlistStore = usePlaylistStore();

const progressPercent = computed(() => {
  if (!playerStore.totalDuration) return 0;
  return (playerStore.currentTime / playerStore.totalDuration) * 100;
});

function goPlayer() {
  uni.navigateTo({ url: '/pages/player/player' });
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
  bottom: 50px;
  left: 8rpx;
  right: 8rpx;
  z-index: 99;
  background-color: #ffffff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 30rpx rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.mini-progress {
  height: 4rpx;
  background-color: #e5e5ea;
}

.mini-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #fb7299, #f04e7d);
  transition: width 0.3s linear;
}

.mini-content {
  display: flex;
  align-items: center;
  padding: 14rpx 20rpx;
}

.mini-cover {
  width: 80rpx;
  height: 80rpx;
  border-radius: 12rpx;
  margin-right: 16rpx;
}

.mini-info {
  flex: 1;
  overflow: hidden;
}

.mini-title {
  font-size: 27rpx;
  color: #1d1d1f;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.mini-artist {
  font-size: 22rpx;
  color: #8e8e93;
  display: block;
  margin-top: 4rpx;
}

.mini-controls {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.mini-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.mini-fav-icon {
  font-size: 36rpx;
  color: #fb7299;
}

.mini-play-icon {
  font-size: 36rpx;
  color: #fb7299;
}

.mini-next-icon {
  font-size: 28rpx;
  color: #8e8e93;
}
</style>
