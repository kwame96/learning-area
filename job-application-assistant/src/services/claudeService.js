'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const { config, hasApiKey } = require('../config');
const { buildCachedSystemText, buildJobUserText } = require('../lib/prompts');

let client;
function getClient() {
  if (!hasApiKey()) {
    const err = new Error(
      'ANTHROPIC_API_KEY is not set. Add it to job-application-assistant/.env'
    );
    err.statusCode = 503;
    throw err;
  }
  if (!client) client = new Anthropic({ apiKey: config.anthropicApiKey });
  return client;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callWithBackoff(makeCall, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await makeCall();
    } catch (e) {
      lastErr = e;
      const status = e && e.status;
      const retryable = status === 429 || (status >= 500 && status < 600);
      if (!retryable || i === attempts - 1) break;
      await sleep(2000 * 2 ** i);
    }
  }
  throw lastErr;
}

function extractText(message) {
  return (message.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeResult(parsed, model) {
  let score = Number(parsed.ats_score);
  if (!Number.isFinite(score)) score = null;
  else score = Math.max(0, Math.min(100, Math.round(score)));
  const arr = (v) =>
    Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean).slice(0, 100) : [];
  return {
    tailored_resume: String(parsed.tailored_resume || ''),
    cover_letter: String(parsed.cover_letter || ''),
    ats_score: score,
    matched_keywords: arr(parsed.matched_keywords),
    missing_keywords: arr(parsed.missing_keywords),
    notes: String(parsed.notes || ''),
    model,
  };
}

async function tailor({ masterProfile, resumeText, job }) {
  const c = getClient();
  const model = config.claudeModel;

  // Cached prefix: identical across every job in a run (~90% input-cost cut).
  const system = [
    {
      type: 'text',
      text: buildCachedSystemText(masterProfile, resumeText),
      cache_control: { type: 'ephemeral' },
    },
  ];

  const baseMessages = [
    { role: 'user', content: buildJobUserText(job) },
  ];

  const request = (messages) =>
    callWithBackoff(() =>
      c.messages.create({
        model,
        max_tokens: 3200,
        system,
        messages,
      })
    );

  let message = await request(baseMessages);
  let raw = extractText(message);
  let parsed = tryParseJson(raw);

  if (!parsed) {
    // One repair retry: feed the bad output back and demand strict JSON.
    const repairMessages = [
      ...baseMessages,
      { role: 'assistant', content: raw || '(empty)' },
      {
        role: 'user',
        content:
          'That was not valid JSON. Reply again with ONLY the single JSON object from the output contract — no prose, no markdown fences.',
      },
    ];
    message = await request(repairMessages);
    raw = extractText(message);
    parsed = tryParseJson(raw);
  }

  if (!parsed) {
    const err = new Error('Claude did not return valid JSON after a retry.');
    err.statusCode = 502;
    err.raw = raw;
    throw err;
  }

  const result = normalizeResult(parsed, model);
  result.raw = raw;
  return result;
}

module.exports = { tailor };
