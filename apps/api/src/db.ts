import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { env } from './env.ts'

mkdirSync(dirname(env.databasePath), { recursive: true })

export const db = new Database(env.databasePath, { create: true })

db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA synchronous = NORMAL')
db.exec('PRAGMA foreign_keys = ON')
db.exec('PRAGMA busy_timeout = 5000')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    username       TEXT    NOT NULL,
    username_lower TEXT    NOT NULL UNIQUE,
    password_hash  TEXT    NOT NULL,
    is_admin       INTEGER NOT NULL DEFAULT 0,
    approved       INTEGER NOT NULL DEFAULT 1,
    created_at     INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS qr_codes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    token      TEXT    NOT NULL UNIQUE,
    label      TEXT    NOT NULL,
    hint       TEXT,
    active     INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS scans (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    qr_id      INTEGER NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    UNIQUE (user_id, qr_id)
  );

  CREATE INDEX IF NOT EXISTS idx_scans_user ON scans(user_id);
  CREATE INDEX IF NOT EXISTS idx_scans_qr   ON scans(qr_id);

  CREATE TABLE IF NOT EXISTS event_state (
    id                INTEGER PRIMARY KEY CHECK (id = 1),
    name              TEXT    NOT NULL,
    tagline           TEXT    NOT NULL,
    status            TEXT    NOT NULL,
    duration_sec      INTEGER NOT NULL,
    target_qr_count   INTEGER NOT NULL,
    participation_mode TEXT NOT NULL DEFAULT 'open',
    started_at        INTEGER,
    paused_at         INTEGER,
    paused_ms         INTEGER NOT NULL DEFAULT 0
  );
`)

// Миграция: если таблица qr_codes была создана до добавления hint — дополняем столбец.
const qrColumns = db.query('PRAGMA table_info(qr_codes)').all() as Array<{ name: string }>
if (!qrColumns.some((col) => col.name === 'hint')) {
  db.exec('ALTER TABLE qr_codes ADD COLUMN hint TEXT')
}

// Миграции для режима одобрения участников.
const usersColumns = db.query('PRAGMA table_info(users)').all() as Array<{ name: string }>
if (!usersColumns.some((col) => col.name === 'approved')) {
  db.exec('ALTER TABLE users ADD COLUMN approved INTEGER NOT NULL DEFAULT 1')
}

const eventColumns = db.query('PRAGMA table_info(event_state)').all() as Array<{ name: string }>
if (!eventColumns.some((col) => col.name === 'participation_mode')) {
  db.exec("ALTER TABLE event_state ADD COLUMN participation_mode TEXT NOT NULL DEFAULT 'open'")
}

db.query(
  `INSERT OR IGNORE INTO event_state
     (id, name, tagline, status, duration_sec, target_qr_count, participation_mode, started_at, paused_at, paused_ms)
   VALUES (1, ?, ?, 'idle', ?, ?, 'open', NULL, NULL, 0)`,
).run('QRUSH', 'Найди. Отсканируй. Обгони.', 3600, 20)
