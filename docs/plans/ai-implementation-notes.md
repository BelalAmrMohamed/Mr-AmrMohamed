# AI Assistant — implementation notes

Implements `docs/plans/ai.md`. Plain JS, no build step (matches the rest of
the site), deployed as a Vercel static site + one serverless function.

## Files

- `api/chat.js` — serverless proxy to Google AI Studio (Gemini
  `gemini-flash-lite-latest`). Holds the API key(s), the system prompt, and
  the **tool declarations** (what the model is allowed to call).
- `public/assets/ai/api.js` — client-side network layer. Converts stored
  chat history to Gemini's `contents` format and drives the
  functionCall → functionResponse loop (up to 4 rounds per turn) until the
  model returns plain text.
- `public/assets/ai/tools.js` — client-side **tool renderers**. Turns a
  tool call into a DOM node. `render_component` is a single flexible tool
  that covers every "Interactive Chat Component" in the plan (MCQ,
  fill-in-the-blank, flashcards, vocab/grammar cards, quiz summary,
  progress, pronunciation card, lesson card, buttons) — the model decides
  which `type` fits the exercise, so new drills don't need new tools.
- `public/assets/ai/storage.js` — all `localStorage` persistence: chats,
  pin/rename/delete, branching, export.
- `public/assets/ai/app.js` — UI: launcher button, modal, sidebar/history,
  message rendering (Markdown via `marked` + `DOMPurify`, loaded from
  cdnjs in `index.html`), edit/regenerate/copy/read-aloud, suggested
  prompts.
- `public/assets/ai/chat.css` — all of the above, reusing the site's
  existing palette/fonts (`--navy-blue`, `--rich-gold`, Playfair/Inter).

## Adding a new tool

1. Add a `functionDeclarations` entry in `api/chat.js`'s `TOOLS` array
   (name, description, JSON-schema parameters) — or, if it's just a new
   kind of inline exercise, add a `type` to `render_component`'s enum and
   mention it in the system instruction.
2. Add a matching renderer in `public/assets/ai/tools.js`
   (`RENDERERS[name]`, or `COMPONENT_RENDERERS[type]` for a
   `render_component` type).

Nothing else needs to change — this is the "modular tool system" the plan
asks for.

## Setup

Set `PUBLIC_ASSISTANT_GEMINI_API_KEYS` (comma-separated) as a Vercel
environment variable, per `.env.example`. The function rotates through
keys on `429`/`5xx`/auth errors.

## What's deliberately deferred

The plan itself flags two tools as "leave for now":
- **Website Navigation** (a button that jumps to a page/section) —
  no declaration/renderer added yet.
- **Website Content Search** — same.

Also out of scope for this pass, left as clean extension points:
- A dedicated `/ai` full-page experience (the widget/modal is built so the
  same `AiChat` class could mount into a page instead of a launcher +
  modal).
- True token-by-token streaming (currently: a typing indicator, then the
  full reply). The API layer is structured so swapping in a streaming
  fetch later only touches `api.js`.
- PDF export is implemented via a print-formatted window (`window.print()`)
  rather than a PDF-generation library, to avoid a heavy new dependency in
  a build-tool-free project. Markdown and plain-text export are direct
  downloads.