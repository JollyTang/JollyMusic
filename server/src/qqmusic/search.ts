const QQ_API = 'https://u.y.qq.com/cgi-bin/musicu.fcg';

export interface QQMusicTrack {
  id: string;
  mid: string;
  name: string;
  artists: string;
  album: string;
  albumMid: string;
  cover: string;
  duration: number;
  isVip: boolean;
}

export async function searchSongs(keyword: string, limit = 20): Promise<QQMusicTrack[]> {
  const body = JSON.stringify({
    comm: { ct: '19', cv: '1859', uin: '0' },
    req: {
      method: 'DoSearchForQQMusicDesktop',
      module: 'music.search.SearchCgiService',
      param: { grp: 1, num_per_page: limit, page_num: 1, query: keyword, search_type: 0 },
    },
  });

  const res = await fetch(QQ_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Gecko/20100101 Firefox/115.0',
      Referer: 'https://y.qq.com/',
    },
    body,
  });

  const data: any = await res.json();
  const songs = data?.req?.data?.body?.song?.list;
  if (!Array.isArray(songs)) return [];

  return songs.map((s: any) => ({
    id: s.mid || String(s.id || ''),
    mid: s.mid || '',
    name: s.name || s.title || '',
    artists: (s.singer || []).map((a: any) => a.name).join(' / '),
    album: s.album?.name || '',
    albumMid: s.album?.mid || '',
    cover: s.album?.mid
      ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${s.album.mid}.jpg`
      : '',
    duration: s.interval || 0,
    isVip: s.pay?.pay_play === 1,
  }));
}
