'use strict';

const Jobs = {
  esc(s) {
    return String(s || '').replace(/[&<>"]/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
    );
  },

  statusLabel(s) {
    return {
      to_apply: 'To apply',
      applied: 'Applied',
      interviewing: 'Interviewing',
      rejected: 'Rejected',
      offer: 'Offer',
    }[s] || s;
  },

  async load() {
    const status = document.getElementById('f-status').value;
    const search = document.getElementById('f-search').value.trim();
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (search) qs.set('search', search);
    const jobs = await api.get('/api/jobs?' + qs.toString());
    const list = document.getElementById('jobs-list');
    if (!jobs.length) {
      list.innerHTML = '<p class="hint">No jobs yet. Add some above.</p>';
      return;
    }
    list.innerHTML = jobs.map((j) => Jobs.card(j)).join('');
    jobs.forEach((j) => {
      document
        .getElementById(`open-${j.id}`)
        .addEventListener('click', () => JobDetail.open(j.id));
      document
        .getElementById(`del-${j.id}`)
        .addEventListener('click', () => Jobs.remove(j.id));
    });
  },

  card(j) {
    const ats =
      j.atsScore != null
        ? `<span class="ats">ATS ${j.atsScore}/100</span>`
        : '<span class="hint">not tailored</span>';
    return `
      <div class="job-card">
        <h3>${Jobs.esc(j.role) || '(role?)'} <span class="badge ${j.status}">${Jobs.statusLabel(j.status)}</span></h3>
        <div class="job-meta">
          <span>${Jobs.esc(j.company) || '(company?)'}</span>
          ${j.jobUrl ? `<a href="${Jobs.esc(j.jobUrl)}" target="_blank" rel="noopener">link</a>` : ''}
          <span>added ${new Date(j.dateAdded).toLocaleDateString()}</span>
          ${ats}
        </div>
        <button id="open-${j.id}" class="primary">Open / Tailor</button>
        <button id="del-${j.id}">Delete</button>
      </div>`;
  },

  async remove(id) {
    if (!confirm('Delete this job?')) return;
    await api.del('/api/jobs/' + id);
    Jobs.load();
  },

  async bulkAdd() {
    try {
      const r = await api.post('/api/jobs/bulk', {
        text: document.getElementById('b-text').value,
        delimiter: document.getElementById('b-delim').value,
      });
      document.getElementById('b-text').value = '';
      alert(`Added ${r.count} job(s).`);
      Jobs.load();
    } catch (e) {
      alert(e.message);
    }
  },

  async singleAdd() {
    try {
      await api.post('/api/jobs', {
        company: document.getElementById('s-company').value,
        role: document.getElementById('s-role').value,
        jobUrl: document.getElementById('s-url').value,
        source: document.getElementById('s-source').value,
        descriptionText: document.getElementById('s-desc').value,
      });
      ['s-company', 's-role', 's-url', 's-source', 's-desc'].forEach(
        (id) => (document.getElementById(id).value = '')
      );
      Jobs.load();
    } catch (e) {
      alert(e.message);
    }
  },

  async tailorPending() {
    if (!confirm('Tailor all pending (untailored "To apply") jobs? This calls the Claude API for each.')) return;
    const btn = document.getElementById('tailor-pending');
    btn.disabled = true;
    btn.textContent = 'Tailoring...';
    try {
      const r = await api.post('/api/jobs/tailor-pending');
      alert(`Processed ${r.processed}. Success: ${r.results.filter((x) => x.ok).length}.`);
      Jobs.load();
    } catch (e) {
      alert(e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Tailor all pending';
    }
  },
};

document.getElementById('b-add').addEventListener('click', Jobs.bulkAdd);
document.getElementById('s-add').addEventListener('click', Jobs.singleAdd);
document.getElementById('f-refresh').addEventListener('click', Jobs.load);
document.getElementById('f-status').addEventListener('change', Jobs.load);
document
  .getElementById('tailor-pending')
  .addEventListener('click', Jobs.tailorPending);
