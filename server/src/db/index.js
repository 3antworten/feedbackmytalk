import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, "app.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS speakers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Single-row site-wide settings (id is always 1).
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  signups_enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS decks (
  id TEXT PRIMARY KEY,
  speaker_id TEXT NOT NULL REFERENCES speakers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- order_index for the trailing synthetic "general" slide is deck.slide count (i.e. one
-- past the last real slide). image_path is NULL for that row since it has no rendered page.
CREATE TABLE IF NOT EXISTS slides (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  image_path TEXT,
  title TEXT,
  is_general INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  name TEXT,
  join_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  display_name TEXT,
  join_order INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  slide_id TEXT NOT NULL REFERENCES slides(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  slide_id TEXT NOT NULL REFERENCES slides(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  asked_live INTEGER NOT NULL DEFAULT 0,
  answer_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Speaker-authored questions to rehearse Q&A against, independent of any one slide.
CREATE TABLE IF NOT EXISTS prepared_questions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Each participant keeps their own private askedLive/answerNote against a prepared question.
CREATE TABLE IF NOT EXISTS prepared_question_responses (
  id TEXT PRIMARY KEY,
  prepared_question_id TEXT NOT NULL REFERENCES prepared_questions(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  asked_live INTEGER NOT NULL DEFAULT 0,
  answer_note TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (prepared_question_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_slides_deck ON slides(deck_id, order_index);
CREATE INDEX IF NOT EXISTS idx_comments_session_slide ON comments(session_id, slide_id);
CREATE INDEX IF NOT EXISTS idx_questions_session_slide ON questions(session_id, slide_id);
CREATE INDEX IF NOT EXISTS idx_participants_session ON participants(session_id);
CREATE INDEX IF NOT EXISTS idx_prepared_questions_session ON prepared_questions(session_id, order_index);
CREATE INDEX IF NOT EXISTS idx_prepared_responses_participant ON prepared_question_responses(participant_id);
`);

// Lightweight forward-migration for prototype DBs created before a column existed.
// `backfill`, if given, runs once right after the column is added — used to treat every
// pre-existing row as already satisfying the new column's intent (e.g. accounts created
// before email confirmation existed are treated as already confirmed).
function ensureColumn(table, column, definition, backfill) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    if (backfill) db.exec(backfill);
  }
}
ensureColumn("sessions", "name", "TEXT");
ensureColumn("slides", "title", "TEXT");
ensureColumn("slides", "is_general", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("speakers", "is_admin", "INTEGER NOT NULL DEFAULT 0");
ensureColumn(
  "speakers",
  "email_confirmed_at",
  "TEXT",
  "UPDATE speakers SET email_confirmed_at = datetime('now') WHERE email_confirmed_at IS NULL"
);
ensureColumn("speakers", "confirmation_token", "TEXT");
ensureColumn("speakers", "confirmation_token_expires_at", "TEXT");

db.prepare("INSERT OR IGNORE INTO app_settings (id, signups_enabled) VALUES (1, 1)").run();
