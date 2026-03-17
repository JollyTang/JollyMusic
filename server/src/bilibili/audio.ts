import { signParams, USER_AGENT } from './wbi';

const BILIBILI_API = 'https://api.bilibili.com';

export interface AudioStream {
  url: string;
  backupUrls: string[];
  bandwidth: number;
  codecid: number;
  mimeType: string;
}

export async function getAudioStream(bvid: string, cid: number): Promise<AudioStream> {
  const queryString = await signParams({
    bvid,
    cid,
    fnval: 16, // DASH format
    fnver: 0,
    fourk: 0,
    qn: 0,
  });

  const url = `${BILIBILI_API}/x/player/playurl?${queryString}`;

  const resp = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Referer: `https://www.bilibili.com/video/${bvid}`,
    },
  });

  const json: any = await resp.json();

  if (json.code !== 0) {
    throw new Error(`获取音频流失败: ${json.message} (code: ${json.code})`);
  }

  const dash = json.data?.dash;
  if (!dash || !dash.audio || dash.audio.length === 0) {
    throw new Error('无法获取DASH音频流');
  }

  // Sort by bandwidth descending, pick best available (up to 132K without login)
  const audioTracks = dash.audio.sort(
    (a: any, b: any) => b.bandwidth - a.bandwidth
  );
  const best = audioTracks[0];

  return {
    url: best.baseUrl || best.base_url,
    backupUrls: best.backupUrl || best.backup_url || [],
    bandwidth: best.bandwidth,
    codecid: best.codecid,
    mimeType: best.mimeType || best.mime_type || 'audio/mp4',
  };
}
