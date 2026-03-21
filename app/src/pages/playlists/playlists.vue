<template>
  <view class="page">
    <view class="header">
      <text class="page-title">我的歌单</text>
      <view class="header-actions">
        <view class="import-btn" @tap="showImportModal = true">
          <text class="import-text">导入</text>
        </view>
        <view class="create-btn" @tap="showCreate">
          <text class="create-text">+ 新建</text>
        </view>
      </view>
    </view>

    <view v-if="playlistStore.playlists.length === 0" class="empty">
      <text class="empty-icon">♫</text>
      <text class="empty-text">还没有歌单</text>
      <text class="empty-hint">点击「+ 新建」创建，或「导入」朋友分享的歌单</text>
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

    <!-- import modal -->
    <view v-if="showImportModal" class="modal-overlay" @tap="showImportModal = false">
      <view class="modal-panel" @tap.stop>
        <text class="modal-title">导入歌单</text>
        <text class="modal-desc">粘贴朋友发来的分享码</text>
        <textarea
          class="import-input"
          v-model="importCode"
          placeholder="在此粘贴分享码（以 LM- 开头）"
          :maxlength="-1"
        />
        <view class="modal-actions">
          <view class="modal-btn modal-btn-primary" @tap="doImport">
            <text class="modal-btn-text">导入歌单</text>
          </view>
          <view class="modal-btn" @tap="showImportModal = false; importCode = ''">
            <text class="modal-btn-text-secondary">取消</text>
          </view>
        </view>
      </view>
    </view>

    <!-- importing progress -->
    <view v-if="importing" class="modal-overlay">
      <view class="modal-panel" style="text-align: center;">
        <view class="loading-spinner" />
        <text class="importing-text">正在导入... ({{ importProgress }}/{{ importTotal }})</text>
        <text class="importing-hint">正在从B站获取曲目信息</text>
      </view>
    </view>

    <MiniPlayer />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { usePlaylistStore } from '../../stores/playlist';
import { parseShareCode } from '../../utils/share';
import { api } from '../../utils/api';
import PlaylistCard from '../../components/playlist-card/playlist-card.vue';
import MiniPlayer from '../../components/mini-player/mini-player.vue';
import type { Playlist } from '../../utils/api';

const playlistStore = usePlaylistStore();
const showImportModal = ref(false);
const importCode = ref('');
const importing = ref(false);
const importProgress = ref(0);
const importTotal = ref(0);

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

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/playlist-detail/playlist-detail?id=${id}` });
}

async function doImport() {
  const code = importCode.value.trim();
  if (!code) {
    uni.showToast({ title: '请粘贴分享码', icon: 'none' });
    return;
  }

  const parsed = parseShareCode(code);
  if (!parsed) {
    uni.showToast({ title: '分享码无效', icon: 'none' });
    return;
  }

  showImportModal.value = false;
  importing.value = true;
  importTotal.value = parsed.tracks.length;
  importProgress.value = 0;

  const tracks: Playlist['tracks'] = [];

  for (const item of parsed.tracks) {
    try {
      const info = await api.getVideoInfo(item.bvid);
      const page = info.pages.find((p) => p.cid === item.cid) || info.pages[0];
      tracks.push({
        id: `${item.bvid}_${item.cid}`,
        bvid: item.bvid,
        cid: item.cid,
        title: info.pages.length > 1
          ? `${info.title} - P${page.page} ${page.part}`
          : info.title,
        artist: info.owner.name,
        cover: info.cover,
        duration: page.duration,
      });
    } catch {
      tracks.push({
        id: `${item.bvid}_${item.cid}`,
        bvid: item.bvid,
        cid: item.cid,
        title: `${item.bvid}`,
        artist: '未知',
        cover: '',
        duration: 0,
      });
    }
    importProgress.value++;
  }

  playlistStore.importPlaylist({
    id: '',
    name: parsed.name,
    cover: tracks[0]?.cover || '',
    tracks,
    created_at: 0,
    updated_at: 0,
  });

  importing.value = false;
  importCode.value = '';
  uni.showToast({ title: `已导入「${parsed.name}」(${tracks.length}首)`, icon: 'success' });
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

.header-actions {
  display: flex;
  gap: 12rpx;
}

.import-btn {
  padding: 14rpx 28rpx;
  background-color: #ffffff;
  border-radius: 30rpx;
  border: 2rpx solid #e5e5ea;
  cursor: pointer;
}

.import-text {
  font-size: 26rpx;
  color: #fb7299;
  font-weight: 500;
}

.create-btn {
  padding: 14rpx 32rpx;
  background: linear-gradient(135deg, #fb7299, #f04e7d);
  border-radius: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(251, 114, 153, 0.3);
  cursor: pointer;
}

.create-text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 500;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 180rpx 0;
}

.empty-icon { font-size: 100rpx; margin-bottom: 24rpx; opacity: 0.2; }
.empty-text { font-size: 32rpx; color: #8e8e93; margin-bottom: 12rpx; }
.empty-hint { font-size: 26rpx; color: #c7c7cc; text-align: center; line-height: 1.6; }

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

.import-input {
  width: 100%;
  height: 200rpx;
  background-color: #f2f2f7;
  border-radius: 16rpx;
  padding: 20rpx;
  font-size: 26rpx;
  color: #1d1d1f;
  margin-bottom: 28rpx;
  box-sizing: border-box;
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

.modal-btn-text { font-size: 30rpx; color: #ffffff; font-weight: 500; }
.modal-btn-text-secondary { font-size: 28rpx; color: #8e8e93; }

.loading-spinner {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid #e5e5ea;
  border-top-color: #fb7299;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 20rpx;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.importing-text {
  font-size: 30rpx;
  color: #1d1d1f;
  display: block;
  margin-bottom: 8rpx;
}

.importing-hint {
  font-size: 24rpx;
  color: #8e8e93;
}
</style>
