'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ROOT = path.join(__dirname, '..');

const config = {
  port: Number(process.env.PORT) || 3000,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
  paths: {
    root: ROOT,
    data: path.join(ROOT, 'data'),
    uploads: path.join(ROOT, 'uploads'),
    exports: path.join(ROOT, 'exports'),
    db: path.join(ROOT, 'data', 'app.db'),
    public: path.join(ROOT, 'public'),
  },
  limits: {
    uploadBytes: 10 * 1024 * 1024, // 10 MB
    jsonBytes: '2mb',
    minResumeChars: 100,
  },
};

const PLACEHOLDER_KEY = 'sk-ant-your-key-here';

function hasApiKey() {
  const k = (config.anthropicApiKey || '').trim();
  return Boolean(k) && k !== PLACEHOLDER_KEY;
}

module.exports = { config, hasApiKey };
