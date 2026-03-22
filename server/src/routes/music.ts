import { Router } from 'express';
import { searchSongs as searchNetease } from '../netease/search';
import { getSongUrl as getNeteaseUrl, getSongDetail } from '../netease/song';
import { searchSongs as searchQQ } from '../qqmusic/search';
import { getSongUrl as getQQUrl } from '../qqmusic/song';

export const musicRouter = Router();

musicRouter.get('/search', async (req, res) => {
  try {
    const { keyword, platform = 'netease', limit = '20' } = req.query;
    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({ code: -1, message: 'keyword is required' });
    }

    let tracks;
    if (platform === 'netease') {
      tracks = await searchNetease(keyword, Number(limit));
    } else if (platform === 'qq') {
      tracks = await searchQQ(keyword, Number(limit));
    } else {
      return res.status(400).json({ code: -1, message: `Unsupported platform: ${platform}` });
    }

    res.json({ code: 0, data: tracks });
  } catch (err: any) {
    res.status(500).json({ code: -1, message: err.message });
  }
});

musicRouter.get('/url/:platform/:id', async (req, res) => {
  try {
    const { platform, id } = req.params;

    let result;
    if (platform === 'netease') {
      result = await getNeteaseUrl(Number(id));
    } else if (platform === 'qq') {
      result = await getQQUrl(id);
    } else {
      return res.status(400).json({ code: -1, message: `Unsupported platform: ${platform}` });
    }

    if (!result.url) {
      return res.json({ code: -1, message: 'VIP歌曲或暂无音源' });
    }
    res.json({ code: 0, data: result });
  } catch (err: any) {
    res.status(500).json({ code: -1, message: err.message });
  }
});

musicRouter.get('/detail/:platform/:id', async (req, res) => {
  try {
    const { platform, id } = req.params;

    if (platform === 'netease') {
      const detail = await getSongDetail(Number(id));
      if (!detail) {
        return res.json({ code: -1, message: '歌曲不存在' });
      }
      res.json({ code: 0, data: detail });
    } else {
      res.status(400).json({ code: -1, message: `Unsupported platform: ${platform}` });
    }
  } catch (err: any) {
    res.status(500).json({ code: -1, message: err.message });
  }
});
