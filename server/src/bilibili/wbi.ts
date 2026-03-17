import crypto from 'crypto';

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
];

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

interface WbiKeys {
  imgKey: string;
  subKey: string;
  mixinKey: string;
  fetchedAt: number;
}

let cachedKeys: WbiKeys | null = null;

function getMixinKey(raw: string): string {
  return MIXIN_KEY_ENC_TAB.map((i) => raw[i])
    .join('')
    .slice(0, 32);
}

async function fetchWbiKeys(): Promise<WbiKeys> {
  const now = Date.now();

  if (cachedKeys && now - cachedKeys.fetchedAt < 12 * 60 * 60 * 1000) {
    return cachedKeys;
  }

  const resp = await fetch('https://api.bilibili.com/x/web-interface/nav', {
    headers: { 'User-Agent': USER_AGENT, Referer: 'https://www.bilibili.com' },
  });
  const data: any = await resp.json();
  const { img_url, sub_url } = data.data.wbi_img;

  const imgKey = img_url.split('/').pop()!.split('.')[0];
  const subKey = sub_url.split('/').pop()!.split('.')[0];
  const mixinKey = getMixinKey(imgKey + subKey);

  cachedKeys = { imgKey, subKey, mixinKey, fetchedAt: now };
  return cachedKeys;
}

export async function signParams(params: Record<string, string | number>): Promise<string> {
  const { mixinKey } = await fetchWbiKeys();
  const wts = Math.floor(Date.now() / 1000);

  const allParams: Record<string, string | number> = { ...params, wts };

  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(allParams)) {
    filtered[k] = String(v).replace(/[!'()*]/g, '');
  }

  const sorted = Object.keys(filtered)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(filtered[k])}`)
    .join('&');

  const wRid = crypto.createHash('md5').update(sorted + mixinKey).digest('hex');

  return `${sorted}&w_rid=${wRid}`;
}

export { USER_AGENT };
