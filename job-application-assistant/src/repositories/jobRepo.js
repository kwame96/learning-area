'use strict';

const { getDb } = require('../db');
const { classify } = require('../services/jobClassify');

const DEFAULT_CHECKLIST = [
  { label: 'Reviewed tailored resume line-by-line for accuracy', done: false },
  { label: 'Reviewed cover letter', done: false },
  { label: 'Exported PDFs', done: false },
  { label: 'Submitted application on company site', done: false },
];

function rowToJob(r) {
  if (!r) return null;
  return {
    id: r.id,
    company: r.company || '',
    role: r.role || '',
    jobUrl: r.job_url || '',
    source: r.source || '',
    descriptionText: r.description_text || '',
    experienceLevel: r.experience_level || 'mid',
    category: r.category || 'other',
    jobType: r.job_type || 'full_time',
    status: r.status,
    dateAdded: r.date_added,
    dateApplied: r.date_applied,
    notes: r.notes || '',
    tailoredResumeText: r.tailored_resume_text || '',
    coverLetterText: r.cover_letter_text || '',
    atsScore: r.ats_score,
    matchedKeywords: safeParse(r.matched_keywords_json, []),
    missingKeywords: safeParse(r.missing_keywords_json, []),
    tailorNotes: r.tailor_notes || '',
    tailorRaw: r.tailor_raw || '',
    checklist: safeParse(r.checklist_json, DEFAULT_CHECKLIST),
    lastTailoredAt: r.last_tailored_at,
    tailorModel: r.tailor_model,
  };
}

function listJobs({ status, search, experienceLevel, category, jobType } = {}) {
  let sql = 'SELECT * FROM jobs';
  const where = [];
  const params = {};
  if (status) {
    where.push('status = @status');
    params.status = status;
  }
  if (experienceLevel) {
    where.push('experience_level = @exp');
    params.exp = experienceLevel;
  }
  if (category) {
    where.push('category = @cat');
    params.cat = category;
  }
  if (jobType) {
    where.push('job_type = @jt');
    params.jt = jobType;
  }
  if (search) {
    where.push('(company LIKE @q OR role LIKE @q OR description_text LIKE @q)');
    params.q = `%${search}%`;
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY date_added DESC, id DESC';
  return getDb().prepare(sql).all(params).map(rowToJob);
}

function getJob(id) {
  return rowToJob(getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(id));
}

function createJob(job) {
  const f = classify({
    role: job.role,
    descriptionText: job.descriptionText,
  });
  const info = getDb()
    .prepare(
      `INSERT INTO jobs (company, role, job_url, source, description_text,
         experience_level, category, job_type, status, date_added, checklist_json)
       VALUES (@company, @role, @jobUrl, @source, @descriptionText,
         @exp, @cat, @jt, 'to_apply', @dateAdded, @checklist)`
    )
    .run({
      company: job.company || '',
      role: job.role || '',
      jobUrl: job.jobUrl || '',
      source: job.source || '',
      descriptionText: job.descriptionText,
      exp: f.experienceLevel,
      cat: f.category,
      jt: f.jobType,
      dateAdded: new Date().toISOString(),
      checklist: JSON.stringify(DEFAULT_CHECKLIST),
    });
  return getJob(info.lastInsertRowid);
}

const PATCHABLE = {
  company: 'company',
  role: 'role',
  jobUrl: 'job_url',
  source: 'source',
  descriptionText: 'description_text',
  status: 'status',
  notes: 'notes',
};

function updateJob(id, patch) {
  const existing = getJob(id);
  if (!existing) return null;

  const sets = [];
  const params = { id };
  for (const [key, col] of Object.entries(PATCHABLE)) {
    if (patch[key] !== undefined) {
      sets.push(`${col} = @${key}`);
      params[key] = patch[key];
    }
  }
  if (patch.checklist !== undefined) {
    sets.push('checklist_json = @checklist');
    params.checklist = JSON.stringify(patch.checklist);
  }
  if (patch.status === 'applied' && !existing.dateApplied) {
    sets.push('date_applied = @dateApplied');
    params.dateApplied = new Date().toISOString();
  }
  if (!sets.length) return existing;

  getDb()
    .prepare(`UPDATE jobs SET ${sets.join(', ')} WHERE id = @id`)
    .run(params);
  return getJob(id);
}

function saveTailorResult(id, result) {
  getDb()
    .prepare(
      `UPDATE jobs SET
        tailored_resume_text = @resume,
        cover_letter_text = @cover,
        ats_score = @score,
        matched_keywords_json = @matched,
        missing_keywords_json = @missing,
        tailor_notes = @notes,
        tailor_raw = @raw,
        last_tailored_at = @at,
        tailor_model = @model
       WHERE id = @id`
    )
    .run({
      id,
      resume: result.tailored_resume || '',
      cover: result.cover_letter || '',
      score: Number.isFinite(result.ats_score) ? result.ats_score : null,
      matched: JSON.stringify(result.matched_keywords || []),
      missing: JSON.stringify(result.missing_keywords || []),
      notes: result.notes || '',
      raw: result.raw || '',
      at: new Date().toISOString(),
      model: result.model || '',
    });
  return getJob(id);
}

// Insert many jobs, skipping ones whose jobUrl already exists.
function createJobsDeduped(list) {
  const created = [];
  let skipped = 0;
  const findByUrl = getDb().prepare(
    "SELECT id FROM jobs WHERE job_url = ? AND job_url <> ''"
  );
  const tx = getDb().transaction((rows) => {
    for (const r of rows) {
      if (r.jobUrl && findByUrl.get(r.jobUrl)) {
        skipped++;
        continue;
      }
      created.push(createJob(r));
    }
  });
  tx(list);
  return { created, skipped };
}

function deleteJob(id) {
  return getDb().prepare('DELETE FROM jobs WHERE id = ?').run(id).changes > 0;
}

function safeParse(s, fallback) {
  try {
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
}

module.exports = {
  listJobs,
  getJob,
  createJob,
  createJobsDeduped,
  updateJob,
  saveTailorResult,
  deleteJob,
  DEFAULT_CHECKLIST,
};
