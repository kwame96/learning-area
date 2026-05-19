'use strict';

const express = require('express');
const jobRepo = require('../repositories/jobRepo');
const profileRepo = require('../repositories/profileRepo');
const { tailor } = require('../services/claudeService');
const { ValidationError } = require('../lib/validation');

const router = express.Router();

function loadProfileOrThrow() {
  const profile = profileRepo.getProfile();
  const hasProfile =
    profile.resumeText ||
    (profile.masterProfile && Object.keys(profile.masterProfile).length);
  if (!hasProfile) {
    throw new ValidationError(
      'Save a master profile or upload a resume before tailoring.'
    );
  }
  return profile;
}

async function tailorOne(job, profile) {
  const result = await tailor({
    masterProfile: profile.masterProfile,
    resumeText: profile.resumeText,
    job,
  });
  return jobRepo.saveTailorResult(job.id, result);
}

router.post('/jobs/:id/tailor', async (req, res, next) => {
  try {
    const job = jobRepo.getJob(Number(req.params.id));
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const profile = loadProfileOrThrow();
    res.json(await tailorOne(job, profile));
  } catch (e) {
    next(e);
  }
});

// Tailor all jobs still in "to_apply" that have not been tailored yet.
// Sequential with small pacing so the cached prompt prefix stays warm and
// rate limits are respected.
router.post('/jobs/tailor-pending', async (req, res, next) => {
  try {
    const profile = loadProfileOrThrow();
    const pending = jobRepo
      .listJobs({ status: 'to_apply' })
      .filter((j) => !j.lastTailoredAt);

    const results = [];
    for (const job of pending) {
      try {
        const updated = await tailorOne(job, profile);
        results.push({ id: job.id, ok: true, atsScore: updated.atsScore });
      } catch (e) {
        results.push({ id: job.id, ok: false, error: e.message });
      }
    }
    res.json({ processed: results.length, results });
  } catch (e) {
    next(e);
  }
});

// Batch: generate tailored docs for an explicit list of selected job ids.
// Sequential pacing keeps the cached prompt prefix warm across the run.
router.post('/jobs/tailor-batch', async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids : [];
    if (!ids.length) {
      throw new ValidationError('Provide an array of job ids to tailor');
    }
    const profile = loadProfileOrThrow();
    const results = [];
    for (const rawId of ids) {
      const job = jobRepo.getJob(Number(rawId));
      if (!job) {
        results.push({ id: rawId, ok: false, error: 'not found' });
        continue;
      }
      try {
        const updated = await tailorOne(job, profile);
        results.push({ id: job.id, ok: true, atsScore: updated.atsScore });
      } catch (e) {
        results.push({ id: job.id, ok: false, error: e.message });
      }
    }
    res.json({ processed: results.length, results });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
