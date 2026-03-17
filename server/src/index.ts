import express from 'express';
import cors from 'cors';
import { videoRouter } from './routes/video';
import { audioRouter } from './routes/audio';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/video', videoRouter);
app.use('/api/audio', audioRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

const server = app.listen(PORT, () => {
  console.log(`ListenMusic server running on http://localhost:${PORT}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try: PORT=${PORT + 1} npm run dev`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
