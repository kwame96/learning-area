'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ROOT = path.join(__dirname, '..');

const config = {
  port: Number(process.env.PORT) || 3000,
  // Active LLM provider: 'ollama' (free, local), 'groq' (free, API),
  // or 'anthropic' (Claude, paid).
  llmProvider: (process.env.LLM_PROVIDER || 'groq').trim().toLowerCase(),

  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',

  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',

  ollamaUrl: (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, ''),
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2:3b',

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

const PLACEHOLDERS = new Set([
  'sk-ant-your-key-here',
  'gsk-your-groq-key-here',
  '',
]);

function clean(v) {
  return (v || '').trim();
}

// Is the active provider ready? Ollama is local and needs no key
// (reachability is checked at call time instead).
function hasApiKey() {
  if (config.llmProvider === 'offline' || config.llmProvider === 'ollama')
    return true;
  if (config.llmProvider === 'anthropic') {
    const k = clean(config.anthropicApiKey);
    return Boolean(k) && !PLACEHOLDERS.has(k);
  }
  const k = clean(config.groqApiKey);
  return Boolean(k) && !PLACEHOLDERS.has(k);
}

function activeModel() {
  if (config.llmProvider === 'offline') return 'offline (rule-based)';
  if (config.llmProvider === 'ollama') return config.ollamaModel;
  if (config.llmProvider === 'anthropic') return config.claudeModel;
  return config.groqModel;
}

module.exports = { config, hasApiKey, activeModel };
