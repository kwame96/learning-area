'use strict';

// Rule-based, dependency-free tailoring. No AI, no key, no network.
// STRICT no-fabrication: it only surfaces/reorders content that already
// exists in the candidate's resume/profile and computes keyword overlap.

const STOPWORDS = new Set(
  ('a an the and or but if then else for to of in on at by with from as is are ' +
    'be been being this that these those we you they it our your their will ' +
    'have has had do does did not no yes can may must should would could who ' +
    'whom which what when where why how all any each more most other some such ' +
    'than too very just into over under again further once here there about ' +
    'role job work team years year experience strong ability able including ' +
    'etc per via using use used new across within among also plus across ' +
    'responsibilities requirements qualifications preferred required nice ' +
    'candidate ideal looking seeking join help build company position ' +
    'need needs want wants good great well make made get got like likes ' +
    'looking seeking strong excellent proven track record environment')
    .split(/\s+/)
);

function tokens(text) {
  const out = [];
  const re = /[a-zA-Z][a-zA-Z0-9+.#-]{1,}/g;
  let m;
  while ((m = re.exec(text || ''))) {
    const w = m[0].toLowerCase().replace(/[.\-]+$/, '');
    if (w.length >= 3 && !STOPWORDS.has(w)) out.push(w);
  }
  return out;
}

function rankedKeywords(text, limit) {
  const freq = new Map();
  for (const t of tokens(text)) freq.set(t, (freq.get(t) || 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .slice(0, limit);
}

function profileToText(masterProfile) {
  if (!masterProfile) return '';
  if (typeof masterProfile === 'string') return masterProfile;
  try {
    return JSON.stringify(masterProfile);
  } catch {
    return '';
  }
}

function tailor({ masterProfile, resumeText, job }) {
  const haystack = `${resumeText || ''}\n${profileToText(masterProfile)}`
    .toLowerCase();

  const candidates = rankedKeywords(job.descriptionText, 50);
  const matched = [];
  const missing = [];
  for (const k of candidates) {
    (haystack.includes(k) ? matched : missing).push(k);
  }
  const considered = matched.length + missing.length;
  const score = considered
    ? Math.max(0, Math.min(100, Math.round((matched.length / considered) * 100)))
    : 0;

  const name =
    (masterProfile &&
      typeof masterProfile === 'object' &&
      (masterProfile.fullName || masterProfile.name)) ||
    '';

  const realResume =
    (resumeText && resumeText.trim()) ||
    profileToText(masterProfile) ||
    '(No resume text on file — add one in Setup.)';

  const focus = matched.slice(0, 12).join(', ') || '(no direct keyword overlap found)';

  const tailored_resume =
    `=== TAILORED FOR: ${job.role || 'role'} @ ${job.company || 'company'} ===\n` +
    `Focus areas drawn from your existing background: ${focus}\n` +
    `(Rule-based pass — your real resume content is unchanged below. ` +
    `Reorder/trim it yourself to lead with the focus areas.)\n\n` +
    `${realResume}`;

  const top = matched.slice(0, 5).join(', ');
  const cover_letter =
    `Dear ${job.company || 'Hiring'} Team,\n\n` +
    `I'm writing to apply for the ${job.role || 'open'} role. ` +
    (top
      ? `My background already includes ${top}, which overlaps with what this role calls for.`
      : `I'd welcome the chance to show how my background fits this role.`) +
    `\n\nI've attached a resume drawn from my genuine experience and would be glad ` +
    `to discuss it further.\n\nSincerely,\n${name || '[Your name]'}`;

  return {
    tailored_resume,
    cover_letter,
    ats_score: score,
    matched_keywords: matched.slice(0, 40),
    missing_keywords: missing.slice(0, 20),
    notes:
      'Generated offline by rule-based keyword matching — NOT AI. It only ' +
      'surfaces your existing content and estimates overlap; nothing was ' +
      'invented. Edit before sending, or switch LLM_PROVIDER to ollama/groq/' +
      'anthropic for higher-quality drafting.',
    model: 'offline (rule-based)',
    raw: '',
  };
}

module.exports = { tailor };
