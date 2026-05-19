'use strict';

const { config, hasApiKey, activeModel } = require('../config');
const { buildCachedSystemText, buildJobUserText } = require('../lib/prompts');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withBackoff(fn, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const s = (e && (e.status || e.statusCode)) || 0;
      const retryable = s === 429 || (s >= 500 && s < 600);
      if (!retryable || i === attempts - 1) break;
      await sleep(2000 * 2 ** i);
    }
  }
  throw lastErr;
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const a = text.indexOf('{');
    const b = text.lastIndexOf('}');
    if (a !== -1 && b > a) {
      try {
        return JSON.parse(text.slice(a, b + 1));
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

function missingKeyError() {
  const provider = config.llmProvider === 'anthropic' ? 'anthropic' : 'groq';
  const envVar = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GROQ_API_KEY';
  const err = new Error(
    `${envVar} is not set (LLM_PROVIDER=${provider}). Add it to job-application-assistant/.env`
  );
  err.statusCode = 503;
  return err;
}

// --- Anthropic (Claude) provider ---
let anthropicClient;
async function anthropicComplete(systemText, messages) {
  if (!anthropicClient) {
    const Anthropic = require('@anthropic-ai/sdk');
    anthropicClient = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  const msg = await withBackoff(() =>
    anthropicClient.messages.create({
      model: config.claudeModel,
      max_tokens: 3200,
      // Cached prefix: identical across every job in a run (~90% input cut).
      system: [
        {
          type: 'text',
          text: systemText,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    })
  );
  return (msg.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

// --- Groq provider (OpenAI-compatible REST; no extra dependency) ---
async function groqComplete(systemText, messages) {
  const body = {
    model: config.groqModel,
    max_tokens: 3200,
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: systemText }, ...messages],
  };
  const doCall = async () => {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.groqApiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      const e = new Error(`Groq HTTP ${res.status}: ${txt.slice(0, 300)}`);
      e.status = res.status;
      throw e;
    }
    return res.json();
  };
  const data = await withBackoff(doCall);
  return ((data.choices && data.choices[0]?.message?.content) || '').trim();
}

function getProvider() {
  if (!hasApiKey()) throw missingKeyError();
  return config.llmProvider === 'anthropic' ? anthropicComplete : groqComplete;
}

async function tailor({ masterProfile, resumeText, job }) {
  const complete = getProvider();
  const model = activeModel();
  const systemText = buildCachedSystemText(masterProfile, resumeText);
  const baseMessages = [{ role: 'user', content: buildJobUserText(job) }];

  let raw = await complete(systemText, baseMessages);
  let parsed = tryParseJson(raw);

  if (!parsed) {
    const repair = [
      ...baseMessages,
      { role: 'assistant', content: raw || '(empty)' },
      {
        role: 'user',
        content:
          'That was not valid JSON. Reply again with ONLY the single JSON object from the output contract — no prose, no markdown fences.',
      },
    ];
    raw = await complete(systemText, repair);
    parsed = tryParseJson(raw);
  }

  if (!parsed) {
    const err = new Error(
      `${config.llmProvider} did not return valid JSON after a retry.`
    );
    err.statusCode = 502;
    err.raw = raw;
    throw err;
  }

  const result = normalizeResult(parsed, model);
  result.raw = raw;
  return result;
}

module.exports = { tailor };
