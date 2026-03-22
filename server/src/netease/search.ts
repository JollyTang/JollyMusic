import NeteaseApi from 'NeteaseCloudMusicApi';

export interface NeteaseTrack {
  id: number;
  name: string;
  artists: string;
  album: string;
  cover: string;
  duration: number;
  isVip: boolean;
}

export async function searchSongs(keyword: string, limit = 20): Promise<NeteaseTrack[]> {
  const res = await (NeteaseApi as any).search({ keywords: keyword, limit, type: 1 });

  if (res.status !== 200 || !res.body?.result?.songs) {
    return [];
  }

  return res.body.result.songs.map((song: any) => ({
    id: song.id,
    name: song.name,
    artists: song.artists?.map((a: any) => a.name).join(' / ') || '',
    album: song.album?.name || '',
    cover: song.album?.artist?.img1v1Url || '',
    duration: Math.floor((song.duration || 0) / 1000),
    isVip: song.fee === 1,
  }));
}
