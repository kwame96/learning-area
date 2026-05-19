'use strict';

// Friendly pre-start picker so you can switch provider/model without
// hand-editing .env. Interactive only when run in a real terminal with
// no explicit choice; otherwise it stays out of the way (CI, `npm start
// -- groq`, or LLM_PROVIDER already set).

const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

const PROVIDERS = {
  offline: { label: 'Offline rule-based — no AI, no key, no internet', modelEnv: null, def: null },
  ollama: { label: 'Ollama — free, local AI (needs Ollama running)', modelEnv: 'OLLAMA_MODEL', def: 'llama3.2:3b' },
  groq: { label: 'Groq — free API (needs GROQ_API_KEY)', modelEnv: 'GROQ_MODEL', def: 'llama-3.3-70b-versatile' },
  anthropic: { label: 'Claude — paid API (needs ANTHROPIC_API_KEY)', modelEnv: 'CLAUDE_MODEL', def: 'claude-sonnet-4-6' },
};
const ORDER = ['offline', 'ollama', 'groq', 'anthropic'];

function startServer() {
  require('./server.js');
}

async function main() {
  const argProvider = process.argv[2];
  if (argProvider && PROVIDERS[argProvider]) {
    process.env.LLM_PROVIDER = argProvider;
    if (process.argv[3] && PROVIDERS[argProvider].modelEnv) {
      process.env[PROVIDERS[argProvider].modelEnv] = process.argv[3];
    }
    return startServer();
  }

  // Non-interactive: respect .env / env, don't prompt.
  if (!stdin.isTTY || process.env.LLM_NONINTERACTIVE === '1') {
    return startServer();
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const current = (process.env.LLM_PROVIDER || 'groq').toLowerCase();
  stdout.write('\nChoose an LLM provider for this run:\n');
  ORDER.forEach((id, i) => {
    const mark = id === current ? ' (current default)' : '';
    stdout.write(`  ${i + 1}) ${id} — ${PROVIDERS[id].label}${mark}\n`);
  });

  const pick = (await rl.question(`Number [1-${ORDER.length}], Enter to keep "${current}": `)).trim();
  const chosen = pick ? ORDER[Number(pick) - 1] : current;
  if (!chosen || !PROVIDERS[chosen]) {
    stdout.write('Invalid choice — keeping default.\n');
    rl.close();
    return startServer();
  }
  process.env.LLM_PROVIDER = chosen;

  const p = PROVIDERS[chosen];
  if (p.modelEnv) {
    const curModel = process.env[p.modelEnv] || p.def;
    const m = (await rl.question(`Model for ${chosen} [Enter = ${curModel}]: `)).trim();
    process.env[p.modelEnv] = m || curModel;
  }
  rl.close();
  stdout.write(`\n→ Using ${chosen}${p.modelEnv ? ' / ' + process.env[p.modelEnv] : ''}\n\n`);
  startServer();
}

main();
