import { Request, Response } from 'express';
import { USER_AGENT } from './bilibili/wbi';

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
