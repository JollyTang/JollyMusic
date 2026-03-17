import { Router } from 'express';
import { proxyAudioStream } from '../proxy';

export const audioRouter = Router();

audioRouter.get('/proxy', proxyAudioStream);
