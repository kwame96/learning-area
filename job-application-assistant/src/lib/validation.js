'use strict';

const STATUSES = ['to_apply', 'applied', 'interviewing', 'rejected', 'offer'];

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

function asString(v, max = 20000) {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') throw new ValidationError('Expected a string value');
  return v.slice(0, max);
}

function validateProfile(body) {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Profile must be an object');
  }
  const mp = body.masterProfile;
  if (mp !== undefined && (typeof mp !== 'object' || mp === null || Array.isArray(mp))) {
    throw new ValidationError('masterProfile must be an object');
  }
  if (body.links !== undefined && !Array.isArray(body.links)) {
    throw new ValidationError('links must be an array');
  }
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    throw new ValidationError('email is not valid');
  }
  return {
    fullName: asString(body.fullName, 200),
    email: asString(body.email, 200),
    phone: asString(body.phone, 60),
    location: asString(body.location, 200),
    links: (body.links || []).map((l) => asString(l, 500)),
    masterProfile: mp || {},
  };
}

function validateJobInput(body) {
  const description = asString(body && body.descriptionText, 40000).trim();
  if (!description) {
    throw new ValidationError('descriptionText is required');
  }
  if (body.jobUrl && !/^https?:\/\//i.test(body.jobUrl)) {
    throw new ValidationError('jobUrl must start with http:// or https://');
  }
  return {
    company: asString(body.company, 200).trim(),
    role: asString(body.role, 200).trim(),
    jobUrl: asString(body.jobUrl, 1000).trim(),
    source: asString(body.source, 200).trim(),
    descriptionText: description,
  };
}

function validateStatus(status) {
  if (!STATUSES.includes(status)) {
    throw new ValidationError(`status must be one of: ${STATUSES.join(', ')}`);
  }
  return status;
}

// Splits a bulk-paste blob into job objects.
// Default delimiter is a line containing only "---".
function parseBulk(text, delimiter = '---') {
  const blob = asString(text, 200000);
  if (!blob.trim()) throw new ValidationError('Bulk text is empty');
  const delim = (delimiter || '---').trim() || '---';
  const blocks = blob
    .split(new RegExp(`^\\s*${escapeRegex(delim)}\\s*$`, 'm'))
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks.map((block) => {
    const lines = block.split('\n');
    const first = lines[0].trim();
    const m = first.match(/^(.+?)\s+[-–—|@:]\s+(.+)$/);
    if (m && lines.length > 1) {
      return {
        company: m[1].trim().slice(0, 200),
        role: m[2].trim().slice(0, 200),
        descriptionText: lines.slice(1).join('\n').trim(),
      };
    }
    return { company: '', role: '', descriptionText: block };
  });
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  STATUSES,
  ValidationError,
  validateProfile,
  validateJobInput,
  validateStatus,
  parseBulk,
};
