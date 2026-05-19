'use strict';

const express = require('express');
const jobRepo = require('../repositories/jobRepo');
const { validateJobInput } = require('../lib/validation');
const {
  listSources,
  fetchFromSource,
  parseImport,
} = require('../services/jobSources');

const router = express.Router();

router.get('/sources', (req, res) => {
  res.json(listSources());
});

function stageRows(rows) {
  const valid = [];
  for (const r of rows) {
    if (!r.descriptionText || !r.descriptionText.trim()) continue;
    try {
      valid.push(validateJobInput(r));
    } catch {
      /* skip rows that fail validation */
    }
  }
  const { created, skipped } = jobRepo.createJobsDeduped(valid);
  return { added: created.length, skipped, jobs: created };
}

router.post('/jobs/from-source', async (req, res, next) => {
  try {
    const { source, query, limit } = req.body || {};
    const rows = await fetchFromSource(source, { query, limit });
    res.status(201).json(stageRows(rows));
  } catch (e) {
    next(e);
  }
});

router.post('/jobs/import', (req, res, next) => {
  try {
    const { text, format } = req.body || {};
    const rows = parseImport(text, format);
    res.status(201).json(stageRows(rows));
  } catch (e) {
    next(e);
  }
});

module.exports = router;
