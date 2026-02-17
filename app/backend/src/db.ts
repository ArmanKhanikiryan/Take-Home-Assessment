// Uses Node.js 22+ built-in sqlite — no native module, no version conflicts
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.resolve('../../cpg.db');

let _db: DatabaseSync | null = null;

export function isDbReady(): boolean {
  try {
    return fs.existsSync(DB_PATH) && fs.statSync(DB_PATH).size > 1024 * 1024;
  } catch {
    return false;
  }
}

export function getDbPath(): string {
  return DB_PATH;
}

export function getDb(): DatabaseSync {
  if (!_db) {
    if (!fs.existsSync(DB_PATH)) {
      throw new Error(`Database not found at ${DB_PATH}. Generation may still be in progress.`);
    }
    _db = new DatabaseSync(DB_PATH, { readOnly: true });
    _db.exec('PRAGMA cache_size = -64000');
    _db.exec('PRAGMA mmap_size = 268435456');
    _db.exec('PRAGMA temp_store = MEMORY');
    const size = (fs.statSync(DB_PATH).size / 1024 / 1024).toFixed(0);
    console.log(`Connected to database: ${DB_PATH} (${size} MB)`);
  }
  return _db;
}

export function query<T = Record<string, unknown>>(sql: string, params: Record<string, unknown> = {}): T[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  return stmt.all(params) as T[];
}

export function queryOne<T = Record<string, unknown>>(sql: string, params: Record<string, unknown> = {}): T | undefined {
  const db = getDb();
  const stmt = db.prepare(sql);
  return stmt.get(params) as T | undefined;
}
