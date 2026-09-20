# Daily Chinese Read

A focused reading workspace for intermediate-to-advanced Mandarin learners. The current checkpoint includes the approved **Google Drive sync** phase alongside live Chinese reporting, custom imports, grounded learning tools, reputable English follow-up links, and an offline-first reading list.

Language guides return exactly 20 grounded vocabulary terms for Intermediate readers and exactly 10 for Advanced readers.
Within the level-appropriate difficult/useful candidates, repeated terms are prioritized by exact-occurrence frequency; difficulty and contextual usefulness break ties, and easy function words are never selected for frequency alone.

The learning loop includes a local spaced-repetition review queue, known-word feedback that shapes later guides, and contextual help for Chinese words tapped directly in an article. These records stay in browser storage unless the reader explicitly connects their own Google Drive.

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
OPENAI_SEARCH_MODEL=gpt-5.5
FIRECRAWL_API_KEY=your_server_side_firecrawl_key
GOOGLE_CLIENT_ID=your_public_google_oauth_client_id
```

`OPENAI_MODEL` is optional and defaults to `gpt-5-mini`. `OPENAI_SEARCH_MODEL` is also optional and defaults to `gpt-5.5`, the current documented recommendation for Responses API web search. Both use the same `OPENAI_API_KEY`. Use `gpt-5-nano` only for simple repetitive work such as classification, extraction, tagging, or basic summarization. `FIRECRAWL_API_KEY` is required only for the Article link import tab. Paste text and article bookmarks work without Firecrawl. `.env.local` is ignored by Git.
Copy `.env.example` to `.env.local` for local development, then add the real key only to `.env.local` and the Vercel project environment.

Discovery continues to use a transparent interest, recency, and topic heuristic. The model sees only the selected retrieved article, learner level, and bounded interests. Model output is checked server-side before it reaches the reader.

The custom importer accepts one public HTTPS link or a title plus pasted Chinese text. Link mode makes one server-side Firecrawl single-page extraction request; paste mode performs local app validation and normalization without consuming a Firecrawl credit. Both paths isolate the continuous editorial body and remove common page chrome such as navigation, share widgets, editor lines, comments, and recommendation feeds. Imported article bodies stay in current page memory and are not saved to browser storage.

Saved vocabulary uses versioned browser `localStorage` as its offline-first copy. Duplicate identity is based on the normalized term, article ID, and original context sentence. If stored data is malformed or unavailable, the app reports a recoverable error and leaves the existing value untouched.

### Google Drive sync setup

Drive sync is optional and adds no npm dependency or private account database. It uses Google Identity Services and requests only the non-sensitive `drive.appdata` scope. Google stores one hidden `daily-chinese-read-sync.json` file that only this app can access; the short-lived Google access token stays in memory.

1. In Google Cloud Console, create or select a project and enable **Google Drive API**.
2. Configure the OAuth consent screen. Add the two or three readers as test users while the OAuth app remains in testing.
3. Create an **OAuth client ID** of type **Web application**.
4. Add the deployed site origin, such as `https://chinese-news-eta.vercel.app`, under **Authorized JavaScript origins**. For local testing also add the exact origin printed by `vercel dev`, normally `http://localhost:3000`.
5. Add the client ID in Vercel as `GOOGLE_CLIENT_ID`. This identifier is browser-visible configuration, not a secret.
6. Redeploy, open **My Words**, and choose **Connect Google Drive**.

The first connection merges the browser library with the Drive copy. Later saves, reviews, known-word changes, and removals trigger a background sync. On another browser, connecting the same Google account downloads and merges the same library. Deletion timestamps prevent removed records from reappearing. Disconnecting revokes the short-lived authorization while keeping the browser copy.

Related reading uses OpenAI web search against a server-side allowlist of reputable English publishers. The app returns links and short topical descriptions only; subscription links are acceptable and are opened directly at the publisher. Saved articles use a separate versioned browser store containing only canonical URL, title, publication name, and save time—never the article body.

The interface follows `DailyChineseRead_StyleGuide.md`: a light editorial canvas, black Chinese headlines, muted metadata, restrained blue emphasis, compact rounded surfaces, a centered reading column, and simple Home/My Words navigation on mobile.

## Source limitations

- Publisher markup may change; each adapter fails independently and returns a public warning.
- 界面新闻 articles marked as paid are rejected rather than partially displayed.
- Publication time and description use neutral fallbacks when a listing page does not expose reliable metadata.
- Full article text is fetched only after a reader selects a card.
- If AI analysis is unavailable or invalid, the original article remains readable and the user can retry.
- Link import depends on Firecrawl extraction quality; when a link cannot be read, paste the article text instead.
- Google Drive's browser token model may require the reader to click Connect again after the short-lived token expires; local saving continues while disconnected.

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
- `api/related.js` owns reputable English web search and verifies model URLs against the returned search citations.
- `api/client-config.js` exposes only browser-safe Drive configuration; Drive data and tokens never pass through it.
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
