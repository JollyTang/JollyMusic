import { Request, Response } from 'express';
import { USER_AGENT } from './bilibili/wbi';

const imageCache = new Map<string, { data: Buffer; contentType: string; cachedAt: number }>();
const IMAGE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function proxyImage(req: Request, res: Response) {
  const imageUrl = req.query.url as string;

  if (!imageUrl || !imageUrl.includes('hdslb.com')) {
    res.status(400).json({ error: '无效的图片地址' });
    return;
  }

  try {
    const cached = imageCache.get(imageUrl);
    if (cached && Date.now() - cached.cachedAt < IMAGE_CACHE_TTL) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(cached.data);
      return;
    }

    const upstream = await fetch(imageUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Referer: 'https://www.bilibili.com',
      },
    });

    if (!upstream.ok) {
      res.status(upstream.status).end();
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await upstream.arrayBuffer());

    if (buffer.length < 5 * 1024 * 1024) {
      imageCache.set(imageUrl, { data: buffer, contentType, cachedAt: Date.now() });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(502).json({ error: '图片代理失败', message: err.message });
    }
  }
}

export async function proxyAudioStream(req: Request, res: Response) {
  const audioUrl = req.query.url as string;

  if (!audioUrl) {
    res.status(400).json({ error: '缺少 url 参数' });
    return;
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': USER_AGENT,
      Referer: 'https://www.bilibili.com',
      Origin: 'https://www.bilibili.com',
    };

    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const upstream = await fetch(audioUrl, { headers });

    res.status(upstream.status);

    const passHeaders = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
    ];
    for (const h of passHeaders) {
      const val = upstream.headers.get(h);
      if (val) res.setHeader(h, val);
    }

    if (!upstream.body) {
      res.end();
      return;
    }

    const reader = upstream.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          return;
        }
        if (!res.write(value)) {
          await new Promise<void>((resolve) => res.once('drain', resolve));
        }
      }
    };

    req.on('close', () => {
      reader.cancel().catch(() => {});
    });

    await pump();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(502).json({ error: '代理请求失败', message: err.message });
    }
  }
}
