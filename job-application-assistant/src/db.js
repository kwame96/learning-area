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

  migrateJobFacets(db);

  const row = db.prepare('SELECT id FROM profile WHERE id = 1').get();
  if (!row) {
    db.prepare(
      `INSERT INTO profile (id, links_json, master_profile_json, updated_at)
       VALUES (1, '[]', '{}', ?)`
    ).run(new Date().toISOString());
  }

  return db;
}

// Add classification columns and backfill existing rows. SQLite has no
// "ADD COLUMN IF NOT EXISTS", so check the table shape first.
function migrateJobFacets(database) {
  const cols = database
    .prepare('PRAGMA table_info(jobs)')
    .all()
    .map((c) => c.name);
  const adds = [];
  if (!cols.includes('experience_level')) adds.push('experience_level TEXT');
  if (!cols.includes('category')) adds.push('category TEXT');
  if (!cols.includes('job_type')) adds.push('job_type TEXT');
  for (const def of adds) database.exec(`ALTER TABLE jobs ADD COLUMN ${def}`);

  if (!adds.length) return;
  const { classify } = require('./services/jobClassify');
  const rows = database
    .prepare('SELECT id, role, description_text FROM jobs')
    .all();
  const upd = database.prepare(
    'UPDATE jobs SET experience_level=@e, category=@c, job_type=@t WHERE id=@id'
  );
  const tx = database.transaction((list) => {
    for (const r of list) {
      const f = classify({ role: r.role, descriptionText: r.description_text });
      upd.run({ id: r.id, e: f.experienceLevel, c: f.category, t: f.jobType });
    }
  });
  tx(rows);
}

function getDb() {
  return db || init();
}

module.exports = { init, getDb };
