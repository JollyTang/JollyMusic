const BASE_URL = '/api';

interface ApiResponse<T = any> {
  code: number;
  data?: T;
  message?: string;
}

async function request<T>(url: string, options: UniApp.RequestOptions = {} as any): Promise<T> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${url}`,
      ...options,
      success: (res) => {
        const data = res.data as ApiResponse<T>;
        if (data.code === 0) {
          resolve(data.data as T);
        } else {
          reject(new Error(data.message || '请求失败'));
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络错误'));
      },
    });
  });
}

export interface VideoInfo {
  bvid: string;
  aid: number;
  title: string;
  desc: string;
  cover: string;
  duration: number;
  owner: { mid: number; name: string; face: string };
  pages: { cid: number; page: number; part: string; duration: number }[];
}

export interface AudioStream {
  url: string;
  backupUrls: string[];
  bandwidth: number;
  mimeType: string;
}

export interface Playlist {
  id: number;
  name: string;
  cover: string;
  track_count: number;
  created_at: string;
  updated_at: string;
}

export interface Track {
  id: number;
  bvid: string;
  cid: number;
  title: string;
  artist: string;
  cover: string;
  duration: number;
  sort_order: number;
}

export const api = {
  getVideoInfo(bvid: string) {
    return request<VideoInfo>(`/video/info/${bvid}`);
  },

  getAudioStream(bvid: string, cid: number) {
    return request<AudioStream>(`/video/audio/${bvid}/${cid}`);
  },

  getAudioProxyUrl(url: string) {
    return `${BASE_URL}/audio/proxy?url=${encodeURIComponent(url)}`;
  },

  getPlaylists() {
    return request<Playlist[]>('/playlists');
  },

  createPlaylist(name: string, cover?: string) {
    return request<{ id: number }>('/playlists', {
      method: 'POST',
      data: { name, cover },
    } as any);
  },

  deletePlaylist(id: number) {
    return request('/playlists/' + id, { method: 'DELETE' } as any);
  },

  getPlaylistTracks(id: number) {
    return request<Track[]>(`/playlists/${id}/tracks`);
  },

  addTrackToPlaylist(playlistId: number, track: {
    bvid: string; cid: number; title: string;
    artist: string; cover: string; duration: number;
  }) {
    return request(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      data: track,
    } as any);
  },

  removeTrackFromPlaylist(playlistId: number, trackId: number) {
    return request(`/playlists/${playlistId}/tracks`, {
      method: 'DELETE',
      data: { trackId },
    } as any);
  },
};
