import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "./config";

export type DB = Database.Database;

let instance: DB | null = null;

function ensureDirs() {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.mkdirSync(config.uploadsDir, { recursive: true });
}

const MIGRATIONS: Array<{ version: number; sql: string }> = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        display_name TEXT NOT NULL,
        email TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('admin','learner')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
        must_change_password INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_login_at TEXT
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL,
        ip TEXT,
        user_agent TEXT,
        revoked INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

      CREATE TABLE IF NOT EXISTS login_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        ip TEXT,
        success INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(username, created_at);

      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        domain TEXT NOT NULL CHECK (domain IN ('reseau','cybersecurite','webmaster')),
        level TEXT NOT NULL CHECK (level IN ('debutant','intermediaire','avance')),
        goal TEXT NOT NULL,
        target_duration TEXT,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
        current_notion_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_courses_user_status ON courses(user_id, status);

      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK (kind IN ('pdf','notes')),
        original_name TEXT NOT NULL,
        mime TEXT,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        sha256 TEXT,
        storage_path TEXT,
        page_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','error')),
        error_message TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_documents_course ON documents(course_id);
      CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);

      CREATE TABLE IF NOT EXISTS document_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        page_number INTEGER NOT NULL,
        section_title TEXT,
        content TEXT NOT NULL,
        UNIQUE(document_id, page_number)
      );

      CREATE TABLE IF NOT EXISTS document_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        page_number INTEGER,
        seq INTEGER NOT NULL,
        content TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id);

      CREATE VIRTUAL TABLE IF NOT EXISTS document_chunks_fts USING fts5(
        content,
        content='document_chunks',
        content_rowid='id',
        tokenize='unicode61 remove_diacritics 2'
      );

      CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON document_chunks BEGIN
        INSERT INTO document_chunks_fts(rowid, content) VALUES (new.id, new.content);
      END;
      CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON document_chunks BEGIN
        INSERT INTO document_chunks_fts(document_chunks_fts, rowid, content) VALUES('delete', old.id, old.content);
      END;
      CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE ON document_chunks BEGIN
        INSERT INTO document_chunks_fts(document_chunks_fts, rowid, content) VALUES('delete', old.id, old.content);
        INSERT INTO document_chunks_fts(rowid, content) VALUES (new.id, new.content);
      END;

      CREATE TABLE IF NOT EXISTS plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        version INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','validated')),
        content_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS modules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        description TEXT,
        ord INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS notions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        module_id INTEGER REFERENCES modules(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        summary TEXT,
        explanation TEXT,
        example TEXT,
        diagram TEXT,
        references_json TEXT,
        ord INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_notions_course ON notions(course_id, ord);

      CREATE TABLE IF NOT EXISTS notion_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notion_id INTEGER NOT NULL REFERENCES notions(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'non_commence' CHECK (status IN ('non_commence','etudie','a_revoir','maitrise')),
        mastery_score REAL NOT NULL DEFAULT 0,
        last_studied_at TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_id, notion_id)
      );

      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        notion_id INTEGER REFERENCES notions(id) ON DELETE SET NULL,
        type TEXT NOT NULL,
        label TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id, created_at);

      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        notion_id INTEGER REFERENCES notions(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('qcm','open','subnet','topology','troubleshooting','lab')),
        prompt TEXT NOT NULL,
        options_json TEXT,
        correct_json TEXT,
        criteria_json TEXT,
        points REAL NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS exercise_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        answer_json TEXT NOT NULL,
        score REAL NOT NULL DEFAULT 0,
        max_score REAL NOT NULL DEFAULT 1,
        feedback TEXT,
        ai_graded INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_attempts_user ON exercise_attempts(user_id, exercise_id);

      CREATE TABLE IF NOT EXISTS revisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notion_id INTEGER NOT NULL REFERENCES notions(id) ON DELETE CASCADE,
        due_at TEXT NOT NULL,
        reason TEXT,
        done INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS chat_threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        notion_id INTEGER REFERENCES notions(id) ON DELETE SET NULL,
        title TEXT NOT NULL DEFAULT 'Conversation',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id INTEGER NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
        content TEXT NOT NULL,
        sources_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS ai_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
        operation TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        cost_eur REAL NOT NULL DEFAULT 0,
        estimated INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON ai_usage(created_at);

      CREATE TABLE IF NOT EXISTS ai_reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        operation TEXT NOT NULL,
        reserved_eur REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','settled','released','failed')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        settled_at TEXT
      );

      CREATE TABLE IF NOT EXISTS budget_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        monthly_cap_eur REAL NOT NULL DEFAULT 10,
        margin_pct REAL NOT NULL DEFAULT 10,
        currency TEXT NOT NULL DEFAULT 'EUR',
        fx_rate REAL NOT NULL DEFAULT 1,
        period_start TEXT NOT NULL,
        alert_50 INTEGER NOT NULL DEFAULT 1,
        alert_80 INTEGER NOT NULL DEFAULT 1,
        alert_95 INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS budget_expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL,
        amount_eur REAL NOT NULL,
        category TEXT NOT NULL DEFAULT 'autre' CHECK (category IN ('fixe','autre','dev')),
        note TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        detail TEXT,
        ip TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS error_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL DEFAULT 'error',
        message TEXT NOT NULL,
        context_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS example_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        domain TEXT NOT NULL,
        description TEXT,
        storage_path TEXT,
        url TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','error')),
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status, id);
    `,
  },
  {
    version: 2,
    sql: `
      CREATE TABLE IF NOT EXISTS notion_notes (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notion_id INTEGER NOT NULL REFERENCES notions(id) ON DELETE CASCADE,
        content TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (user_id, notion_id)
      );
    `,
  },
  {
    version: 3,
    sql: `
      -- Corrige les plans générés avant le correctif : les exercices de module
      -- étaient dupliqués pour chaque notion. On conserve la première copie.
      DELETE FROM exercises
      WHERE id NOT IN (
        SELECT MIN(id) FROM exercises GROUP BY course_id, type, prompt
      );
    `,
  },
  {
    version: 4,
    sql: `
      CREATE TABLE IF NOT EXISTS notion_fiches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notion_id INTEGER NOT NULL REFERENCES notions(id) ON DELETE CASCADE,
        content_json TEXT NOT NULL,
        ai_generated INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_id, notion_id)
      );
    `,
  },
  {
    version: 5,
    sql: `
      -- Une notion ne peut être maîtrisée sans étude préalable. On annule les
      -- maîtrises attribuées sans aucune trace d'étude (ancienne logique).
      UPDATE notion_progress
      SET status = 'non_commence', mastery_score = 0
      WHERE status = 'maitrise' AND last_studied_at IS NULL;
    `,
  },
];

export function getDb(): DB {
  if (instance) return instance;
  ensureDirs();
  const db = new Database(config.dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  migrate(db);
  instance = db;
  return db;
}

function migrate(db: DB) {
  const current = (db.pragma("user_version", { simple: true }) as number) || 0;
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    const tx = db.transaction(() => {
      db.exec(migration.sql);
      db.pragma(`user_version = ${migration.version}`);
    });
    tx();
  }
}

export function migrateStandalone() {
  getDb();
}

export function closeDb() {
  if (instance) {
    instance.close();
    instance = null;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}
