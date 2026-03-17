import Database from 'better-sqlite3';
import path from 'path';
import { createTables } from './schema';

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'listen-music.db');

let db: Database.Database;

export function initDatabase() {
  const fs = require('fs');
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  createTables(db);
  console.log(`Database initialized at ${DB_PATH}`);
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}
