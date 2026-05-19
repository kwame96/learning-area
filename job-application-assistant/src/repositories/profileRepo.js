'use strict';

const { getDb } = require('../db');

function getProfile() {
  const row = getDb().prepare('SELECT * FROM profile WHERE id = 1').get();
  return {
    fullName: row.full_name || '',
    email: row.email || '',
    phone: row.phone || '',
    location: row.location || '',
    links: safeParse(row.links_json, []),
    masterProfile: safeParse(row.master_profile_json, {}),
    resumeOriginalPath: row.resume_original_path || null,
    resumeText: row.resume_text || '',
    updatedAt: row.updated_at,
  };
}

function saveProfile(p) {
  getDb()
    .prepare(
      `UPDATE profile SET
        full_name = @fullName,
        email = @email,
        phone = @phone,
        location = @location,
        links_json = @links,
        master_profile_json = @masterProfile,
        updated_at = @updatedAt
       WHERE id = 1`
    )
    .run({
      fullName: p.fullName || '',
      email: p.email || '',
      phone: p.phone || '',
      location: p.location || '',
      links: JSON.stringify(p.links || []),
      masterProfile: JSON.stringify(p.masterProfile || {}),
      updatedAt: new Date().toISOString(),
    });
  return getProfile();
}

function saveResume(originalPath, resumeText) {
  getDb()
    .prepare(
      `UPDATE profile SET resume_original_path = ?, resume_text = ?, updated_at = ? WHERE id = 1`
    )
    .run(originalPath, resumeText, new Date().toISOString());
  return getProfile();
}

function safeParse(s, fallback) {
  try {
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
}

module.exports = { getProfile, saveProfile, saveResume };
