# Job Application Assistant

A local tool that tailors **your genuine resume** to many job descriptions
using an LLM, scores ATS keyword match, exports PDFs, and tracks
application status. Works with **Groq (free)** or **Claude (paid)**.

**What it does NOT do:** it does not auto-submit applications (that violates
job-board terms and gets accounts banned) and it does not invent or exaggerate
experience. You review every tailored document and submit it yourself.

## Setup

```bash
cd job-application-assistant
npm install
cp .env.example .env
npm start
```

Open http://localhost:3000

### Choosing the LLM provider

`.env` has `LLM_PROVIDER`:

- **Free, fully local (no key, no internet):** `LLM_PROVIDER=ollama`.
  Install [Ollama](https://ollama.com), run `ollama pull llama3.2:3b`.
  Best when you have no API budget; slower on CPU-only machines — use a
  small model (`llama3.2:3b`) and expect ~1–3 min per job.
- **Free via API:** `LLM_PROVIDER=groq` and set `GROQ_API_KEY`
  (free key at https://console.groq.com/keys).
- **Switch to Claude later (fast):** change the single line to
  `LLM_PROVIDER=anthropic`, ensure `ANTHROPIC_API_KEY` is set, restart.
  No code changes; your saved jobs/profile are untouched.

Groq is lower quality than Claude for this task but free and good enough to
draft and test the full workflow.

## Workflow

1. **Setup** — fill in your real experience/skills and upload your resume
   (PDF or DOCX), or paste the text if it is a scanned image.
2. **Discover** — pull roles from a sanctioned job source, **import** a
   JSON/CSV list (always works offline), or add one manually. Duplicates
   (same URL) are skipped automatically.
3. **Check the jobs you want** and hit **Generate for selected** — Claude
   produces a tailored resume + cover letter for the whole batch, each with
   an ATS score, matched keywords, and genuine missing keywords (gaps you
   should not fake).
4. **Tracker** — review every generated line, export PDFs, open the
   application, submit it yourself, and update the status.

## What this deliberately does NOT do

- **No scraping of boards that forbid it** (LinkedIn, Indeed, etc.). Only
  sources that permit programmatic access belong in `src/services/jobSources.js`;
  everything else goes through Import. Live sources need outbound network —
  if your environment blocks it, use Import.
- **No fully-unattended mass submission.** Each board has its own forms,
  logins and anti-bot defenses; unattended bulk submit gets accounts banned
  and performs poorly. The batch flow gets you to one reviewed click per job.

## Notes

- Data is local only (SQLite in `data/`, gitignored). Nothing leaves your
  machine except the Claude API calls.
- The static prompt prefix (your profile + resume) is prompt-cached, so
  tailoring 100+ jobs in one run is cheap after the first call.
- Default model is `claude-sonnet-4-6`; set `CLAUDE_MODEL=claude-opus-4-7`
  in `.env` for higher-stakes roles.
