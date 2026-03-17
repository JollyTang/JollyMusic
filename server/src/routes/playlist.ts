import { Router } from 'express';
import { getDb } from '../db';

export const playlistRouter = Router();

// GET /api/playlists
playlistRouter.get('/', (_req, res) => {
  try {
    const db = getDb();
    const playlists = db.prepare(`
      SELECT p.*, COUNT(pt.track_id) as track_count
      FROM playlists p
      LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `).all();
    res.json({ code: 0, data: playlists });
  } catch (err: any) {
    res.status(500).json({ code: -1, message: err.message });
  }
});

// POST /api/playlists
playlistRouter.post('/', (req, res) => {
  try {
    const { name, cover } = req.body;
    if (!name) {
      res.status(400).json({ code: -1, message: '歌单名称不能为空' });
      return;
    }
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO playlists (name, cover) VALUES (?, ?)'
    ).run(name, cover || '');
    res.json({ code: 0, data: { id: result.lastInsertRowid, name, cover: cover || '' } });
  } catch (err: any) {
    res.status(500).json({ code: -1, message: err.message });
  }
});

// PUT /api/playlists/:id
playlistRouter.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, cover } = req.body;
    const db = getDb();
    db.prepare(
      `UPDATE playlists SET name = COALESCE(?, name), cover = COALESCE(?, cover),
       updated_at = datetime('now') WHERE id = ?`
    ).run(name || null, cover || null, id);
    res.json({ code: 0, data: { id: Number(id), name, cover } });
  } catch (err: any) {
    res.status(500).json({ code: -1, message: err.message });
  }
});

// DELETE /api/playlists/:id
playlistRouter.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    db.prepare('DELETE FROM playlists WHERE id = ?').run(id);
    res.json({ code: 0 });
  } catch (err: any) {
    res.status(500).json({ code: -1, message: err.message });
  }
});

// GET /api/playlists/:id/tracks
playlistRouter.get('/:id/tracks', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const tracks = db.prepare(`
      SELECT t.*, pt.sort_order
      FROM tracks t
      JOIN playlist_tracks pt ON t.id = pt.track_id
      WHERE pt.playlist_id = ?
      ORDER BY pt.sort_order ASC
    `).all(id);
    res.json({ code: 0, data: tracks });
  } catch (err: any) {
    res.status(500).json({ code: -1, message: err.message });
  }
});

// POST /api/playlists/:id/tracks
playlistRouter.post('/:id/tracks', (req, res) => {
  try {
    const { id } = req.params;
    const { bvid, cid, title, artist, cover, duration } = req.body;
    if (!bvid || !cid) {
      res.status(400).json({ code: -1, message: 'bvid 和 cid 不能为空' });
      return;
    }
    const db = getDb();

    const upsertTrack = db.prepare(`
      INSERT INTO tracks (bvid, cid, title, artist, cover, duration)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(bvid, cid) DO UPDATE SET
        title = excluded.title, artist = excluded.artist,
        cover = excluded.cover, duration = excluded.duration
    `);

    const getTrack = db.prepare(
      'SELECT id FROM tracks WHERE bvid = ? AND cid = ?'
    );

    const getMaxOrder = db.prepare(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM playlist_tracks WHERE playlist_id = ?'
    );

    const insertPT = db.prepare(
      'INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, sort_order) VALUES (?, ?, ?)'
    );

    const addTrack = db.transaction(() => {
      upsertTrack.run(bvid, cid, title || '', artist || '', cover || '', duration || 0);
      const track = getTrack.get(bvid, cid) as any;
      const { next_order } = getMaxOrder.get(id) as any;
      insertPT.run(id, track.id, next_order);
      db.prepare("UPDATE playlists SET updated_at = datetime('now') WHERE id = ?").run(id);
      return track.id;
    });

    const trackId = addTrack();
    res.json({ code: 0, data: { trackId } });
  } catch (err: any) {
    res.status(500).json({ code: -1, message: err.message });
  }
});

// DELETE /api/playlists/:id/tracks
playlistRouter.delete('/:id/tracks', (req, res) => {
  try {
    const { id } = req.params;
    const { trackId } = req.body;
    if (!trackId) {
      res.status(400).json({ code: -1, message: 'trackId 不能为空' });
      return;
    }
    const db = getDb();
    db.prepare(
      'DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?'
    ).run(id, trackId);
    db.prepare("UPDATE playlists SET updated_at = datetime('now') WHERE id = ?").run(id);
    res.json({ code: 0 });
  } catch (err: any) {
    res.status(500).json({ code: -1, message: err.message });
  }
});
