'use strict';

// Best-effort classification of a job from its title + description.
// Heuristic only — used for filtering, never for fabricating anything.

const EXPERIENCE = [
  ['lead', /\b(principal|staff|lead|head of|director|vp|chief|architect)\b|\b(1[0-9]|[2-9][0-9])\+?\s*years?\b/],
  ['senior', /\b(senior|sr\.?|expert|advanced)\b|\b([6-9])\+?\s*years?\b/],
  ['entry', /\b(entry[\s-]?level|junior|jr\.?|intern(ship)?|graduate|new\s?grad|trainee|apprentice|early[\s-]career|no (prior )?experience|0[\s-]?2\s*years?|associate)\b/],
  ['mid', /\b(mid[\s-]?level|intermediate|[2-5]\+?\s*years?)\b/],
];

const CATEGORIES = [
  ['security', /\b(security|infosec|cyber|cybersecurity|penetration|pentest|appsec|soc analyst|siem|vulnerabilit|threat|incident response|grc|iam|ciso|red team|blue team)\b/],
  ['data', /\b(data scien|data analy|data engineer|machine learning|\bml\b|\bai\b|analytics|business intelligence|\bbi\b|statistic)\b/],
  ['software', /\b(software|developer|engineer|programmer|full[\s-]?stack|back[\s-]?end|front[\s-]?end|devops|sre|web develop|mobile develop|ios|android)\b/],
  ['it_support', /\b(it support|help[\s-]?desk|service desk|system admin|sysadmin|network admin|desktop support|technician|noc)\b/],
  ['design', /\b(designer|\bux\b|\bui\b|product design|graphic design|visual design)\b/],
  ['product', /\b(product manager|product owner|\bpm\b|program manager)\b/],
  ['marketing', /\b(marketing|seo|content|social media|growth|brand|copywrit)\b/],
  ['sales', /\b(sales|account executive|business development|\bbdr\b|\bsdr\b|account manager)\b/],
  ['finance', /\b(finance|accountant|accounting|financial analyst|bookkeep|auditor|payroll)\b/],
  ['operations', /\b(operations|logistics|supply chain|project manager|scrum master|coordinator)\b/],
  ['hr', /\b(human resources|\bhr\b|recruit|talent acquisition|people ops)\b/],
  ['healthcare', /\b(nurse|clinical|medical|healthcare|patient|physician|pharmac)\b/],
  ['customer', /\b(customer (success|service|support)|client support|call center)\b/],
];

const JOB_TYPES = [
  ['internship', /\b(intern|internship)\b/],
  ['part_time', /\bpart[\s-]?time\b/],
  ['contract', /\b(contract|contractor|freelance|c2c|1099|temporary contract)\b/],
  ['temporary', /\b(temporary|seasonal|temp\s)\b/],
];

function firstMatch(table, text, fallback) {
  for (const [label, re] of table) if (re.test(text)) return label;
  return fallback;
}

function classify({ role = '', descriptionText = '' } = {}) {
  const text = `${role}\n${descriptionText}`.toLowerCase();
  return {
    experienceLevel: firstMatch(EXPERIENCE, text, 'mid'),
    category: firstMatch(CATEGORIES, text, 'other'),
    jobType: firstMatch(JOB_TYPES, text, 'full_time'),
  };
}

const EXPERIENCE_LEVELS = ['entry', 'mid', 'senior', 'lead'];
const CATEGORY_VALUES = CATEGORIES.map(([k]) => k).concat('other');
const JOB_TYPE_VALUES = ['full_time', 'part_time', 'contract', 'internship', 'temporary'];

module.exports = {
  classify,
  EXPERIENCE_LEVELS,
  CATEGORY_VALUES,
  JOB_TYPE_VALUES,
};
