<template>
  <view class="page">
    <view class="search-section">
      <view class="search-bar">
        <text class="search-icon">🔍</text>
        <input
          class="search-input"
          v-model="bvInput"
          placeholder="输入B站BV号或视频链接"
          confirm-type="search"
          @confirm="handleSearch"
        />
        <view v-if="bvInput" class="clear-btn" @tap="bvInput = ''; videoInfo = null">
          <text class="clear-icon">✕</text>
        </view>
      </view>
      <view class="search-btn" @tap="handleSearch">搜索</view>
    </view>

    <view v-if="loading" class="loading-wrap">
      <view class="loading-spinner" />
      <text class="loading-text">正在获取视频信息...</text>
    </view>

    <view v-else-if="videoInfo" class="result-card">
      <view class="card-cover-wrap">
        <image class="card-cover" :src="videoInfo.cover" mode="aspectFill" />
        <view class="card-duration-badge">
          <text class="badge-text">{{ formatDuration(videoInfo.duration) }}</text>
        </view>
      </view>

      <view class="card-body">
        <text class="card-title">{{ videoInfo.title }}</text>
        <view class="card-meta">
          <image class="card-avatar" :src="videoInfo.owner.face" mode="aspectFill" />
          <text class="card-artist">{{ videoInfo.owner.name }}</text>
        </view>

        <view v-if="videoInfo.pages.length === 1" class="card-actions">
          <view class="btn-play" @tap="playTrack(videoInfo.pages[0])">
            <text class="btn-play-icon">▶</text>
            <text class="btn-play-text">播放音频</text>
          </view>
          <view class="btn-add" @tap="showAddToPlaylist(videoInfo.pages[0])">
            <text class="btn-add-text">+ 歌单</text>
          </view>
        </view>

        <view v-else class="parts-section">
          <text class="parts-label">共 {{ videoInfo.pages.length }} 个分P，选择要播放的：</text>
          <scroll-view scroll-y class="parts-list">
            <view
              v-for="p in videoInfo.pages"
              :key="p.cid"
              class="part-row"
            >
              <view class="part-left" @tap="playTrack(p)">
                <view class="part-index">
                  <text class="part-index-text">{{ p.page }}</text>
                </view>
                <view class="part-text">
                  <text class="part-name">{{ p.part || videoInfo.title }}</text>
                  <text class="part-dur">{{ formatDuration(p.duration) }}</text>
                </view>
              </view>
              <view class="part-right">
                <view class="part-play-btn" @tap="playTrack(p)">
                  <text class="part-play-icon">▶</text>
                </view>
                <view class="part-add-btn" @tap="showAddToPlaylist(p)">
                  <text class="part-add-icon">+</text>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>

    <view v-if="!loading && !videoInfo" class="welcome">
      <view v-if="searchStore.history.length > 0" class="history-section">
        <view class="section-header">
          <text class="section-title">最近搜索</text>
          <text class="section-action" @tap="searchStore.clearHistory()">清空</text>
        </view>
        <view class="history-tags">
          <view
            v-for="h in searchStore.history"
            :key="h"
            class="history-tag"
            @tap="bvInput = h; handleSearch()"
          >
            <text class="tag-text">{{ h }}</text>
            <text class="tag-remove" @tap.stop="searchStore.removeHistory(h)">✕</text>
          </view>
        </view>
      </view>

      <view class="tip-card">
        <text class="tip-title">如何使用</text>
        <view class="tip-steps">
          <view class="tip-step">
            <text class="step-num">1</text>
            <text class="step-text">在B站找到想听的视频</text>
          </view>
          <view class="tip-step">
            <text class="step-num">2</text>
            <text class="step-text">复制BV号（如 BV1xx411c7mD）</text>
          </view>
          <view class="tip-step">
            <text class="step-num">3</text>
            <text class="step-text">粘贴到上方搜索框，点击搜索</text>
          </view>
        </view>
      </view>
    </view>

    <MiniPlayer />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { api, type VideoInfo } from '../../utils/api';
import { usePlayerStore } from '../../stores/player';
import { useSearchStore } from '../../stores/search';
import { usePlaylistStore } from '../../stores/playlist';
import MiniPlayer from '../../components/mini-player/mini-player.vue';

const playerStore = usePlayerStore();
const searchStore = useSearchStore();
const playlistStore = usePlaylistStore();

const bvInput = ref('');
const videoInfo = ref<VideoInfo | null>(null);
const loading = ref(false);

function normalizeBvid(input: string): string {
  let bv = input.trim();
  const match = bv.match(/BV[a-zA-Z0-9]+/i);
  if (match) bv = match[0];
  if (!bv.startsWith('BV') && !bv.startsWith('bv')) {
    bv = 'BV' + bv;
  }
  return bv;
}

async function handleSearch() {
  const raw = bvInput.value.trim();
  if (!raw) {
    uni.showToast({ title: '请输入BV号', icon: 'none' });
    return;
  }
  const bvid = normalizeBvid(raw);
  loading.value = true;
  videoInfo.value = null;
  try {
    videoInfo.value = await api.getVideoInfo(bvid);
    searchStore.addHistory(bvid);
  } catch (err: any) {
    uni.showToast({ title: err.message || '获取视频信息失败', icon: 'none' });
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
}

async function showAddToPlaylist(page: { cid: number; page: number; part: string; duration: number }) {
  if (!videoInfo.value) return;
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
  background-color: #f5f5f7;
  padding-bottom: 200rpx;
}

/* Search */
.search-section {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  gap: 16rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #e5e5ea;
}

.search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  background-color: #f2f2f7;
  border-radius: 20rpx;
  padding: 0 20rpx;
  height: 72rpx;
}

.search-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
  opacity: 0.5;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #1d1d1f;
  height: 72rpx;
}

.clear-btn {
  padding: 8rpx;
}

.clear-icon {
  font-size: 24rpx;
  color: #8e8e93;
}

.search-btn {
  background: linear-gradient(135deg, #fb7299, #f04e7d);
  color: #ffffff;
  font-size: 28rpx;
  padding: 16rpx 32rpx;
  border-radius: 20rpx;
  font-weight: 500;
}

/* Loading */
.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
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
  font-size: 26rpx;
  color: #8e8e93;
}

/* Result Card */
.result-card {
  margin: 24rpx;
  background-color: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 20rpx rgba(0, 0, 0, 0.06);
}

.card-cover-wrap {
  position: relative;
}

.card-cover {
  width: 100%;
  height: 380rpx;
}

.card-duration-badge {
  position: absolute;
  right: 16rpx;
  bottom: 16rpx;
  background-color: rgba(0, 0, 0, 0.65);
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}

.badge-text {
  font-size: 22rpx;
  color: #ffffff;
}

.card-body {
  padding: 24rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1d1d1f;
  display: block;
  margin-bottom: 16rpx;
  line-height: 1.4;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.card-avatar {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
}

.card-artist {
  font-size: 26rpx;
  color: #8e8e93;
}

.card-actions {
  display: flex;
  gap: 16rpx;
}

.btn-play {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  background: linear-gradient(135deg, #fb7299, #f04e7d);
  color: #ffffff;
  padding: 22rpx 0;
  border-radius: 16rpx;
}

.btn-play-icon {
  font-size: 24rpx;
}

.btn-play-text {
  font-size: 28rpx;
  font-weight: 500;
}

.btn-add {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f2f2f7;
  padding: 22rpx 32rpx;
  border-radius: 16rpx;
}

.btn-add-text {
  font-size: 28rpx;
  color: #8e8e93;
  font-weight: 500;
}

/* Parts */
.parts-section {
  margin-top: 8rpx;
}

.parts-label {
  font-size: 26rpx;
  color: #8e8e93;
  display: block;
  margin-bottom: 16rpx;
}

.parts-list {
  max-height: 500rpx;
}

.part-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 16rpx;
  background-color: #f9f9fb;
  border-radius: 14rpx;
  margin-bottom: 10rpx;
}

.part-left {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 16rpx;
  overflow: hidden;
}

.part-index {
  width: 48rpx;
  height: 48rpx;
  background-color: #e5e5ea;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.part-index-text {
  font-size: 22rpx;
  color: #8e8e93;
  font-weight: 600;
}

.part-text {
  flex: 1;
  overflow: hidden;
}

.part-name {
  font-size: 27rpx;
  color: #1d1d1f;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4rpx;
}

.part-dur {
  font-size: 22rpx;
  color: #8e8e93;
}

.part-right {
  display: flex;
  gap: 12rpx;
}

.part-play-btn, .part-add-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.part-play-btn {
  background: linear-gradient(135deg, #fb7299, #f04e7d);
}

.part-play-icon {
  font-size: 20rpx;
  color: #ffffff;
}

.part-add-btn {
  background-color: #e5e5ea;
}

.part-add-icon {
  font-size: 28rpx;
  color: #8e8e93;
  font-weight: 600;
}

/* Welcome / History */
.welcome {
  padding: 24rpx;
}

.history-section {
  margin-bottom: 32rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1d1d1f;
}

.section-action {
  font-size: 26rpx;
  color: #fb7299;
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.history-tag {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  padding: 14rpx 24rpx;
  border-radius: 30rpx;
  gap: 12rpx;
  box-shadow: 0 1rpx 6rpx rgba(0, 0, 0, 0.04);
}

.tag-text {
  font-size: 26rpx;
  color: #1d1d1f;
}

.tag-remove {
  font-size: 22rpx;
  color: #c7c7cc;
}

/* Tip Card */
.tip-card {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
}

.tip-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1d1d1f;
  display: block;
  margin-bottom: 24rpx;
}

.tip-steps {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.tip-step {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.step-num {
  width: 48rpx;
  height: 48rpx;
  background: linear-gradient(135deg, #fb7299, #f04e7d);
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 600;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-text {
  font-size: 27rpx;
  color: #3c3c43;
  line-height: 1.5;
}
</style>
