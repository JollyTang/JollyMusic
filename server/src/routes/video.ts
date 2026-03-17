import { Router } from 'express';
import { getVideoInfo } from '../bilibili/video';
import { getAudioStream } from '../bilibili/audio';

export const videoRouter = Router();

videoRouter.get('/info/:bvid', async (req, res) => {
  try {
    const { bvid } = req.params;
    const info = await getVideoInfo(bvid);
    res.json({ code: 0, data: info });
  } catch (err: any) {
    res.status(500).json({ code: -1, message: err.message });
  }
});

videoRouter.get('/audio/:bvid/:cid', async (req, res) => {
  try {
    const { bvid, cid } = req.params;
    const stream = await getAudioStream(bvid, Number(cid));
    res.json({ code: 0, data: stream });
  } catch (err: any) {
    res.status(500).json({ code: -1, message: err.message });
  }
});
