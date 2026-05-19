# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this repo is

Two distinct things live here:

1. **MDN Learning Area** — the upstream Mozilla educational repo: static
   HTML/CSS/JS examples organized by learning module (`accessibility/`,
   `css/`, `html/`, `javascript/`, `tools-testing/`). These are teaching
   examples, not an application.
2. **`job-application-assistant/`** — a self-contained Node/Express web app
   added to this fork. It tailors a job seeker's genuine resume to many job
   descriptions via the Claude API, scores ATS match, exports PDFs, and
   tracks applications. It does **not** auto-submit and does **not** fabricate
   experience.

## job-application-assistant: stack

- Node 20+ / Express, CommonJS. Vanilla HTML/CSS/JS frontend (no framework).
- `better-sqlite3` (local file DB in `data/`), `@anthropic-ai/sdk`,
  `multer` (2.x), `pdfjs-dist` (PDF text), `mammoth` (DOCX), `pdfkit`
  (PDF export), `dotenv`.
- Layout: `routes/` (HTTP) → `repositories/` (DB) and `services/`
  (resume parsing, Claude, PDF). `lib/` holds validation and prompts.

## Run & test

```bash
cd job-application-assistant
npm install
cp .env.example .env        # add real ANTHROPIC_API_KEY
npm start                   # http://localhost:3000
```

No automated test suite — verify via the browser checklist in
`job-application-assistant/README.md` and `GET /api/health`.

## Conventions / hard rules

- **API key is server-side only.** Read `ANTHROPIC_API_KEY` from
  `process.env`. Never hardcode it, never send it to the frontend, never
  commit `.env`.
- **No fabrication.** Tailoring prompts (`src/lib/prompts.js`) must keep the
  rule that Claude may only reorder/rephrase/emphasize genuine content from
  the master profile/resume, never invent experience, skills, dates, or
  credentials. Genuine gaps go to `missing_keywords`.
- **Local-only data.** All user data stays in SQLite under `data/`. No
  external database or analytics.
- **Validate at boundaries.** All request bodies/uploads pass through
  `src/lib/validation.js`. The central error handler must not leak stack
  traces or secrets.
- **Persist Claude results** so re-opening a job never re-bills the API.

## How to work here

- MDN example files: keep their existing style; do not restructure or
  "modernize" them — they mirror published articles.
- App changes: keep dependencies minimal; follow the
  routes/services/repositories split; prefer editing existing modules.
- Default branch for this work: `claude/job-application-automation-uj0tr`.

## Do NOT

- Commit `.env`, `data/`, `uploads/`, `exports/`, or `node_modules/`.
- Build anything that auto-submits job applications or scrapes job boards.
- Add code that invents or exaggerates candidate experience.
