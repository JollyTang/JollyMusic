import { USER_AGENT } from './wbi';

const BILIBILI_API = 'https://api.bilibili.com';

export interface PageInfo {
  cid: number;
  page: number;
  part: string;
  duration: number;
}

export interface VideoInfo {
  bvid: string;
  aid: number;
  title: string;
  desc: string;
  cover: string;
  duration: number;
  owner: {
    mid: number;
    name: string;
    face: string;
  };
  pages: PageInfo[];
}

export async function getVideoInfo(bvid: string): Promise<VideoInfo> {
  const url = `${BILIBILI_API}/x/web-interface/view?bvid=${bvid}`;

  const resp = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Referer: 'https://www.bilibili.com',
    },
  });

  const json: any = await resp.json();

  if (json.code !== 0) {
    throw new Error(`B站API错误: ${json.message} (code: ${json.code})`);
  }

  const d = json.data;
  const proxyImg = (url: string) => {
    if (!url) return '';
    const src = url.replace(/^http:\/\//, 'https://');
    return `/api/audio/image?url=${encodeURIComponent(src)}`;
  };
  return {
    bvid: d.bvid,
    aid: d.aid,
    title: d.title,
    desc: d.desc,
    cover: proxyImg(d.pic),
    duration: d.duration,
    owner: {
      mid: d.owner.mid,
      name: d.owner.name,
      face: proxyImg(d.owner.face),
    },
    pages: d.pages.map((p: any) => ({
      cid: p.cid,
      page: p.page,
      part: p.part,
      duration: p.duration,
    })),
  };
}
