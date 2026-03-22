<template>
  <view class="page">
    <!-- Platform Tabs -->
    <view class="platform-tabs">
      <view
        class="tab-item"
        :class="{ active: currentPlatform === 'netease' }"
        @tap="switchPlatform('netease')"
      >
        <text class="tab-text">网易云</text>
      </view>
      <view
        class="tab-item"
        :class="{ active: currentPlatform === 'bilibili' }"
        @tap="switchPlatform('bilibili')"
      >
        <text class="tab-text">B站</text>
      </view>
    </view>

    <!-- Search Bar -->
    <view class="search-section">
      <view class="search-bar">
        <text class="search-icon">🔍</text>
        <input
          class="search-input"
          v-model="searchInput"
          :placeholder="searchPlaceholder"
          confirm-type="search"
          @confirm="handleSearch"
        />
        <view v-if="searchInput" class="clear-btn" @tap="clearSearch">
          <text class="clear-icon">✕</text>
        </view>
      </view>
      <view class="search-btn" @tap="handleSearch">搜索</view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="loading-wrap">
      <view class="loading-spinner" />
      <text class="loading-text">{{ currentPlatform === 'netease' ? '搜索中...' : '正在获取视频信息...' }}</text>
    </view>

    <!-- NetEase Results -->
    <view v-else-if="currentPlatform === 'netease' && neteaseResults.length > 0" class="netease-results">
      <view class="result-header">
        <text class="result-count">找到 {{ neteaseResults.length }} 首歌曲</text>
      </view>
      <view
        v-for="song in neteaseResults"
        :key="song.id"
        class="song-item"
        :class="{ 'song-vip': song.isVip, 'song-playing': isNeteasePlaying(song) }"
        @tap="!song.isVip && playNetease(song)"
      >
        <view class="song-cover-wrap">
          <image v-if="song.cover" class="song-cover" :src="song.cover" mode="aspectFill" />
          <view v-else class="song-cover-placeholder">
            <text class="song-cover-icon">♫</text>
          </view>
        </view>
        <view class="song-info">
          <view class="song-title-row">
            <text class="song-name" :class="{ 'name-active': isNeteasePlaying(song) }">{{ song.name }}</text>
            <text v-if="song.isVip" class="vip-badge">VIP</text>
          </view>
          <text class="song-artist">{{ song.artists }}</text>
          <text class="song-album">{{ song.album }} · {{ formatDuration(song.duration) }}</text>
        </view>
        <view class="song-actions" @tap.stop>
          <view v-if="!song.isVip" class="song-action-btn" @tap="addNeteaseToPlaylist(song)">
            <text class="song-action-text">+</text>
          </view>
          <view v-else class="song-action-btn disabled">
            <text class="song-action-text vip-text">🔒</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Bilibili Result -->
    <view v-else-if="currentPlatform === 'bilibili' && videoInfo" class="result-card">
      <view class="card-horizontal">
        <view class="card-cover-wrap">
          <image class="card-cover" :src="api.proxyImage(videoInfo.cover)" mode="aspectFit" />
          <view class="card-duration-badge">
            <text class="badge-text">{{ formatDuration(videoInfo.duration) }}</text>
          </view>
        </view>
        <view class="card-info">
          <text class="card-title">{{ videoInfo.title }}</text>
          <view class="card-meta">
            <image class="card-avatar" :src="api.proxyImage(videoInfo.owner.face)" mode="aspectFill" />
            <text class="card-artist">{{ videoInfo.owner.name }}</text>
          </view>
          <view v-if="videoInfo.pages.length === 1" class="card-actions">
            <view class="btn-play" @tap="playTrack(videoInfo.pages[0])">
              <text class="btn-play-icon">▶</text>
              <text class="btn-play-text">播放</text>
            </view>
            <view class="btn-add" @tap="showAddToPlaylist(videoInfo.pages[0])">
              <text class="btn-add-text">+ 歌单</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="videoInfo.pages.length > 1" class="parts-section">
        <text class="parts-label">共 {{ videoInfo.pages.length }} 个分P，选择要播放的：</text>
        <scroll-view scroll-y class="parts-list">
          <view v-for="p in videoInfo.pages" :key="p.cid" class="part-row">
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

    <!-- Welcome / History -->
    <view v-if="!loading && !videoInfo && neteaseResults.length === 0" class="welcome">
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
            @tap="searchInput = h; handleSearch()"
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
            <text class="step-text">切换到「网易云」直接搜歌名</text>
          </view>
          <view class="tip-step">
            <text class="step-num">2</text>
            <text class="step-text">或切到「B站」输入BV号搜视频音频</text>
          </view>
          <view class="tip-step">
            <text class="step-num">3</text>
            <text class="step-text">点击歌曲即可播放，点 + 添加到歌单</text>
          </view>
        </view>
      </view>
    </view>

    <MiniPlayer />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { api, type VideoInfo, type NeteaseSearchTrack } from '../../utils/api';
import { usePlayerStore } from '../../stores/player';
import { useSearchStore } from '../../stores/search';
import { usePlaylistStore } from '../../stores/playlist';
import MiniPlayer from '../../components/mini-player/mini-player.vue';

const playerStore = usePlayerStore();
const searchStore = useSearchStore();
const playlistStore = usePlaylistStore();

const searchInput = ref('');
const currentPlatform = ref<'netease' | 'bilibili'>('netease');
const videoInfo = ref<VideoInfo | null>(null);
const neteaseResults = ref<NeteaseSearchTrack[]>([]);
const loading = ref(false);

const searchPlaceholder = computed(() =>
  currentPlatform.value === 'netease' ? '搜索歌名、歌手' : '输入B站BV号或视频链接'
);

function switchPlatform(platform: 'netease' | 'bilibili') {
  currentPlatform.value = platform;
  videoInfo.value = null;
  neteaseResults.value = [];
}

function clearSearch() {
  searchInput.value = '';
  videoInfo.value = null;
  neteaseResults.value = [];
}

function isBvInput(input: string): boolean {
  return /^bv/i.test(input.trim()) || input.includes('bilibili.com');
}

async function handleSearch() {
  const raw = searchInput.value.trim();
  if (!raw) {
    uni.showToast({ title: '请输入搜索内容', icon: 'none' });
    return;
  }

  if (isBvInput(raw)) {
    currentPlatform.value = 'bilibili';
    await searchBilibili(raw);
  } else if (currentPlatform.value === 'bilibili') {
    uni.showToast({ title: '请输入BV号，或切换到「网易云」搜歌名', icon: 'none', duration: 2500 });
  } else {
    await searchNetease(raw);
  }
}

function normalizeBvid(input: string): string {
  let bv = input.trim();
  const match = bv.match(/BV[a-zA-Z0-9]+/i);
  if (match) bv = match[0];
  if (!bv.startsWith('BV') && !bv.startsWith('bv')) {
    bv = 'BV' + bv;
  }
  return bv;
}

async function searchBilibili(raw: string) {
  const bvid = normalizeBvid(raw);
  loading.value = true;
  videoInfo.value = null;
  neteaseResults.value = [];
  try {
    videoInfo.value = await api.getVideoInfo(bvid);
    searchStore.addHistory(bvid);
  } catch (err: any) {
    uni.showToast({ title: err.message || '获取视频信息失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function searchNetease(keyword: string) {
  loading.value = true;
  videoInfo.value = null;
  neteaseResults.value = [];
  try {
    neteaseResults.value = await api.searchNetease(keyword);
    searchStore.addHistory(keyword);
    if (neteaseResults.value.length === 0) {
      uni.showToast({ title: '没有找到相关歌曲', icon: 'none' });
    }
  } catch (err: any) {
    uni.showToast({ title: err.message || '搜索失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function playNetease(song: NeteaseSearchTrack) {
  const track = {
    id: `netease_${song.id}`,
    source: 'netease' as const,
    sourceId: String(song.id),
    bvid: '',
    cid: 0,
    title: song.name,
    artist: song.artists,
    cover: song.cover,
    duration: song.duration,
    isVip: song.isVip,
  };
  playerStore.addToQueue(track);
  playerStore.play(track);
}

function isNeteasePlaying(song: NeteaseSearchTrack): boolean {
  const ct = playerStore.currentTrack;
  return !!ct && ct.source === 'netease' && ct.sourceId === String(song.id);
}

function addNeteaseToPlaylist(song: NeteaseSearchTrack) {
  playlistStore.fetchPlaylists();
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
      playlistStore.addTrack(playlist.id, {
        bvid: '',
        cid: 0,
        title: song.name,
        artist: song.artists,
        cover: song.cover,
        duration: song.duration,
        source: 'netease',
        sourceId: String(song.id),
      });
    },
  });
}

function playTrack(page: { cid: number; page: number; part: string; duration: number }) {
  if (!videoInfo.value) return;
  const track = {
    id: `${videoInfo.value.bvid}_${page.cid}`,
    source: 'bilibili' as const,
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
        source: 'bilibili',
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

/* Platform Tabs */
.platform-tabs {
  display: flex;
  background-color: #ffffff;
  padding: 16rpx 24rpx 0;
  gap: 32rpx;
}

.tab-item {
  padding: 12rpx 8rpx 16rpx;
  cursor: pointer;
  border-bottom: 4rpx solid transparent;
}

.tab-item.active {
  border-bottom-color: #fb7299;
}

.tab-text {
  font-size: 30rpx;
  color: #8e8e93;
  font-weight: 500;
}

.tab-item.active .tab-text {
  color: #1d1d1f;
  font-weight: 600;
}

/* Search */
.search-section {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx 20rpx;
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

.search-icon { font-size: 28rpx; margin-right: 12rpx; opacity: 0.5; }

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #1d1d1f;
  height: 72rpx;
}

.clear-btn { padding: 8rpx; cursor: pointer; }
.clear-icon { font-size: 24rpx; color: #8e8e93; }

.search-btn {
  background: linear-gradient(135deg, #fb7299, #f04e7d);
  color: #ffffff;
  font-size: 28rpx;
  padding: 16rpx 32rpx;
  border-radius: 20rpx;
  font-weight: 500;
  cursor: pointer;
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

@keyframes spin { to { transform: rotate(360deg); } }

.loading-text { font-size: 26rpx; color: #8e8e93; }

/* NetEase Results */
.netease-results { padding: 20rpx 24rpx; }

.result-header { margin-bottom: 16rpx; }

.result-count { font-size: 26rpx; color: #8e8e93; }

.song-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  margin-bottom: 12rpx;
  cursor: pointer;
  transition: opacity 0.15s;
}

.song-item:active { opacity: 0.7; }

.song-vip { opacity: 0.55; }

.song-playing { background: linear-gradient(90deg, #fff5f7, #ffffff); }

.song-cover-wrap {
  width: 96rpx;
  height: 96rpx;
  border-radius: 12rpx;
  overflow: hidden;
  flex-shrink: 0;
  margin-right: 20rpx;
}

.song-cover { width: 100%; height: 100%; }

.song-cover-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #e8e8ed, #d1d1d6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.song-cover-icon { font-size: 40rpx; color: #ffffff; }

.song-info { flex: 1; overflow: hidden; }

.song-title-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 6rpx;
}

.song-name {
  font-size: 28rpx;
  color: #1d1d1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.name-active { color: #fb7299; }

.vip-badge {
  font-size: 18rpx;
  color: #ffffff;
  background-color: #ff9500;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
  font-weight: 600;
}

.song-artist {
  font-size: 24rpx;
  color: #8e8e93;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4rpx;
}

.song-album {
  font-size: 22rpx;
  color: #c7c7cc;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-actions { flex-shrink: 0; margin-left: 12rpx; }

.song-action-btn {
  width: 56rpx;
  height: 56rpx;
  background-color: #f2f2f7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.song-action-btn.disabled { cursor: not-allowed; }

.song-action-text { font-size: 32rpx; color: #8e8e93; font-weight: 600; }

.vip-text { font-size: 24rpx; }

/* Bilibili Result Card */
.result-card {
  margin: 24rpx;
  background-color: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 20rpx rgba(0, 0, 0, 0.06);
  padding: 24rpx;
}

.card-horizontal { display: flex; gap: 24rpx; }

.card-cover-wrap {
  position: relative;
  flex-shrink: 0;
  width: 260rpx;
  height: 180rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background-color: #f2f2f7;
}

.card-cover { width: 100%; height: 100%; }

.card-duration-badge {
  position: absolute;
  right: 8rpx;
  bottom: 8rpx;
  background-color: rgba(0, 0, 0, 0.65);
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.badge-text { font-size: 20rpx; color: #ffffff; }

.card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1d1d1f;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  margin-bottom: 12rpx;
}

.card-meta { display: flex; align-items: center; gap: 10rpx; margin-bottom: 16rpx; }
.card-avatar { width: 36rpx; height: 36rpx; border-radius: 50%; }
.card-artist { font-size: 24rpx; color: #8e8e93; }

.card-actions { display: flex; gap: 12rpx; }

.btn-play {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  background: linear-gradient(135deg, #fb7299, #f04e7d);
  color: #ffffff;
  padding: 14rpx 0;
  border-radius: 12rpx;
  cursor: pointer;
}

.btn-play-icon { font-size: 20rpx; }
.btn-play-text { font-size: 26rpx; font-weight: 500; }

.btn-add {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f2f2f7;
  padding: 14rpx 24rpx;
  border-radius: 12rpx;
  cursor: pointer;
}

.btn-add-text { font-size: 26rpx; color: #8e8e93; font-weight: 500; }

/* Parts */
.parts-section { margin-top: 24rpx; padding-top: 20rpx; border-top: 1rpx solid #f2f2f7; }
.parts-label { font-size: 26rpx; color: #8e8e93; display: block; margin-bottom: 16rpx; }
.parts-list { max-height: 500rpx; }

.part-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 16rpx;
  background-color: #f9f9fb;
  border-radius: 14rpx;
  margin-bottom: 10rpx;
  cursor: pointer;
}

.part-left { display: flex; align-items: center; flex: 1; gap: 16rpx; overflow: hidden; }

.part-index {
  width: 48rpx;
  height: 48rpx;
  background-color: #e5e5ea;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.part-index-text { font-size: 22rpx; color: #8e8e93; font-weight: 600; }

.part-text { flex: 1; overflow: hidden; }

.part-name {
  font-size: 27rpx;
  color: #1d1d1f;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4rpx;
}

.part-dur { font-size: 22rpx; color: #8e8e93; }
.part-right { display: flex; gap: 12rpx; }

.part-play-btn, .part-add-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
}

.part-play-btn { background: linear-gradient(135deg, #fb7299, #f04e7d); }
.part-play-icon { font-size: 20rpx; color: #ffffff; }
.part-add-btn { background-color: #e5e5ea; }
.part-add-icon { font-size: 28rpx; color: #8e8e93; font-weight: 600; }

/* Welcome / History */
.welcome { padding: 24rpx; }

.history-section { margin-bottom: 32rpx; }

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title { font-size: 32rpx; font-weight: 600; color: #1d1d1f; }
.section-action { font-size: 26rpx; color: #fb7299; cursor: pointer; }

.history-tags { display: flex; flex-wrap: wrap; gap: 14rpx; }

.history-tag {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  padding: 14rpx 24rpx;
  border-radius: 30rpx;
  gap: 12rpx;
  box-shadow: 0 1rpx 6rpx rgba(0, 0, 0, 0.04);
  cursor: pointer;
}

.tag-text { font-size: 26rpx; color: #1d1d1f; }
.tag-remove { font-size: 22rpx; color: #c7c7cc; }

/* Tip Card */
.tip-card {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
}

.tip-title { font-size: 30rpx; font-weight: 600; color: #1d1d1f; display: block; margin-bottom: 24rpx; }

.tip-steps { display: flex; flex-direction: column; gap: 20rpx; }

.tip-step { display: flex; align-items: center; gap: 20rpx; }

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

.step-text { font-size: 27rpx; color: #3c3c43; line-height: 1.5; }
</style>
