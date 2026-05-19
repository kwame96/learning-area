'use strict';

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { config } = require('../config');
const profileRepo = require('../repositories/profileRepo');
const { parseResume, isAccepted } = require('../services/resumeParser');
const { validateProfile, ValidationError } = require('../lib/validation');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.paths.uploads),
  filename: (req, file, cb) => {
    const safe = path.basename(file.originalname).replace(/[^\w.\-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: config.limits.uploadBytes },
  fileFilter: (req, file, cb) => {
    if (isAccepted(file.originalname)) cb(null, true);
    else cb(new ValidationError('Only .pdf and .docx files are accepted'));
  },
});

router.get('/', (req, res) => {
  res.json(profileRepo.getProfile());
});

router.put('/', (req, res, next) => {
  try {
    const clean = validateProfile(req.body || {});
    res.json(profileRepo.saveProfile(clean));
  } catch (e) {
    next(e);
  }
});

router.post('/resume', upload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) throw new ValidationError('No file uploaded (field name: resume)');
    const { text, charCount } = await parseResume(req.file.path);
    const saved = profileRepo.saveResume(req.file.path, text);
    res.json({ charCount, resumeText: saved.resumeText });
  } catch (e) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, () => {});
    }
    next(e);
  }
});

// Manual paste fallback for scanned/unparseable resumes.
router.post('/resume-text', (req, res, next) => {
  try {
    const text = String((req.body && req.body.resumeText) || '').trim();
    if (text.length < config.limits.minResumeChars) {
      throw new ValidationError(
        `Resume text must be at least ${config.limits.minResumeChars} characters`
      );
    }
    const saved = profileRepo.saveResume(null, text);
    res.json({ charCount: text.length, resumeText: saved.resumeText });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
