# Daily Chinese Read

A focused reading workspace for intermediate-to-advanced Mandarin learners. The current checkpoint is **Phase 2 — language scaffolding** with live public retrieval from 澎湃新闻, 证券时报, and 界面新闻, grounded article analysis, contextual term highlights, and selected-sentence help.

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
OPENAI_MODEL=gpt-5.4-mini
```

`OPENAI_MODEL` is optional and defaults to `gpt-5.4-mini`. `.env.local` is ignored by Git.
Copy `.env.example` to `.env.local` for local development, then add the real key only to `.env.local` and the Vercel project environment.

Discovery continues to use a transparent interest, recency, and topic heuristic. The model sees only the selected retrieved article, learner level, and bounded interests. Model output is checked server-side before it reaches the reader.

## Source limitations

- Publisher markup may change; each adapter fails independently and returns a public warning.
- 界面新闻 articles marked as paid are rejected rather than partially displayed.
- Publication time and description use neutral fallbacks when a listing page does not expose reliable metadata.
- Full article text is fetched only after a reader selects a card.
- If AI analysis is unavailable or invalid, the original article remains readable and the user can retry.

## Verify

Complete the cumulative manual list in `CHECKS.md` at desktop width, at 375 px, and at 200% text zoom. Foundation test states remain available by temporarily switching `config.js` to `sample` mode and enabling `showPreviewStates`; restore live mode afterward.

## Deployment

The target is Vercel. A deployment must contain no secret values and must be verified at its public URL before a phase is marked complete.

## Project boundaries

- `app.js` coordinates workflows only.
- `ui.js` owns every DOM read and write.
- `source.js` is the browser’s only data and persistence boundary.
- `config.js` contains browser-safe tunable values.
- `api/articles.js` owns bounded discovery and ranking; `api/article.js` retrieves one allowlisted article.
- `api/analyze.js` and `api/explain.js` own grounded model requests; prompts, provider configuration, and credentials remain server-side.
- Publisher-specific parsing stays in separate modules under `api/_shared/adapters/`.
- `CONTRACTS.md` records stable interfaces; changes under its protected heading require approval.
