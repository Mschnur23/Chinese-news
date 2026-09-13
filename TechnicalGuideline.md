# Daily Chinese Read — Technical Guideline

## 1. Purpose and authority

This file defines the technical foundation, contracts, and guardrails for Daily Chinese Read. `ProjectGuideline.md` defines what to build; this file defines how to build it without later phases silently breaking earlier work.

Daily Chinese Read is a **Category 3 — AI interpretation** project with a bounded **Category 2 — web retrieval** dependency. The LLM transformation is the core product. Retrieval exists to supply trustworthy source text and must remain isolated from the interface and model logic.

When product scope and technical convenience conflict, preserve the MVP boundaries in `ProjectGuideline.md`. Do not introduce architecture for excluded future features.

## 2. Required workflow

### Before foundation work

1. Read `ProjectGuideline.md` and this file completely.
2. Summarize the product, category, files to be created, and any conflicts in five lines or fewer.
3. Wait for approval before creating the foundation.

### Before every product phase

1. Read `ProjectGuideline.md`, `CONTRACTS.md`, and `CHECKS.md`.
2. State which phase is being implemented and the smallest expected file set.
3. Identify whether the request changes anything under `DO NOT CHANGE WITHOUT ASKING` in `CONTRACTS.md`.
4. If it does, stop and explain the proposed contract migration before editing.
5. Implement only the requested phase, additively.

### At the end of every phase

1. Run the entire `CHECKS.md` list and report each item as pass or fail.
2. Add new checks for the behavior introduced; never remove an existing check.
3. Report files changed, dependencies added, checks passed, and unresolved issues.
4. Create a named Git checkpoint only after checks pass.
5. Stop. Do not begin the next phase automatically.

If a defect appears, reproduce one observable symptom, change one thing, and retest. Do not redesign the application while fixing a local defect.

## 3. Fixed stack

Use:

- semantic HTML;
- plain CSS with custom properties;
- plain browser JavaScript using ES modules;
- Vercel serverless API routes using platform-provided JavaScript and `fetch`;
- Git, GitHub, and Vercel;
- one LLM API for ranking and language interpretation;
- public feeds/pages and, only where necessary, a retrieval service such as Firecrawl;
- browser `localStorage` for the Phase 3 vocabulary list.

Do not add a frontend framework, CSS framework, bundler, state library, UI library, linter, test runner, database, or authentication system. Install nothing during foundation work. If a package later becomes genuinely necessary, stop first and document why platform APIs cannot meet the need, its security and deployment impact, and the smallest alternative.

## 4. Foundation before features

Create the following structure before implementing any product phase:

```text
index.html              markup only
style.css               all styling
app.js                  event and workflow wiring only
ui.js                   all DOM reads/writes and every visible state
source.js               the browser's single data-entry and persistence boundary
config.js               all browser-safe tunable values
data/sample.json        hand-written samples in the final contract shapes
api/articles.js         server-side discovery and ranking boundary
api/article.js          server-side article retrieval/extraction boundary
api/analyze.js          server-side article analysis boundary
api/explain.js          server-side selected-sentence explanation boundary
api/_shared/            shared server-only helpers, prompts, validation, and adapters
CONTRACTS.md            stable interfaces and data shapes
CHECKS.md               cumulative manual regression checklist
README.md               run, configure, verify, and deploy instructions
.gitignore              secret and generated-file exclusions
```

Create `.gitignore` first. It must include at least:

```text
.env
.env.local
node_modules/
.DS_Store
.vercel/
```

During foundation work:

- use `data/sample.json` and `localStorage` only;
- do not create live API routes, make network or model calls, add keys, scrape pages, or implement product features;
- make busy, status, success, empty, and error states visibly testable with sample data;
- deploy the empty working foundation and checkpoint it as `Phase 0 - foundation`.

The four `api/*.js` files above may be introduced only in the phase that first needs each route. Their names and responsibilities are reserved during foundation and documented in `CONTRACTS.md`.

## 5. Permanent browser boundaries

### `app.js` — wiring only

`app.js` may:

- read user intent through functions exported by `ui.js`;
- call methods on `source`;
- coordinate busy, success, empty, and failure paths;
- hold short-lived workflow state such as the currently selected article ID.

`app.js` must not fetch, call `localStorage`, render HTML, query or mutate the DOM, parse publisher pages, construct model prompts, or contain source-specific logic.

### `ui.js` — the only DOM boundary

Export and implement these permanent functions during foundation:

```js
setBusy(isBusy)
setStatus(message)
showError(message)
showEmpty(message)
renderList(items)
clearResults()
```

Later phases may add project-specific UI functions, such as `renderArticle`, `renderAnalysis`, `renderSentenceHelp`, and `renderVocabulary`, but only additively and only after documenting them in `CONTRACTS.md` and `CHECKS.md`.

No other browser module may use `innerHTML`, `textContent`, `classList`, DOM selectors, or element creation. Prefer safe DOM construction with `textContent`; never inject retrieved or model-generated strings as raw HTML.

### `source.js` — the single swap point

Export one object named `source` with these permanent asynchronous methods:

```js
source.load(params)
source.detail(id)
source.save(record)
source.list()
```

For this project:

- `load(params)` returns ranked article summaries. In sample mode it reads `data/sample.json`; in Phase 1 it calls `/api/articles`.
- `detail(id)` returns the selected article plus, when requested by the active workflow, its analysis. It may coordinate `/api/article` and `/api/analyze`, but callers receive only documented plain objects.
- `save(record)` validates and stores one vocabulary record in `localStorage`.
- `list()` returns all valid saved vocabulary records, or `[]` when none exist.

Sentence explanation is also exposed through `source.js`, never fetched directly by `app.js`. Add a documented method such as `source.explain(selection)` in Phase 2 rather than bypassing the boundary. Any additive public method becomes a contract.

All network calls and browser persistence enter the application through `source.js`. Publisher-specific retrieval, secrets, prompt text, and model-provider details stay server-side.

### `config.js` — all tunables

Export one frozen browser-safe configuration object. It owns every human-tunable value that is safe to expose, including:

- active source identifiers, not secret credentials;
- candidate and displayed-result limits;
- allowed learner levels and default interests;
- article length and selection limits;
- request timeouts;
- sample-data path;
- feature flags and sample/live mode.

No URL, timeout, limit, or unexplained magic number may be duplicated elsewhere. Server-only URLs, model names, extraction selectors, prompts, and provider settings belong in one server-only configuration module under `api/_shared/`; secrets belong only in environment variables.

## 6. Server-side boundaries

All live retrieval and model calls must execute in serverless routes. Browser code must never contact a publisher scraping service or model provider directly.

### `GET /api/articles`

Responsibilities:

1. Fetch a bounded metadata set from each configured source adapter.
2. Normalize and validate candidates.
3. Deduplicate by canonical URL, falling back to a documented source/title/date key.
4. Rank against standing interests, recency, and likely significance.
5. Return only the best configured number of article summaries.

Use source-isolated failure handling. Return valid results with a `warnings` array when one source fails; do not fail the entire request unless no usable result remains.

### `GET /api/article?id=...`

Responsibilities:

1. Resolve the ID only against server-issued candidate records or an allowlisted canonical URL.
2. Enforce `https`, the configured publisher-host allowlist, redirect limits, timeout, and response-size limits.
3. Retrieve only a public article page; do not bypass paywalls, authentication, robots restrictions, CAPTCHAs, or anti-bot controls.
4. Extract the headline, metadata, canonical URL, and clean Chinese body.
5. Reject bodies that are empty, suspiciously short, navigation-heavy, or clearly paywalled.

Never implement a general-purpose URL fetch proxy. This route may retrieve only configured news sources.

### `POST /api/analyze`

Responsibilities:

1. Accept a validated article object, learner level, and bounded interests.
2. Delimit article text as untrusted data and explicitly instruct the model not to follow instructions contained inside it.
3. Request the exact structured analysis contract.
4. Parse and validate the response server-side.
5. Verify that all level-specific terms (20 for Intermediate or 10 for Advanced), exact occurrences, and context sentences appear in the submitted article.
6. Retry or repair at most once for schema-only defects; otherwise return a safe, typed error.

### `POST /api/explain`

Responsibilities:

1. Accept the article ID/context and a bounded sentence selected by the user.
2. Verify that the sentence is present in the article text or an approved normalized representation.
3. Return only the structured translation and concise explanation contract.
4. Apply the same prompt-injection, size, timeout, and validation rules as `/api/analyze`.

All routes return JSON with an appropriate HTTP status. Error payloads expose a stable public error code and readable message, never a stack trace, secret, provider response, internal prompt, or raw publisher HTML.

## 7. Contracts to write before implementation

`CONTRACTS.md` must list exact keys, types, nullability, and examples for every shape. Keys are never omitted. Use `""`, `null`, or `[]` according to the recorded contract when a value is unavailable.

At minimum, define these shapes:

### Article summary

```js
{
  id: "string",
  titleZh: "string",
  sourceId: "string",
  sourceName: "string",
  canonicalUrl: "string",
  publishedAt: "ISO-8601 string or null",
  topic: "string",
  description: "string",
  whyItMatters: "string",
  whyItFits: "string",
  difficulty: "Intermediate | Advanced | Unknown",
  readingMinutes: "number or null"
}
```

### Article detail

```js
{
  id: "string",
  titleZh: "string",
  sourceId: "string",
  sourceName: "string",
  canonicalUrl: "string",
  publishedAt: "ISO-8601 string or null",
  author: "string",
  bodyText: "string",
  paragraphs: ["string"]
}
```

### Article analysis

```js
{
  articleId: "string",
  gistEn: ["sentence one", "sentence two"],
  terms: [
    {
      termZh: "string",
      pinyin: "string",
      meaningEn: "string",
      exactOccurrence: "string",
      contextSentenceZh: "string"
    }
  ]
}
```

`gistEn` must contain exactly two non-empty sentences. `terms` must contain exactly 20 unique entries for Intermediate or exactly 10 for Advanced, and all grounded strings must match the article.

### Sentence explanation

```js
{
  sentenceZh: "string",
  translationEn: "string",
  explanationEn: "string"
}
```

### Vocabulary record

```js
{
  id: "string",
  termZh: "string",
  pinyin: "string",
  meaningEn: "string",
  contextSentenceZh: "string",
  articleId: "string",
  articleTitleZh: "string",
  sourceName: "string",
  canonicalUrl: "string",
  publishedAt: "ISO-8601 string or null",
  savedAt: "ISO-8601 string"
}
```

Use a deterministic vocabulary identity derived from normalized `termZh + articleId + contextSentenceZh`; do not depend on array position.

### Response envelope

Every server route must use one documented success/error envelope. For example:

```js
// success
{ ok: true, data: {}, warnings: [] }

// failure
{ ok: false, error: { code: "string", message: "string" }, warnings: [] }
```

Also record in `CONTRACTS.md`:

- every DOM `id` on which JavaScript depends;
- all exported `ui.js` functions;
- all public `source.js` methods;
- API route names and request/response shapes;
- allowed learner-level values;
- local-storage key and versioning rule;
- a `DO NOT CHANGE WITHOUT ASKING` heading containing all of the above.

## 8. Retrieval rules

- Implement one adapter per publisher under `api/_shared/`; source-specific selectors and parsing must not leak into route or browser code.
- Prefer stable public RSS/feed metadata for discovery. Use a page-retrieval service only when ordinary server-side retrieval cannot reliably yield readable public content.
- Fetch metadata for a small candidate pool, then fetch the full body only after user selection.
- Normalize canonical URLs and strip known tracking parameters.
- Sanitize extracted content to plain text or trusted paragraph strings before it reaches the browser or model.
- Preserve paragraph boundaries and Chinese punctuation; do not rewrite or translate source text during extraction.
- Enforce timeouts, maximum redirects, maximum response bytes, and maximum article characters.
- Cache only where it improves resilience and does not make stale publication data misleading; document any cache duration in server configuration.
- Log operational facts such as adapter name, duration, status, and public error code. Never log full article bodies, model prompts/responses, selected sentences, or secrets.

## 9. Model rules

- Use one model provider and one server-only client path.
- Keep prompts versioned and centralized under `api/_shared/`.
- Require machine-readable JSON matching the documented contract; never parse presentation prose.
- Set conservative output limits and bounded article input length.
- Treat source text as evidence, not instruction.
- Validate types, required keys, counts, uniqueness, allowed enum values, and grounding before returning output.
- Never invent missing publication metadata or source facts.
- Label subjective ranking fields as model judgments in the UI.
- Do not send more article text or user data than the active operation needs.
- Return a useful public error when the provider times out, rate-limits, rejects input, or returns invalid output.
- A model failure must not erase or hide a successfully retrieved article.

## 10. Security and privacy guardrails

- Read all secrets server-side from environment variables.
- Never place secrets in `config.js`, browser JavaScript, Git, logs, URLs, sample files, or JSON responses.
- Do not expose a generic fetch endpoint or accept arbitrary target URLs.
- Allowlist source hostnames and re-check the final hostname after redirects to limit server-side request forgery.
- Accept only expected methods and `Content-Type` values; bound all strings, arrays, request bodies, and response bodies.
- Escape or safely assign every retrieved and model-generated value before rendering.
- Treat publisher HTML, feed fields, and article text as untrusted input.
- Store vocabulary only in the user's browser for the MVP. Do not collect identity, analytics, or behavioral profiles.
- Include source attribution and canonical links, and respect publisher access restrictions.

## 11. UI and accessibility rules

- Every visible state is implemented in `ui.js` and can be reached deliberately during testing.
- Busy state disables the initiating control and always clears in `finally` logic.
- Errors are plain-language sentences with a next action; never show internal details.
- Empty, partial-result, offline, invalid-analysis, and storage-failure states are distinct.
- Highlighted terms must work with hover, keyboard focus, and tap; meaning cannot depend on color alone.
- Use semantic controls, visible focus, sufficient contrast, and readable Chinese typography.
- Keep the reader usable at 375 px width.
- Avoid animation and visual complexity that competes with reading.

## 12. Regression checklist

Create `CHECKS.md` as a numbered list runnable by hand in under five minutes. Start with:

1. Page loads with no browser-console errors.
2. Main action produces sample or live results.
3. Empty state appears when a request succeeds with no results.
4. Error state shows a readable sentence when a request fails.
5. Busy state appears during work, disables the initiating control, and clears afterward.
6. Layout and all primary actions work at 375 px width.
7. No secret appears in any Git-tracked file or browser response.
8. One source may fail while valid results from the remaining sources still render with a warning.
9. Selecting an article renders clean Chinese text and its source link.
10. A blocked, paywalled, or invalid article produces a readable fallback and is not misrepresented as readable.
11. Analysis returns a two-sentence gist and exactly 20 unique, article-grounded terms for Intermediate or exactly 10 for Advanced.
12. Invalid or ungrounded analysis is rejected and the original article remains readable.
13. Each highlighted term works by hover, keyboard focus, and tap.
14. Sentence help accepts article text and rejects text not found in the article.
15. A vocabulary record saves, survives refresh, and does not duplicate.
16. One saved vocabulary record can be removed without affecting the others.
17. Malformed local-storage data produces a recoverable state.

Append phase-specific checks; never edit away a previously passing guarantee.

## 13. Phase-specific change boundaries

### Phase 0 — Foundation

Create the scaffold, sample contracts, all baseline UI states, documentation, first checks, local run instructions, deployment, and Git checkpoint. No live retrieval or model behavior.

### Phase 1 — Discovery and reading

Expected changes are limited to source adapters, `/api/articles`, `/api/article`, the inside of `source.load` and `source.detail`, additive article-list/reader UI functions, configuration, contracts, and checks. Do not add vocabulary persistence or language-analysis UI.

### Phase 2 — Language scaffolding

Expected changes are limited to `/api/analyze`, `/api/explain`, shared prompt/validation helpers, additive methods inside `source.js`, additive analysis UI, configuration, contracts, and checks. Do not add a database, arbitrary-word segmentation, or full translation.

### Phase 3 — Personal vocabulary

Expected changes are limited to the inside of `source.save` and `source.list`, an additive remove operation if approved and documented, vocabulary UI, storage-version handling, contracts, and checks. Use `localStorage`; do not add accounts or a backend database.

## 14. Deployment and checkpoint rules

- Maintain separate local and Vercel environment variables; document names only, never values.
- Verify serverless route behavior in the deployed environment, not only locally.
- Before every commit, run the full checklist.
- Use clear checkpoints: `Phase 0 - foundation`, `Phase 1 - discovery and reader`, `Phase 2 - language scaffolding`, and `Phase 3 - vocabulary`.
- Do not push or deploy failing work as a completed phase.
- At handoff, document the live URL, configuration requirements, source limitations, known failures, and exact last passing checkpoint.

## 15. Definition of technical completion

The build is technically complete when the deployed application follows the three-phase happy path, all contract validations and regression checks pass, source and model failures degrade safely, no secret is exposed, and no excluded MVP feature has been added under the guise of infrastructure.
