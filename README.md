# Daily Chinese Read

A focused reading workspace for intermediate-to-advanced Mandarin learners. The current checkpoint is **Phase 4 — bring your own article** with live public retrieval from 澎湃新闻, 证券时报, and 界面新闻, plus URL and pasted-text imports that use the same grounded learning tools.

Language guides return exactly 20 grounded vocabulary terms for Intermediate readers and exactly 10 for Advanced readers.
Within the level-appropriate difficult/useful candidates, repeated terms are prioritized by exact-occurrence frequency; difficulty and contextual usefulness break ties, and easy function words are never selected for frequency alone.

The learning loop includes a local spaced-repetition review queue, known-word feedback that shapes later guides, and contextual help for Chinese words tapped directly in an article. These learning records stay in browser storage.

## Run locally

Use Vercel's local development command so the static site and `/api` routes run together:

```sh
vercel dev
```

Opening `index.html` directly as a file is unsupported because live discovery requires server routes and browsers block module requests from `file://` pages.

## Configuration

Browser-safe settings live in `config.js`. The app uses `live` mode. Do not place credentials in browser files.

Phase 2 uses the OpenAI Responses API with Structured Outputs. Add these server-side environment variables locally and in Vercel; never place their values in browser files:

```sh
OPENAI_API_KEY=your_server_side_key
OPENAI_MODEL=gpt-5-mini
FIRECRAWL_API_KEY=your_server_side_firecrawl_key
```

`OPENAI_MODEL` is optional and defaults to `gpt-5-mini`. Use `gpt-5-nano` only for simple repetitive work such as classification, extraction, tagging, or basic summarization; contextual language analysis defaults to `gpt-5-mini`. `FIRECRAWL_API_KEY` is required only for the Article link import tab. Paste text works without Firecrawl. `.env.local` is ignored by Git.
Copy `.env.example` to `.env.local` for local development, then add the real key only to `.env.local` and the Vercel project environment.

Discovery continues to use a transparent interest, recency, and topic heuristic. The model sees only the selected retrieved article, learner level, and bounded interests. Model output is checked server-side before it reaches the reader.

The custom importer accepts one public HTTPS link or a title plus pasted Chinese text. Link mode makes one server-side Firecrawl single-page extraction request; paste mode performs local app validation and normalization without consuming a Firecrawl credit. Imported article bodies stay in current page memory and are not saved to browser storage.

Saved vocabulary uses versioned browser `localStorage`; it never leaves the device and requires no account or database. Duplicate identity is based on the normalized term, article ID, and original context sentence. If stored data is malformed or unavailable, the app reports a recoverable error and leaves the existing value untouched.

The interface follows `DailyChineseRead_StyleGuide.md`: a light editorial canvas, black Chinese headlines, muted metadata, restrained blue emphasis, compact rounded surfaces, a centered reading column, and simple Home/My Words navigation on mobile.

## Source limitations

- Publisher markup may change; each adapter fails independently and returns a public warning.
- 界面新闻 articles marked as paid are rejected rather than partially displayed.
- Publication time and description use neutral fallbacks when a listing page does not expose reliable metadata.
- Full article text is fetched only after a reader selects a card.
- If AI analysis is unavailable or invalid, the original article remains readable and the user can retry.
- Link import depends on Firecrawl extraction quality; when a link cannot be read, paste the article text instead.

## Verify

Run the dependency-free architecture and contract checker first:

```sh
npm run check
```

Then complete the cumulative manual list in `CHECKS.md` at desktop width, at 375 px, and at 200% text zoom. Foundation test states are available at `/?preview=1`; this switches only that browser session to hand-written sample data and reveals the success, partial-source, empty, and error controls. The normal URL always stays in live mode.

## Deployment

The target is Vercel. A deployment must contain no secret values and must be verified at its public URL before a phase is marked complete.

## Project boundaries

- `app.js` coordinates workflows only.
- `ui.js` owns every DOM read and write.
- `source.js` is the browser’s only data and persistence boundary.
- `config.js` contains browser-safe tunable values.
- `api/articles.js` owns bounded discovery and ranking; `api/article.js` retrieves one allowlisted article.
- `api/analyze.js` and `api/explain.js` own grounded model requests; prompts, provider configuration, and credentials remain server-side.
- `api/import.js` owns imported-article validation; its Firecrawl adapter is the only module that knows the extraction provider API.
- Publisher-specific parsing stays in separate modules under `api/_shared/adapters/`.
- `CONTRACTS.md` records stable interfaces; changes under its protected heading require approval.

## Rules for every later phase

1. Read `CONTRACTS.md` before changing any file. Do not change anything under `DO NOT CHANGE WITHOUT ASKING` without stopping to ask first.
2. Work additively. Extend existing functions instead of renaming them or reorganizing the file layout.
3. Implement one phase at a time; do not pull later-phase features forward.
4. Put every new browser-safe tunable in `config.js`, and every server-only tunable in `api/_shared/server-config.js`.
5. Put every new browser data or persistence operation inside a `source.js` method.
6. Route every new visible state through `ui.js`; other browser modules never access the DOM.
7. Read secrets server-side from environment variables only. Never place them in browser code, commits, logs, or JSON responses.
8. Before committing, run `npm run check` and the full `CHECKS.md` list.
9. If something breaks, reproduce one symptom, change one thing, and retest; do not redesign the application.
10. At the end of a phase, report files changed, dependencies added, checks passed, and unresolved items, then stop.
