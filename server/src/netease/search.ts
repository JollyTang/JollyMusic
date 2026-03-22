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
  const res = await (NeteaseApi as any).search({ keywords: keyword, limit, type: 1, realIP: '116.25.146.177' });

  if (res.status !== 200 || !res.body?.result?.songs) {
    return [];
  }

  const songs = res.body.result.songs;
  const ids = songs.map((s: any) => s.id).join(',');

  let coverMap: Record<number, string> = {};
  try {
    const detailRes = await (NeteaseApi as any).song_detail({ ids, realIP: '116.25.146.177' });
    if (detailRes.status === 200 && detailRes.body?.songs) {
      for (const s of detailRes.body.songs) {
        coverMap[s.id] = s.al?.picUrl || '';
      }
    }
  } catch {
    // fall back to no cover
  }

  return songs.map((song: any) => ({
    id: song.id,
    name: song.name,
    artists: song.artists?.map((a: any) => a.name).join(' / ') || '',
    album: song.album?.name || '',
    cover: coverMap[song.id] || '',
    duration: Math.floor((song.duration || 0) / 1000),
    isVip: song.fee === 1,
  }));
}
