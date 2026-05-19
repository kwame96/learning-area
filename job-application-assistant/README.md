# Job Application Assistant

A local tool that tailors **your genuine resume** to many job descriptions
using the Claude API, scores ATS keyword match, exports PDFs, and tracks
application status.

**What it does NOT do:** it does not auto-submit applications (that violates
job-board terms and gets accounts banned) and it does not invent or exaggerate
experience. You review every tailored document and submit it yourself.

## Setup

```bash
cd job-application-assistant
npm install
cp .env.example .env       # then put your real ANTHROPIC_API_KEY in .env
npm start
```

Open http://localhost:3000

## Workflow

1. **Profile tab** — fill in your real experience/skills and upload your
   resume (PDF or DOCX), or paste the text if it is a scanned image.
2. **Jobs tab** — bulk-paste many job descriptions (separate each with a line
   containing only `---`; optional first line `Company - Role`), or add one.
3. Open a job and click **Tailor** — Claude reframes your *genuine*
   experience to the job, returns an ATS score, matched keywords, and
   genuine missing keywords (gaps you should not fake).
4. Export the tailored resume / cover letter as PDF, review every line, then
   submit on the company's site and update the status.

## Notes

- Data is local only (SQLite in `data/`, gitignored). Nothing leaves your
  machine except the Claude API calls.
- The static prompt prefix (your profile + resume) is prompt-cached, so
  tailoring 100+ jobs in one run is cheap after the first call.
- Default model is `claude-sonnet-4-6`; set `CLAUDE_MODEL=claude-opus-4-7`
  in `.env` for higher-stakes roles.
