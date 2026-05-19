'use strict';

const fs = require('fs');
const Database = require('better-sqlite3');
const { config } = require('./config');

let db;

function init() {
  if (db) return db;

  for (const dir of [config.paths.data, config.paths.uploads, config.paths.exports]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(config.paths.db);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      full_name TEXT,
      email TEXT,
      phone TEXT,
      location TEXT,
      links_json TEXT DEFAULT '[]',
      master_profile_json TEXT DEFAULT '{}',
      resume_original_path TEXT,
      resume_text TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT,
      role TEXT,
      job_url TEXT,
      source TEXT,
      description_text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'to_apply'
        CHECK (status IN ('to_apply','applied','interviewing','rejected','offer')),
      date_added TEXT NOT NULL,
      date_applied TEXT,
      notes TEXT,
      tailored_resume_text TEXT,
      cover_letter_text TEXT,
      ats_score INTEGER,
      matched_keywords_json TEXT DEFAULT '[]',
      missing_keywords_json TEXT DEFAULT '[]',
      tailor_notes TEXT,
      tailor_raw TEXT,
      checklist_json TEXT,
      last_tailored_at TEXT,
      tailor_model TEXT
    );
  `);

  const row = db.prepare('SELECT id FROM profile WHERE id = 1').get();
  if (!row) {
    db.prepare(
      `INSERT INTO profile (id, links_json, master_profile_json, updated_at)
       VALUES (1, '[]', '{}', ?)`
    ).run(new Date().toISOString());
  }

  return db;
}

function getDb() {
  return db || init();
}

module.exports = { init, getDb };
