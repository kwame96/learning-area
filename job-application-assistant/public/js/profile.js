'use strict';

const Profile = {
  async load() {
    const p = await api.get('/api/profile');
    document.getElementById('p-name').value = p.fullName || '';
    document.getElementById('p-email').value = p.email || '';
    document.getElementById('p-phone').value = p.phone || '';
    document.getElementById('p-location').value = p.location || '';
    document.getElementById('p-links').value = (p.links || []).join('\n');
    document.getElementById('p-master').value =
      typeof p.masterProfile === 'string'
        ? p.masterProfile
        : JSON.stringify(p.masterProfile || {}, null, 2);
    if (p.resumeText) {
      document.getElementById('p-resume-status').textContent =
        `Resume on file: ${p.resumeText.length} characters parsed.`;
    }
  },

  masterValue() {
    const raw = document.getElementById('p-master').value.trim();
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return { freeform: raw };
    }
  },

  async save() {
    const status = document.getElementById('p-status');
    try {
      await api.put('/api/profile', {
        fullName: document.getElementById('p-name').value,
        email: document.getElementById('p-email').value,
        phone: document.getElementById('p-phone').value,
        location: document.getElementById('p-location').value,
        links: document
          .getElementById('p-links')
          .value.split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        masterProfile: Profile.masterValue(),
      });
      setStatus(status, 'Saved.', true);
    } catch (e) {
      setStatus(status, e.message, false);
    }
  },

  async uploadResume() {
    const status = document.getElementById('p-resume-status');
    const fileEl = document.getElementById('p-resume-file');
    if (!fileEl.files.length) {
      setStatus(status, 'Choose a .pdf or .docx file first.', false);
      return;
    }
    const fd = new FormData();
    fd.append('resume', fileEl.files[0]);
    try {
      const r = await api.upload('/api/profile/resume', fd);
      setStatus(status, `Parsed ${r.charCount} characters.`, true);
    } catch (e) {
      setStatus(status, e.message, false);
    }
  },

  async saveResumeText() {
    const status = document.getElementById('p-resume-status');
    try {
      const r = await api.post('/api/profile/resume-text', {
        resumeText: document.getElementById('p-resume-text').value,
      });
      setStatus(status, `Saved ${r.charCount} characters.`, true);
    } catch (e) {
      setStatus(status, e.message, false);
    }
  },
};

document.getElementById('p-save').addEventListener('click', Profile.save);
document
  .getElementById('p-resume-upload')
  .addEventListener('click', Profile.uploadResume);
document
  .getElementById('p-resume-text-save')
  .addEventListener('click', Profile.saveResumeText);
