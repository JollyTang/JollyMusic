import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api, type Playlist, type Track } from '../utils/api';

export const usePlaylistStore = defineStore('playlist', () => {
  const playlists = ref<Playlist[]>([]);
  const currentTracks = ref<Track[]>([]);
  const loading = ref(false);

  async function fetchPlaylists() {
    loading.value = true;
    try {
      playlists.value = await api.getPlaylists();
    } catch (err: any) {
      uni.showToast({ title: err.message || '加载失败', icon: 'none' });
    } finally {
      loading.value = false;
    }
  }

  async function createPlaylist(name: string) {
    try {
      await api.createPlaylist(name);
      await fetchPlaylists();
      uni.showToast({ title: '创建成功', icon: 'success' });
    } catch (err: any) {
      uni.showToast({ title: err.message || '创建失败', icon: 'none' });
    }
  }

  async function deletePlaylist(id: number) {
    try {
      await api.deletePlaylist(id);
      playlists.value = playlists.value.filter((p) => p.id !== id);
      uni.showToast({ title: '已删除', icon: 'success' });
    } catch (err: any) {
      uni.showToast({ title: err.message || '删除失败', icon: 'none' });
    }
  }

  async function fetchTracks(playlistId: number) {
    loading.value = true;
    try {
      currentTracks.value = await api.getPlaylistTracks(playlistId);
    } catch (err: any) {
      uni.showToast({ title: err.message || '加载失败', icon: 'none' });
    } finally {
      loading.value = false;
    }
  }

  async function addTrack(
    playlistId: number,
    track: {
      bvid: string; cid: number; title: string;
      artist: string; cover: string; duration: number;
    }
  ) {
    try {
      await api.addTrackToPlaylist(playlistId, track);
      uni.showToast({ title: '已添加', icon: 'success' });
    } catch (err: any) {
      uni.showToast({ title: err.message || '添加失败', icon: 'none' });
    }
  }

  async function removeTrack(playlistId: number, trackId: number) {
    try {
      await api.removeTrackFromPlaylist(playlistId, trackId);
      currentTracks.value = currentTracks.value.filter((t) => t.id !== trackId);
      uni.showToast({ title: '已移除', icon: 'success' });
    } catch (err: any) {
      uni.showToast({ title: err.message || '移除失败', icon: 'none' });
    }
  }

  return {
    playlists,
    currentTracks,
    loading,
    fetchPlaylists,
    createPlaylist,
    deletePlaylist,
    fetchTracks,
    addTrack,
    removeTrack,
  };
});
