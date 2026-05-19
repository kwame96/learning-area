'use strict';

const Jobs = {
  selected: new Set(),

  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, (c) =>
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

  async loadSources() {
    try {
      const list = await api.get('/api/sources');
      document.getElementById('src-select').innerHTML = list
        .map((s) => `<option value="${s.id}">${Jobs.esc(s.label)}</option>`)
        .join('');
    } catch {
      /* ignore */
    }
  },

  async fetchSource() {
    const st = document.getElementById('src-status');
    setStatus(st, 'Pulling…', true);
    try {
      const r = await api.post('/api/jobs/from-source', {
        source: document.getElementById('src-select').value,
        query: document.getElementById('src-query').value.trim(),
        limit: 60,
      });
      setStatus(st, `Added ${r.added}, skipped ${r.skipped} duplicate(s).`, true);
      Jobs.loadDiscover();
    } catch (e) {
      setStatus(st, e.message, false);
    }
  },

  async importText() {
    const st = document.getElementById('src-status');
    try {
      const r = await api.post('/api/jobs/import', {
        text: document.getElementById('imp-text').value,
      });
      document.getElementById('imp-text').value = '';
      setStatus(st, `Imported ${r.added}, skipped ${r.skipped}.`, true);
      Jobs.loadDiscover();
    } catch (e) {
      setStatus(st, e.message, false);
    }
  },

  async singleAdd() {
    const st = document.getElementById('src-status');
    try {
      await api.post('/api/jobs', {
        company: document.getElementById('s-company').value,
        role: document.getElementById('s-role').value,
        jobUrl: document.getElementById('s-url').value,
        source: document.getElementById('s-source').value,
        descriptionText: document.getElementById('s-desc').value,
      });
      ['s-company', 's-role', 's-url', 's-source', 's-desc'].forEach(
        (i) => (document.getElementById(i).value = '')
      );
      setStatus(st, 'Added.', true);
      Jobs.loadDiscover();
    } catch (e) {
      setStatus(st, e.message, false);
    }
  },

  jobCard(j, withCheck) {
    const ats =
      j.atsScore != null ? `<span class="ats">${j.atsScore}</span>/100` : '';
    return `<div class="jcard ${withCheck && Jobs.selected.has(j.id) ? 'sel' : ''}" data-id="${j.id}">
      <div class="jtop">
        <div><p class="jrole">${Jobs.esc(j.role) || '(role?)'}</p>
        <span class="jco">${Jobs.esc(j.company) || '(company?)'}</span></div>
        ${
          withCheck
            ? `<input type="checkbox" class="jck" data-id="${j.id}" ${
                Jobs.selected.has(j.id) ? 'checked' : ''
              }/>`
            : `<span class="pill ${j.status}">${Jobs.statusLabel(j.status)}</span>`
        }
      </div>
      <div class="meta">
        <span>${Jobs.esc(j.source) || 'manual'}</span>
        ${j.lastTailoredAt ? `<span>· tailored ${ats}</span>` : '<span>· not tailored</span>'}
      </div>
      <div class="jactions">
        <button class="btn open" data-id="${j.id}">Open</button>
        ${j.jobUrl ? `<a class="btn" href="${Jobs.esc(j.jobUrl)}" target="_blank" rel="noopener">Apply ↗</a>` : ''}
        <button class="btn del" data-id="${j.id}">Del</button>
      </div>
    </div>`;
  },

  wire(container, withCheck) {
    container.querySelectorAll('.open').forEach((b) =>
      b.addEventListener('click', () => JobDetail.open(Number(b.dataset.id)))
    );
    container.querySelectorAll('.del').forEach((b) =>
      b.addEventListener('click', async () => {
        if (!confirm('Delete this job?')) return;
        await api.del('/api/jobs/' + b.dataset.id);
        Jobs.selected.delete(Number(b.dataset.id));
        withCheck ? Jobs.loadDiscover() : Jobs.loadTracker();
      })
    );
    if (withCheck) {
      container.querySelectorAll('.jck').forEach((c) =>
        c.addEventListener('change', () => {
          const id = Number(c.dataset.id);
          c.checked ? Jobs.selected.add(id) : Jobs.selected.delete(id);
          c.closest('.jcard').classList.toggle('sel', c.checked);
          Jobs.refreshCount();
        })
      );
    }
  },

  refreshCount() {
    document.getElementById('sel-count').textContent =
      `${Jobs.selected.size} selected`;
  },

  async loadDiscover() {
    const jobs = await api.get('/api/jobs');
    const g = document.getElementById('job-grid');
    g.innerHTML = jobs.length
      ? jobs.map((j) => Jobs.jobCard(j, true)).join('')
      : '<p class="muted">No jobs yet. Pull from a source or import above.</p>';
    Jobs.wire(g, true);
    Jobs.refreshCount();
  },

  async loadTracker() {
    const qs = new URLSearchParams();
    const s = document.getElementById('f-status').value;
    const q = document.getElementById('f-search').value.trim();
    if (s) qs.set('status', s);
    if (q) qs.set('search', q);
    const jobs = await api.get('/api/jobs?' + qs);
    const g = document.getElementById('track-grid');
    g.innerHTML = jobs.length
      ? jobs.map((j) => Jobs.jobCard(j, false)).join('')
      : '<p class="muted">Nothing here yet.</p>';
    Jobs.wire(g, false);
  },

  async generateSelected() {
    if (!Jobs.selected.size) {
      alert('Check at least one job first.');
      return;
    }
    const btn = document.getElementById('gen-selected');
    const st = document.getElementById('gen-status');
    btn.disabled = true;
    setStatus(st, `Generating for ${Jobs.selected.size}…`, true);
    try {
      const r = await api.post('/api/jobs/tailor-batch', {
        ids: [...Jobs.selected],
      });
      const ok = r.results.filter((x) => x.ok).length;
      setStatus(st, `Done: ${ok}/${r.processed} tailored. Review each before applying.`, true);
      Jobs.selected.clear();
      Jobs.loadDiscover();
    } catch (e) {
      setStatus(st, e.message, false);
    } finally {
      btn.disabled = false;
    }
  },
};

document.getElementById('src-fetch').addEventListener('click', Jobs.fetchSource);
document.getElementById('imp-go').addEventListener('click', Jobs.importText);
document.getElementById('s-add').addEventListener('click', Jobs.singleAdd);
document.getElementById('gen-selected').addEventListener('click', Jobs.generateSelected);
document.getElementById('f-refresh').addEventListener('click', Jobs.loadTracker);
document.getElementById('f-status').addEventListener('change', Jobs.loadTracker);
document.getElementById('sel-all').addEventListener('change', (e) => {
  document.querySelectorAll('#job-grid .jck').forEach((c) => {
    c.checked = e.target.checked;
    const id = Number(c.dataset.id);
    e.target.checked ? Jobs.selected.add(id) : Jobs.selected.delete(id);
    c.closest('.jcard').classList.toggle('sel', e.target.checked);
  });
  Jobs.refreshCount();
});
