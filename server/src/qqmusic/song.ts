const QQ_API = 'https://u.y.qq.com/cgi-bin/musicu.fcg';

export interface QQSongUrl {
  url: string | null;
}

export async function getSongUrl(songmid: string, quality = '128'): Promise<QQSongUrl> {
  const prefix = quality === 'm4a' ? 'C400' : quality === '128' ? 'M500' : 'M800';
  const suffix = quality === 'm4a' ? 'm4a' : 'mp3';

  const body = JSON.stringify({
    req_1: {
      module: 'vkey.GetVkeyServer',
      method: 'CgiGetVkey',
      param: {
        filename: [`${prefix}${songmid}${songmid}.${suffix}`],
        guid: '10000',
        songmid: [songmid],
        songtype: [0],
        uin: '0',
        loginflag: 1,
        platform: '20',
      },
    },
    loginUin: '0',
    comm: { uin: '0', format: 'json', ct: 24, cv: 0 },
  });

  const res = await fetch(QQ_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      Referer: 'https://y.qq.com/',
    },
    body,
  });

  const data: any = await res.json();
  const sip = data?.req_1?.data?.sip?.[0] || '';
  const purl = data?.req_1?.data?.midurlinfo?.[0]?.purl || '';

  if (!purl) return { url: null };
  return { url: sip + purl };
}
