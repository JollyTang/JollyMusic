import { Router } from 'express';
import { proxyAudioStream, proxyImage } from '../proxy';

export const audioRouter = Router();

audioRouter.get('/proxy', proxyAudioStream);
audioRouter.get('/image', proxyImage);
