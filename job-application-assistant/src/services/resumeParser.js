'use strict';

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const { config } = require('../config');

const PDF_EXT = '.pdf';
const DOCX_EXT = '.docx';

async function extractPdfText(filePath) {
  // Official Mozilla pdf.js (maintained, patched for CVE-2024-4367). v4's
  // legacy build is ESM, so load it via dynamic import from this CJS module.
  // eval is disabled below as defense-in-depth against malicious PDFs.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjs.getDocument({
    data,
    useSystemFonts: true,
    isEvalSupported: false,
  }).promise;
  let out = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    out += content.items.map((it) => it.str).join(' ') + '\n';
  }
  await doc.cleanup();
  return out;
}

function isAccepted(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ext === PDF_EXT || ext === DOCX_EXT;
}

async function parseResume(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let text = '';

  if (ext === PDF_EXT) {
    text = (await extractPdfText(filePath)).trim();
  } else if (ext === DOCX_EXT) {
    const { value } = await mammoth.extractRawText({ path: filePath });
    text = (value || '').trim();
  } else {
    const err = new Error('Only .pdf and .docx resumes are supported');
    err.statusCode = 400;
    throw err;
  }

  if (text.length < config.limits.minResumeChars) {
    const err = new Error(
      'Could not extract enough text from this file (it may be a scanned image). Paste your resume text manually instead.'
    );
    err.statusCode = 422;
    throw err;
  }

  return { text, charCount: text.length };
}

module.exports = { parseResume, isAccepted };
