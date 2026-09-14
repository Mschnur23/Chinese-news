# Phase 4 — Bring Your Own Article

## Status

Implementation specification only. No product functionality is changed by this file.

## Goal

Let a reader bring Chinese material into Daily Chinese Read in either of two ways:

- Paste the HTTPS link to a publicly readable article.
- Paste Chinese article text directly.

After import, the material must use the existing reading experience: original Chinese paragraphs, learner-level vocabulary, word-only highlights, tapped-word help, sentence help, article-in-brief, and vocabulary saving.

## Product principles

- Keep the imported Chinese intact. Do not rewrite it into graded Chinese.
- Treat imported URLs, metadata, and text as untrusted input.
- Import only the article content returned through the configured extraction path.
- Do not retain imported article text on the server.
- Make pasted text usable even when the URL extraction service is unavailable.
- Run AI analysis only after import validation succeeds and the reader opens the normalized article.
- Preserve all Phase 1–3 behavior and styling.

## User experience

Add a restrained **Use your own article** action near the existing reading controls. It opens an import view with two tabs.

### Link tab

Fields:

- Article URL — required, HTTPS only.
- Mandarin level — Intermediate or Advanced.

Flow:

1. The reader pastes a public article URL.
2. The interface shows an extracting state.
3. The server extracts the main article content and normalizes it into the imported-article contract.
4. The interface shows a compact preview: title, publication/domain, approximate length, and image when available.
5. The reader chooses **Open reading**.
6. The existing reader and language-support workflow runs on that normalized article.

Include a short disclosure: the URL is sent to the configured extraction provider. Do not send cookies, account credentials, custom headers, or browser history.

### Paste text tab

Fields:

- Title — required.
- Source name — optional.
- Original article URL — optional, but HTTPS when present.
- Article text — required.
- Mandarin level — Intermediate or Advanced.

Flow:

1. The reader pastes the title and Chinese article text.
2. The browser submits only those fields to the import route for validation and normalization.
3. No extraction provider is called.
4. A preview is shown, followed by the same **Open reading** action.
5. OpenAI receives the bounded article text only when the existing learning-material analysis begins.

Provide a visible reminder not to paste private, confidential, or account-only material.

## Normalized contract

Every successful import returns the existing API envelope and a complete object with no omitted keys:

```js
{
  id: "import:<stable content hash>",
  originType: "url | text",
  titleZh: "string",
  sourceId: "user-import",
  sourceName: "string",
  sourceHomepageUrl: "https URL | empty string",
  sourceDescription: "string | empty string",
  canonicalUrl: "https URL | empty string",
  imageUrl: "https URL | empty string",
  publishedAt: "ISO date | null",
  author: "string | empty string",
  bodyText: "string",
  paragraphs: ["string"]
}
```

Rules:

- Generate the ID server-side from normalized title, canonical URL, and body text; never accept an ID supplied by the browser.
- Keep paragraph boundaries and Chinese punctuation.
- Require meaningful Chinese content rather than a navigation page or metadata-only result.
- Strip scripts, styles, forms, tracking markup, repeated navigation, and unsafe HTML.
- Return plain text and HTTPS image URLs only. Never return publisher HTML.
- An absent source link or description renders nothing; do not show placeholder copy.
- Imported articles exist only in current page memory. Vocabulary records may retain their existing bounded context fields.

## URL extraction design

Use a new server-only import adapter. The recommended first provider is Firecrawl because its single-page scrape endpoint can return main-content Markdown, metadata, and image information without adding a browser-side scraping dependency.

Server request profile:

- Endpoint: `POST https://api.firecrawl.dev/v2/scrape`.
- Authentication: `FIRECRAWL_API_KEY`, read server-side only.
- Request only one URL.
- Use main-content extraction and a conservative timeout.
- Request only the fields needed to build the imported-article contract.
- Disable provider storage/cache when supported.
- Do not use browser actions, custom headers, saved sessions, enhanced proxying, or TLS bypass.
- Validate the provider response as untrusted data before returning it.

The app server must never fetch the user-supplied site directly. It may call only the configured extraction-provider host. This preserves the project's prohibition against exposing a general-purpose fetch proxy.

If `FIRECRAWL_API_KEY` is missing, the Link tab returns a clear configuration message while Paste text remains available.

Official reference: [Firecrawl single-page scrape API](https://docs.firecrawl.dev/api-reference/endpoint/scrape).

## Validation and safety boundary

The import route must:

- Accept `POST` with JSON only.
- Reject requests above the configured byte limit before parsing.
- Accept only `mode: "url"` or `mode: "text"`.
- Accept only HTTPS URLs without credentials.
- Reject localhost, private/reserved IPs, non-public hostnames, URL shorteners, and unsupported ports.
- Normalize internationalized hostnames before validation.
- Limit redirects through the provider configuration where supported.
- Reject extracted or pasted text outside configured minimum and maximum lengths.
- Require a configured minimum amount of Han-script text.
- Bound title, source, author, paragraph count, image URL, and metadata lengths.
- Never log the imported body, provider payload, model prompt, URL query string, or secrets.
- Return only stable public error codes and readable messages.
- Never expose the Firecrawl or OpenAI response directly to the browser.

Suggested public errors:

- `IMPORT_MODE_INVALID`
- `IMPORT_URL_INVALID`
- `IMPORT_URL_UNSUPPORTED`
- `IMPORT_TEXT_TOO_SHORT`
- `IMPORT_TEXT_TOO_LONG`
- `IMPORT_NOT_CHINESE`
- `IMPORT_EXTRACTION_UNAVAILABLE`
- `IMPORT_ARTICLE_UNREADABLE`
- `IMPORT_PROVIDER_NOT_CONFIGURED`

## Cost and privacy behavior

- Paste mode uses no extraction credit.
- Link mode uses one single-page extraction request.
- Extraction is deterministic; do not use an LLM to clean the article unless a later measured need justifies it.
- Reuse the existing `gpt-5-mini` analysis path after normalization.
- Keep prompts and returned learning material concise.
- Do not save imported bodies in localStorage, logs, analytics, or a database.
- Clearly disclose that URL imports go to the extraction provider and article text goes to OpenAI when learning support is prepared.

## Architecture changes for implementation

This phase changes a protected contract, so implementation must update `CONTRACTS.md` before code is committed.

Additive seams:

- `source.importArticle(input)` — the only new browser data-entry method.
- `POST /api/import` — validates input and returns one normalized imported article.
- `api/_shared/import.js` — shared normalization, URL checks, and provider-response validation.
- `api/_shared/import-adapters/firecrawl.js` — the only module that knows the provider API.
- New `ui.js` functions for opening, closing, validating, previewing, loading, empty, and error states.
- `app.js` coordinates those functions and passes the normalized result into the existing reader workflow.
- New limits, route names, timeouts, and flags live in `config.js` or `api/_shared/server-config.js`.

Expected implementation files:

- `index.html`
- `style.css`
- `app.js`
- `ui.js`
- `source.js`
- `config.js`
- `api/import.js`
- `api/_shared/import.js`
- `api/_shared/import-adapters/firecrawl.js`
- `.env.example`
- `CONTRACTS.md`
- `CHECKS.md`
- `README.md`
- `scripts/check-guidelines.mjs`
- `data/sample.json`

No frontend framework, CSS framework, bundler, database, authentication system, or new client dependency is needed.

## Implementation sequence

1. Update contracts, configuration, sample shapes, and automated checks.
2. Build and test pasted-text normalization without Firecrawl.
3. Add the import view and preview states through `ui.js`.
4. Wire `source.importArticle()` and `app.js` to the pasted-text route.
5. Confirm imported text uses the existing analysis, highlighting, word-help, sentence-help, and vocabulary flows.
6. Add the Firecrawl adapter and Link-tab extraction behind a feature/configuration check.
7. Test failures independently: invalid URL, unavailable provider, unreadable page, non-Chinese text, oversized text, and model failure.
8. Run the complete cumulative checks at desktop width, 375 px, and 200% text zoom.
9. Verify that no secret, imported body, or provider payload appears in Git, browser code, logs, or public errors.
10. Commit, push, deploy, and verify both import paths on the public Vercel URL only after explicit approval.

## Acceptance criteria

- A valid pasted Chinese article opens in the existing reader without losing paragraph boundaries.
- A supported public URL produces the same normalized reader structure.
- Intermediate produces exactly 20 grounded vocabulary terms; Advanced produces exactly 10.
- Only vocabulary words or short lexical phrases are highlighted.
- Tapped-word help appears beside the tapped word.
- Sentence help accepts only text from the imported article.
- Saved vocabulary keeps its imported source context without saving the full article.
- Missing optional metadata produces no fabricated placeholder text.
- Invalid, unreadable, private, non-Chinese, or oversized input fails with a readable message.
- Failure in URL extraction does not disable Paste text.
- Failure in AI analysis does not hide the imported article.
- Existing curated-article discovery and reading behavior remains unchanged.
- All previous checks continue to pass and new import checks are added rather than replacing old ones.

## Explicitly out of scope

- Crawling multiple pages or an entire site.
- Search, recommendations, or automatic discovery from the pasted URL.
- Uploading PDFs or office documents.
- Saving complete imported articles or maintaining reading history.
- Full-article translation or graded-Chinese rewriting.
- Sharing imported content between users.
