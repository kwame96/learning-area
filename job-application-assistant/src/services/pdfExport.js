'use strict';

const PDFDocument = require('pdfkit');

// Renders plain text to a simple, ATS-friendly single-column PDF buffer.
function renderPdf(title, bodyText) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 54 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (title) {
      doc.fontSize(16).font('Helvetica-Bold').text(title);
      doc.moveDown(0.5);
    }
    doc.fontSize(10.5).font('Helvetica');

    const lines = String(bodyText || '').replace(/\r\n/g, '\n').split('\n');
    for (const line of lines) {
      if (line.trim() === '') {
        doc.moveDown(0.5);
      } else {
        doc.text(line, { align: 'left' });
      }
    }

    doc.end();
  });
}

module.exports = { renderPdf };
