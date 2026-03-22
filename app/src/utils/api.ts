const isNative = typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
const isDev = !isNative && typeof window !== 'undefined' && (
  window.location?.hostname === 'localhost' ||
  window.location?.hostname === '127.0.0.1' ||
  window.location?.port === '5173'
);
const BASE_URL = isDev ? '/api' : 'https://tang2000-jollymusic.hf.space/api';

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

export type TrackSource = 'bilibili' | 'netease' | 'qq';

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

export interface Track {
  id: string;
  source?: TrackSource;
  sourceId?: string;
  bvid: string;
  cid: number;
  title: string;
  artist: string;
  cover: string;
  duration: number;
  isVip?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  cover: string;
  tracks: Track[];
  created_at: number;
  updated_at: number;
}

export interface NeteaseSearchTrack {
  id: number;
  name: string;
  artists: string;
  album: string;
  cover: string;
  duration: number;
  isVip: boolean;
}

export interface NeteaseSongUrl {
  url: string | null;
  br: number;
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

  proxyImage(url: string) {
    if (!url || !url.includes('hdslb.com')) return url;
    return `${BASE_URL}/audio/image?url=${encodeURIComponent(url)}`;
  },

  searchNetease(keyword: string, limit = 20) {
    return request<NeteaseSearchTrack[]>(`/music/search?keyword=${encodeURIComponent(keyword)}&platform=netease&limit=${limit}`);
  },

  getNeteaseSongUrl(id: number) {
    return request<NeteaseSongUrl>(`/music/url/netease/${id}`);
  },
};
