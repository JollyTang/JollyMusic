import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Playlist, Track } from '../utils/api';

const STORAGE_KEY = 'lm_playlists';

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadFromStorage(): Playlist[] {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(data: Playlist[]) {
  uni.setStorageSync(STORAGE_KEY, JSON.stringify(data));
}

export const usePlaylistStore = defineStore('playlist', () => {
  const playlists = ref<Playlist[]>(loadFromStorage());
  const currentTracks = ref<Track[]>([]);
  const loading = ref(false);

  function persist() {
    saveToStorage(playlists.value);
  }

  function fetchPlaylists() {
    playlists.value = loadFromStorage();
  }

  function createPlaylist(name: string) {
    const pl: Playlist = {
      id: genId(),
      name,
      cover: '',
      tracks: [],
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    playlists.value.unshift(pl);
    persist();
    uni.showToast({ title: '创建成功', icon: 'success' });
  }

  function renamePlaylist(id: string, newName: string) {
    const pl = playlists.value.find((p) => p.id === id);
    if (!pl) return;
    pl.name = newName;
    pl.updated_at = Date.now();
    persist();
  }

  function deletePlaylist(id: string) {
    playlists.value = playlists.value.filter((p) => p.id !== id);
    persist();
    uni.showToast({ title: '已删除', icon: 'success' });
  }

  function fetchTracks(playlistId: string) {
    const pl = playlists.value.find((p) => p.id === playlistId);
    currentTracks.value = pl ? [...pl.tracks] : [];
  }

  function addTrack(
    playlistId: string,
    track: { bvid: string; cid: number; title: string; artist: string; cover: string; duration: number }
  ) {
    const pl = playlists.value.find((p) => p.id === playlistId);
    if (!pl) {
      uni.showToast({ title: '歌单不存在', icon: 'none' });
      return;
    }

    const exists = pl.tracks.some((t) => t.bvid === track.bvid && t.cid === track.cid);
    if (exists) {
      uni.showToast({ title: '曲目已在歌单中', icon: 'none' });
      return;
    }

    pl.tracks.push({ ...track, id: genId() });
    if (!pl.cover && track.cover) {
      pl.cover = track.cover;
    }
    pl.updated_at = Date.now();
    persist();
    uni.showToast({ title: '已添加', icon: 'success' });
  }

  function removeTrack(playlistId: string, trackId: string) {
    const pl = playlists.value.find((p) => p.id === playlistId);
    if (!pl) return;

    pl.tracks = pl.tracks.filter((t) => t.id !== trackId);
    pl.cover = pl.tracks[0]?.cover || '';
    pl.updated_at = Date.now();
    persist();
    currentTracks.value = [...pl.tracks];
    uni.showToast({ title: '已移除', icon: 'success' });
  }

  function reorderTrack(playlistId: string, fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    const pl = playlists.value.find((p) => p.id === playlistId);
    if (!pl) return;
    const item = pl.tracks.splice(fromIndex, 1)[0];
    pl.tracks.splice(toIndex, 0, item);
    pl.cover = pl.tracks[0]?.cover || '';
    pl.updated_at = Date.now();
    persist();
    currentTracks.value = [...pl.tracks];
  }

  function getPlaylistById(id: string): Playlist | undefined {
    return playlists.value.find((p) => p.id === id);
  }

  function importPlaylist(pl: Playlist) {
    pl.id = genId();
    pl.created_at = Date.now();
    pl.updated_at = Date.now();
    pl.tracks.forEach((t) => { t.id = genId(); });
    playlists.value.unshift(pl);
    persist();
  }

  return {
    playlists,
    currentTracks,
    loading,
    fetchPlaylists,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    fetchTracks,
    addTrack,
    removeTrack,
    reorderTrack,
    getPlaylistById,
    importPlaylist,
  };
});
