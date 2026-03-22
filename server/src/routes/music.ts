import { Router } from 'express';
import { searchSongs } from '../netease/search';
import { getSongUrl, getSongDetail } from '../netease/song';

export const musicRouter = Router();

musicRouter.get('/search', async (req, res) => {
  try {
    const { keyword, platform = 'netease', limit = '20' } = req.query;
    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({ code: -1, message: 'keyword is required' });
    }

    if (platform === 'netease') {
      const tracks = await searchSongs(keyword, Number(limit));
      res.json({ code: 0, data: tracks });
    } else {
      res.status(400).json({ code: -1, message: `Unsupported platform: ${platform}` });
    }
  } catch (err: any) {
    res.status(500).json({ code: -1, message: err.message });
  }
});

musicRouter.get('/url/:platform/:id', async (req, res) => {
  try {
    const { platform, id } = req.params;

    if (platform === 'netease') {
      const result = await getSongUrl(Number(id));
      if (!result.url) {
        return res.json({ code: -1, message: 'VIP歌曲或暂无音源' });
      }
      res.json({ code: 0, data: result });
    } else {
      res.status(400).json({ code: -1, message: `Unsupported platform: ${platform}` });
    }
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
