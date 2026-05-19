'use strict';

const App = {
  tab: 'setup',
  show(tab) {
    App.tab = tab;
    document
      .querySelectorAll('.nav-btn')
      .forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    document
      .querySelectorAll('.panel')
      .forEach((p) => p.classList.toggle('active', p.id === 'tab-' + tab));
    if (tab === 'discover') Jobs.loadDiscover();
    if (tab === 'tracker') Jobs.loadTracker();
  },
};

document.querySelectorAll('.nav-btn').forEach((b) =>
  b.addEventListener('click', () => App.show(b.dataset.tab))
);

(async function init() {
  try {
    const h = await api.get('/api/health');
    document.getElementById('health').textContent = h.apiKeyConfigured
      ? `● claude ${h.model} — key configured`
      : '● no ANTHROPIC_API_KEY set — generation disabled until added to .env';
  } catch {
    document.getElementById('health').textContent = '● server unreachable';
  }
  await Profile.load();
  await Jobs.loadSources();
})();
