'use strict';

const JobDetail = {
  current: null,

  async open(id) {
    const j = await api.get('/api/jobs/' + id);
    JobDetail.current = j;
    JobDetail.render(j);
    document.getElementById('modal').classList.remove('hidden');
  },

  close() {
    document.getElementById('modal').classList.add('hidden');
    if (App.tab === 'discover') Jobs.loadDiscover();
    else if (App.tab === 'tracker') Jobs.loadTracker();
  },

  chips(arr, miss) {
    if (!arr || !arr.length) return '<span class="hint">none</span>';
    return (
      '<div class="chips">' +
      arr
        .map((k) => `<span class="chip${miss ? ' miss' : ''}">${Jobs.esc(k)}</span>`)
        .join('') +
      '</div>'
    );
  },

  render(j) {
    const tailored = !!j.lastTailoredAt;
    const checklist = (j.checklist || [])
      .map(
        (c, i) =>
          `<label style="font-weight:400"><input type="checkbox" data-ck="${i}" ${
            c.done ? 'checked' : ''
          } style="width:auto;margin-right:.4rem"/>${Jobs.esc(c.label)}</label>`
      )
      .join('');

    document.getElementById('modal-body').innerHTML = `
      <h2>${Jobs.esc(j.role) || '(role?)'} — ${Jobs.esc(j.company) || '(company?)'}</h2>
      <p class="warn">Verify every line of the tailored documents is true before you submit. This tool reframes your real experience — it does not invent it.</p>

      <label>Status
        <select id="d-status">
          ${['to_apply', 'applied', 'interviewing', 'rejected', 'offer']
            .map(
              (s) =>
                `<option value="${s}" ${s === j.status ? 'selected' : ''}>${Jobs.statusLabel(s)}</option>`
            )
            .join('')}
        </select>
      </label>

      <button id="d-tailor" class="btn primary">${tailored ? '↻ Re-generate' : '⚡ Generate with Claude'}</button>
      ${
        tailored
          ? `<a class="btn" href="/api/jobs/${j.id}/export?doc=resume" target="_blank">Resume PDF</a>
             <a class="btn" href="/api/jobs/${j.id}/export?doc=cover" target="_blank">Cover letter PDF</a>
             ${j.jobUrl ? `<a class="btn primary" href="${Jobs.esc(j.jobUrl)}" target="_blank" rel="noopener">Open application ↗</a>` : ''}`
          : ''
      }
      <span id="d-status-msg" class="status"></span>

      ${
        tailored
          ? `
        <p><strong>ATS score:</strong> <span class="ats">${j.atsScore != null ? j.atsScore + '/100' : 'n/a'}</span></p>
        <p><strong>Matched keywords:</strong></p>${JobDetail.chips(j.matchedKeywords)}
        <p><strong>Missing (genuine gaps — do NOT fake these):</strong></p>${JobDetail.chips(j.missingKeywords, true)}
        ${j.tailorNotes ? `<p class="hint">${Jobs.esc(j.tailorNotes)}</p>` : ''}
        <h3>Tailored resume</h3><div class="doc-box">${Jobs.esc(j.tailoredResumeText)}</div>
        <h3>Cover letter</h3><div class="doc-box">${Jobs.esc(j.coverLetterText)}</div>`
          : '<p class="hint">Not tailored yet.</p>'
      }

      <h3>Application checklist</h3>
      <div id="d-checklist">${checklist}</div>

      <h3>Job description</h3>
      <div class="doc-box">${Jobs.esc(j.descriptionText)}</div>
    `;

    document
      .getElementById('d-status')
      .addEventListener('change', JobDetail.saveStatus);
    document
      .getElementById('d-tailor')
      .addEventListener('click', JobDetail.tailor);
    document.querySelectorAll('#d-checklist input').forEach((cb) =>
      cb.addEventListener('change', JobDetail.saveChecklist)
    );
  },

  async saveStatus() {
    const msg = document.getElementById('d-status-msg');
    try {
      const j = await api.patch('/api/jobs/' + JobDetail.current.id, {
        status: document.getElementById('d-status').value,
      });
      JobDetail.current = j;
      setStatus(msg, 'Status saved.', true);
    } catch (e) {
      setStatus(msg, e.message, false);
    }
  },

  async saveChecklist() {
    const checklist = JobDetail.current.checklist.map((c, i) => ({
      label: c.label,
      done: document.querySelector(`#d-checklist input[data-ck="${i}"]`).checked,
    }));
    const j = await api.patch('/api/jobs/' + JobDetail.current.id, { checklist });
    JobDetail.current = j;
  },

  async tailor() {
    const btn = document.getElementById('d-tailor');
    const msg = document.getElementById('d-status-msg');
    btn.disabled = true;
    btn.textContent = 'Tailoring...';
    try {
      const j = await api.post(`/api/jobs/${JobDetail.current.id}/tailor`);
      JobDetail.current = j;
      JobDetail.render(j);
    } catch (e) {
      setStatus(msg, e.message, false);
      btn.disabled = false;
      btn.textContent = 'Tailor with Claude';
    }
  },
};

document
  .getElementById('modal-close')
  .addEventListener('click', JobDetail.close);
document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal') JobDetail.close();
});
