'use strict';

const express = require('express');
const jobRepo = require('../repositories/jobRepo');
const {
  validateJobInput,
  validateStatus,
  parseBulk,
  ValidationError,
} = require('../lib/validation');

const router = express.Router();

router.get('/', (req, res, next) => {
  try {
    const { status, search } = req.query;
    if (status) validateStatus(status);
    res.json(jobRepo.listJobs({ status, search }));
  } catch (e) {
    next(e);
  }
});

router.post('/', (req, res, next) => {
  try {
    const clean = validateJobInput(req.body || {});
    res.status(201).json(jobRepo.createJob(clean));
  } catch (e) {
    next(e);
  }
});

router.post('/bulk', (req, res, next) => {
  try {
    const { text, delimiter } = req.body || {};
    const parsed = parseBulk(text, delimiter);
    const created = [];
    for (const p of parsed) {
      if (!p.descriptionText || !p.descriptionText.trim()) continue;
      created.push(jobRepo.createJob(validateJobInput(p)));
    }
    if (!created.length) {
      throw new ValidationError('No valid job blocks were found in the bulk text');
    }
    res.status(201).json({ count: created.length, jobs: created });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const job = jobRepo.getJob(Number(req.params.id));
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', (req, res, next) => {
  try {
    const patch = req.body || {};
    if (patch.status !== undefined) validateStatus(patch.status);
    if (patch.checklist !== undefined && !Array.isArray(patch.checklist)) {
      throw new ValidationError('checklist must be an array');
    }
    const updated = jobRepo.updateJob(Number(req.params.id), patch);
    if (!updated) return res.status(404).json({ error: 'Job not found' });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const ok = jobRepo.deleteJob(Number(req.params.id));
    if (!ok) return res.status(404).json({ error: 'Job not found' });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

module.exports = router;
