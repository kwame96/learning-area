'use strict';

const express = require('express');
const jobRepo = require('../repositories/jobRepo');
const { renderPdf } = require('../services/pdfExport');

const router = express.Router();

router.get('/jobs/:id/export', async (req, res, next) => {
  try {
    const job = jobRepo.getJob(Number(req.params.id));
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const doc = req.query.doc === 'cover' ? 'cover' : 'resume';
    const body =
      doc === 'cover' ? job.coverLetterText : job.tailoredResumeText;
    if (!body) {
      return res
        .status(409)
        .json({ error: `No tailored ${doc} yet. Run "Tailor" first.` });
    }

    const slug = `${job.company || 'job'}_${job.role || 'role'}`
      .replace(/[^\w]+/g, '-')
      .slice(0, 60);
    const title =
      doc === 'cover'
        ? `Cover Letter - ${job.role || ''} ${job.company || ''}`.trim()
        : `Resume - ${job.role || ''} ${job.company || ''}`.trim();

    const pdf = await renderPdf(title, body);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${doc}-${slug}.pdf"`
    );
    res.send(pdf);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
