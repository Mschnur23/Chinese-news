# Daily Chinese Read

A focused reading workspace for intermediate-to-advanced Mandarin learners. The current checkpoint is **Phase 1 — discovery and reader** with live public retrieval from 澎湃新闻, 证券时报, and 界面新闻. It does not contact an AI provider yet.

## Run locally

Use Vercel's local development command so the static site and `/api` routes run together:

```sh
vercel dev
```

Opening `index.html` directly as a file is unsupported because live discovery requires server routes and browsers block module requests from `file://` pages.

## Configuration

Browser-safe settings live in `config.js`. Phase 1 uses `live` mode. Do not place credentials in browser files.

Phase 1 needs no environment variables or credentials. Future model credentials belong in `.env.local` locally and Vercel project settings when Phase 2 begins. Neither file is tracked.

Phase 1 ranks candidates with a transparent interest, recency, and topic heuristic and supplies clearly framed selection notes. The single model-provider path is introduced in Phase 2, when grounded article analysis becomes part of the reader.

## Source limitations

- Publisher markup may change; each adapter fails independently and returns a public warning.
- 界面新闻 articles marked as paid are rejected rather than partially displayed.
- Publication time and description use neutral fallbacks when a listing page does not expose reliable metadata.
- Full article text is fetched only after a reader selects a card.

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
- Publisher-specific parsing stays in separate modules under `api/_shared/adapters/`.
- `CONTRACTS.md` records stable interfaces; changes under its protected heading require approval.
