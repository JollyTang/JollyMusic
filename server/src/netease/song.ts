import NeteaseApi from 'NeteaseCloudMusicApi';

export interface NeteaseSongUrl {
  url: string | null;
  br: number;
}

export async function getSongUrl(id: number): Promise<NeteaseSongUrl> {
  const res = await (NeteaseApi as any).song_url({ id, br: 320000 });

  if (res.status !== 200 || !res.body?.data?.[0]) {
    return { url: null, br: 0 };
  }

  const d = res.body.data[0];
  return {
    url: d.url || null,
    br: d.br || 0,
  };
}

export interface NeteaseSongDetail {
  id: number;
  name: string;
  artists: string;
  album: string;
  cover: string;
  duration: number;
  isVip: boolean;
}

export async function getSongDetail(id: number): Promise<NeteaseSongDetail | null> {
  const res = await (NeteaseApi as any).song_detail({ ids: String(id) });

  if (res.status !== 200 || !res.body?.songs?.[0]) {
    return null;
  }

  const song = res.body.songs[0];
  return {
    id: song.id,
    name: song.name,
    artists: song.ar?.map((a: any) => a.name).join(' / ') || '',
    album: song.al?.name || '',
    cover: song.al?.picUrl || '',
    duration: Math.floor((song.dt || 0) / 1000),
    isVip: song.fee === 1,
  };
}
