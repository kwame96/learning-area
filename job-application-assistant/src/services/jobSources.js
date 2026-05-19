'use strict';

// Pluggable job-source layer. Only sources that permit programmatic access
// belong here — never scrape boards whose terms forbid it. Each adapter
// returns a normalized array: { company, role, jobUrl, source, descriptionText }.
// Live fetching depends on the runtime's outbound network policy.

function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'job-application-assistant' },
  });
  if (!res.ok) throw new Error(`Source returned HTTP ${res.status}`);
  return res.json();
}

const ADAPTERS = {
  // https://remotive.com/api/remote-jobs — public API intended for consumption.
  remotive: {
    label: 'Remotive (remote jobs)',
    async fetch({ query, limit }) {
      const u = new URL('https://remotive.com/api/remote-jobs');
      if (query) u.searchParams.set('search', query);
      if (limit) u.searchParams.set('limit', String(limit));
      const data = await fetchJson(u.toString());
      return (data.jobs || []).map((j) => ({
        company: j.company_name || '',
        role: j.title || '',
        jobUrl: j.url || '',
        source: 'remotive',
        descriptionText: stripHtml(j.description),
      }));
    },
  },
  // https://www.arbeitnow.com/api/job-board-api — public job-board feed.
  arbeitnow: {
    label: 'Arbeitnow (job board feed)',
    async fetch({ query }) {
      const data = await fetchJson('https://www.arbeitnow.com/api/job-board-api');
      let rows = (data.data || []).map((j) => ({
        company: j.company_name || '',
        role: j.title || '',
        jobUrl: j.url || '',
        source: 'arbeitnow',
        descriptionText: stripHtml(j.description),
      }));
      if (query) {
        const q = query.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.role.toLowerCase().includes(q) ||
            r.company.toLowerCase().includes(q)
        );
      }
      return rows;
    },
  },
};

function listSources() {
  return Object.entries(ADAPTERS).map(([id, a]) => ({ id, label: a.label }));
}

async function fetchFromSource(sourceId, opts = {}) {
  const adapter = ADAPTERS[sourceId];
  if (!adapter) {
    const e = new Error(`Unknown source "${sourceId}"`);
    e.statusCode = 400;
    throw e;
  }
  try {
    const limit = Math.min(Number(opts.limit) || 50, 200);
    return await adapter.fetch({ query: opts.query, limit });
  } catch (e) {
    const err = new Error(
      `Could not reach ${sourceId}. Live sources need outbound network; ` +
        `if your environment blocks it, use Import instead. (${e.message})`
    );
    err.statusCode = 502;
    throw err;
  }
}

// Always-offline path: parse pasted JSON array or CSV into job inputs.
function parseImport(text, format) {
  const raw = String(text || '').trim();
  if (!raw) {
    const e = new Error('Import text is empty');
    e.statusCode = 400;
    throw e;
  }
  const fmt = format === 'csv' ? 'csv' : raw[0] === '[' ? 'json' : 'csv';

  if (fmt === 'json') {
    let arr;
    try {
      arr = JSON.parse(raw);
    } catch {
      const e = new Error('Import is not valid JSON');
      e.statusCode = 400;
      throw e;
    }
    if (!Array.isArray(arr)) {
      const e = new Error('JSON import must be an array of jobs');
      e.statusCode = 400;
      throw e;
    }
    return arr.map((j) => ({
      company: String(j.company || j.company_name || ''),
      role: String(j.role || j.title || ''),
      jobUrl: String(j.jobUrl || j.url || ''),
      source: String(j.source || 'import'),
      descriptionText: stripHtml(j.descriptionText || j.description || ''),
    }));
  }

  // CSV: header row with company,role,jobUrl,description (order-flexible).
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  const headers = splitCsv(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (names) => headers.findIndex((h) => names.includes(h));
  const ci = idx(['company', 'company_name']);
  const ri = idx(['role', 'title']);
  const ui = idx(['joburl', 'url', 'link']);
  const di = idx(['description', 'descriptiontext', 'desc']);
  return lines.slice(1).map((line) => {
    const c = splitCsv(line);
    return {
      company: ci >= 0 ? (c[ci] || '').trim() : '',
      role: ri >= 0 ? (c[ri] || '').trim() : '',
      jobUrl: ui >= 0 ? (c[ui] || '').trim() : '',
      source: 'import',
      descriptionText: stripHtml(di >= 0 ? c[di] : line),
    };
  });
}

function splitCsv(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

module.exports = { listSources, fetchFromSource, parseImport };
