<template>
  <view class="page">
    <view v-if="loading" class="loading">
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else-if="videoInfo" class="detail">
      <image class="cover" :src="api.proxyImage(videoInfo.cover)" mode="aspectFill" />

      <view class="info">
        <text class="title">{{ videoInfo.title }}</text>
        <view class="meta">
          <image class="avatar" :src="api.proxyImage(videoInfo.owner.face)" />
          <text class="artist">{{ videoInfo.owner.name }}</text>
        </view>
        <text v-if="videoInfo.desc" class="desc">{{ videoInfo.desc }}</text>
      </view>

      <view class="section">
        <text class="section-title">
          {{ videoInfo.pages.length > 1 ? `选择分P (共${videoInfo.pages.length}P)` : '播放' }}
        </text>

        <view
          v-for="p in videoInfo.pages"
          :key="p.cid"
          class="track-item"
          @tap="playTrack(p)"
        >
          <view class="track-left">
            <text class="track-index">P{{ p.page }}</text>
            <view class="track-info">
              <text class="track-name">{{ p.part || videoInfo.title }}</text>
              <text class="track-duration">{{ formatDuration(p.duration) }}</text>
            </view>
          </view>
          <view class="track-right">
            <text class="track-add" @tap.stop="addToPlaylist(p)">+歌单</text>
          </view>
        </view>
      </view>
    </view>

    <MiniPlayer :no-tab-bar="true" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api, type VideoInfo } from '../../utils/api';
import { usePlayerStore } from '../../stores/player';
import { usePlaylistStore } from '../../stores/playlist';
import MiniPlayer from '../../components/mini-player/mini-player.vue';

const playerStore = usePlayerStore();
const playlistStore = usePlaylistStore();

const videoInfo = ref<VideoInfo | null>(null);
const loading = ref(true);
const bvid = ref('');

onMounted(() => {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  bvid.value = page.$page?.options?.bvid || page.options?.bvid || '';
  if (bvid.value) loadVideo();
});

async function loadVideo() {
  loading.value = true;
  try {
    videoInfo.value = await api.getVideoInfo(bvid.value);
  } catch (err: any) {
    uni.showToast({ title: err.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function playTrack(page: { cid: number; page: number; part: string; duration: number }) {
  if (!videoInfo.value) return;
  const track = {
    id: `${videoInfo.value.bvid}_${page.cid}`,
    bvid: videoInfo.value.bvid,
    cid: page.cid,
    title: videoInfo.value.pages.length > 1
      ? `${videoInfo.value.title} - P${page.page} ${page.part}`
      : videoInfo.value.title,
    artist: videoInfo.value.owner.name,
    cover: videoInfo.value.cover,
    duration: page.duration,
  };
  playerStore.addToQueue(track);
  playerStore.play(track);
  uni.navigateTo({ url: '/pages/player/player' });
}

async function addToPlaylist(page: { cid: number; page: number; part: string; duration: number }) {
  if (!videoInfo.value) return;
  await playlistStore.fetchPlaylists();

  if (playlistStore.playlists.length === 0) {
    uni.showModal({
      title: '暂无歌单',
      content: '是否创建一个新歌单？',
      success: (res) => {
        if (res.confirm) uni.navigateTo({ url: '/pages/playlists/playlists' });
      },
    });
    return;
  }

  uni.showActionSheet({
    itemList: playlistStore.playlists.map((p) => p.name),
    success: (res) => {
      const playlist = playlistStore.playlists[res.tapIndex];
      const v = videoInfo.value!;
      playlistStore.addTrack(playlist.id, {
        bvid: v.bvid,
        cid: page.cid,
        title: v.pages.length > 1 ? `${v.title} - P${page.page} ${page.part}` : v.title,
        artist: v.owner.name,
        cover: v.cover,
        duration: page.duration,
      });
    },
  });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #0d0d0d;
  padding-bottom: 140rpx;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 200rpx 0;
}

.loading-text { color: #999999; font-size: 28rpx; }

.cover {
  width: 100%;
  height: 420rpx;
}

.info {
  padding: 24rpx;
}

.title {
  font-size: 34rpx;
  font-weight: 600;
  color: #ffffff;
  display: block;
  margin-bottom: 16rpx;
  line-height: 1.4;
}

.meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
}

.artist {
  font-size: 26rpx;
  color: #999999;
}

.desc {
  font-size: 24rpx;
  color: #666666;
  display: block;
  line-height: 1.6;
}

.section {
  padding: 0 24rpx;
}

.section-title {
  font-size: 30rpx;
  color: #ffffff;
  font-weight: 500;
  display: block;
  margin-bottom: 20rpx;
}

.track-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22rpx 20rpx;
  background-color: #1a1a1a;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
}

.track-left {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 16rpx;
}

.track-index {
  font-size: 24rpx;
  color: #666666;
  min-width: 48rpx;
}

.track-info { flex: 1; }

.track-name {
  font-size: 28rpx;
  color: #ffffff;
  display: block;
  margin-bottom: 6rpx;
}

.track-duration {
  font-size: 22rpx;
  color: #666666;
}

.track-add {
  font-size: 26rpx;
  color: #fb7299;
  padding: 10rpx 20rpx;
}
</style>
