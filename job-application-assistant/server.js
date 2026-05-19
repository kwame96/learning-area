'use strict';

const express = require('express');
const { config, hasApiKey } = require('./src/config');
const { init } = require('./src/db');

init();

const app = express();
app.use(express.json({ limit: config.limits.jsonBytes }));
app.use(express.urlencoded({ extended: false, limit: config.limits.jsonBytes }));
app.use(express.static(config.paths.public));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, apiKeyConfigured: hasApiKey(), model: config.claudeModel });
});

app.use('/api/profile', require('./src/routes/profile.routes'));
app.use('/api/jobs', require('./src/routes/jobs.routes'));
app.use('/api', require('./src/routes/sources.routes'));
app.use('/api', require('./src/routes/tailor.routes'));
app.use('/api', require('./src/routes/export.routes'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Central error handler: never leak stack traces or the API key.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const hasExplicitStatus = Number.isInteger(err.statusCode);
  const status =
    err.statusCode || (err.name === 'MulterError' ? 400 : 500);
  if (status >= 500) console.error(err);
  // Show the message for client errors and for deliberately-set 5xx
  // (e.g. 502 bad model JSON, 503 missing API key). Mask only unexpected 500s.
  const message =
    status >= 500 && !hasExplicitStatus
      ? 'Internal server error'
      : err.message || 'Request failed';
  res.status(status).json({ error: message });
});

app.listen(config.port, () => {
  console.log(`Job Application Assistant running at http://localhost:${config.port}`);
  if (!hasApiKey()) {
    console.warn(
      'WARNING: ANTHROPIC_API_KEY not set — tailoring is disabled until you add it to .env'
    );
  }
});
