'use strict';

document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
    document
      .querySelectorAll('.tab-panel')
      .forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document
      .getElementById('tab-' + btn.dataset.tab)
      .classList.add('active');
    if (btn.dataset.tab === 'jobs') Jobs.load();
  });
});

(async function init() {
  try {
    const h = await api.get('/api/health');
    document.getElementById('health').textContent = h.apiKeyConfigured
      ? `Claude model: ${h.model} — API key configured.`
      : 'No ANTHROPIC_API_KEY set — tailoring is disabled until you add it to .env.';
  } catch {
    document.getElementById('health').textContent = 'Server unreachable.';
  }
  await Profile.load();
  await Jobs.load();
})();
