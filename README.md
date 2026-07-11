# FlashForge

Turn lecture slides into a full flashcard deck — no sign up, no login. Enter your name, upload a slide deck (PDF, PPTX, or DOCX), pick MCQ / Short Answer / Theory mode, and get a comprehensive deck that covers every point on the slides.

## Setup

1. Install dependencies
   ```
   npm install
   ```

2. Add your Groq API key (free, no credit card required)
   ```
   cp .env.local.example .env.local
   ```
   Then open `.env.local` and paste a key from https://console.groq.com/keys

3. Run it
   ```
   npm run dev
   ```
   Open http://localhost:3000

## How it works

- **`/api/extract`** — reads the uploaded file (PDF/PPTX/DOCX/ODP/ODT) and pulls out the raw text using `officeparser`.
- **`/api/generate`** — splits that text into content-sized chunks and sends each one to Groq (Llama 3.3 70B) with a prompt tuned to the chosen mode (MCQ, SAQ, or Theory), instructed to cover every point rather than summarizing. Chunks keep large decks from getting skimmed or cut off.
- Everything else is client-side state — no database, no accounts. The student's name is remembered in the browser via `localStorage` so they aren't asked again.

## Notes for deploying

- `GROQ_API_KEY` must be set as an environment variable wherever you deploy (Vercel, etc.) — it's only ever read server-side, never sent to the browser.
- Groq's free tier has no expiration, just rate limits (30 requests/min at time of writing) — plenty for personal use. If you outgrow it, adding a card raises the limits without any code changes.
- Large slide decks are capped at 10 chunks per generation to keep response times reasonable; each chunk is roughly one exam's worth of slide content.

