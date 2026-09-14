# Daily Chinese Read — Stable Contracts

This file records the interfaces that later phases must preserve. All documented keys are required and are never omitted. Unavailable strings use `""`, unavailable dates and numbers use `null`, and unavailable collections use `[]`.

## Data shapes

### Article summary

```js
{
  id: "string",
  titleZh: "string",
  sourceId: "string",
  sourceName: "string",
  canonicalUrl: "string",
  imageUrl: "https URL | empty string",
  publishedAt: "ISO-8601 string | null",
  topic: "string",
  description: "string",
  whyItMatters: "string",
  whyItFits: "string",
  difficulty: "Intermediate | Advanced | Unknown",
  readingMinutes: "number | null"
}
```

### Article detail

```js
{
  id: "string",
  titleZh: "string",
  sourceId: "string",
  sourceName: "string",
  sourceHomepageUrl: "https URL | empty string for imported text",
  sourceDescription: "string",
  canonicalUrl: "https URL | empty string for imported text",
  imageUrl: "https URL | empty string",
  publishedAt: "ISO-8601 string | null",
  author: "string",
  bodyText: "string",
  paragraphs: ["string"]
}
```

### Imported article

An imported article is an `ArticleDetail` with these additional invariants:

```js
{
  id: "user-import:<16 lowercase hexadecimal characters>",
  originType: "url | text",
  sourceId: "user-import"
}
```

Its title, canonical URL, and normalized body determine its stable server-issued ID. Imported bodies remain in current page memory only. Missing optional author, image, source description, homepage, original link, or date values render nothing rather than fabricated placeholder copy.

### Article analysis

```js
{
  articleId: "string",
  gistEn: ["sentence one", "sentence two"],
  terms: [{
    termZh: "string",
    pinyin: "string",
    meaningEn: "string",
    exactOccurrence: "string",
    contextSentenceZh: "string"
  }]
}
```

`gistEn` contains exactly two non-empty sentences. `terms` contains exactly 20 unique entries for `Intermediate` and exactly 10 for `Advanced`. Every `termZh`, `exactOccurrence`, and `contextSentenceZh` must be present in the selected article.

The model selects only level-appropriate difficult or useful candidates, then orders them by descending exact-occurrence frequency. Frequency must not promote easy function words. Equal-frequency terms remain in the model's difficulty/usefulness priority order. The server verifies grounding and normalizes the final frequency ordering before returning the analysis.

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
  canonicalUrl: "https URL | empty string",
  publishedAt: "ISO-8601 string | null",
  savedAt: "ISO-8601 string",
  reviewStage: "non-negative integer",
  reviewDueAt: "ISO-8601 string",
  lastReviewedAt: "ISO-8601 string | null",
  reviewCount: "non-negative integer",
  lapseCount: "non-negative integer"
}
```

Vocabulary identity is deterministic: normalized `termZh + articleId + contextSentenceZh`. Array position is never part of identity.

Older records without review fields are read as new cards due at `savedAt`. Ratings schedule the next review locally: Again returns the card in 10 minutes, Good advances one interval, and Easy advances two intervals.

### Known word

```js
{ termZh: "string", normalized: "string", knownAt: "ISO-8601 string" }
```

Known words are excluded from later analysis requests. Marking a term known removes saved review records for that normalized term. Restoring it permits future selection again.

### Contextual word help

```js
{ termZh: "string", pinyin: "string", meaningEn: "string", contextSentenceZh: "string" }
```

The selected term and context must both match the submitted article before and after model interpretation.

### Related English article

```js
{ titleEn: "string", publication: "string", url: "https URL", descriptionEn: "string" }
```

Related reading contains exactly three unique English-language links from the configured reputable-domain allowlist. Every URL must be present in the Responses API web-search citations. Links may require a publisher subscription; the application does not fetch or reproduce the linked article body.

### Saved article

```js
{ id: "canonical https URL", canonicalUrl: "canonical https URL", titleZh: "string", sourceName: "string", savedAt: "ISO-8601 string" }
```

Saved-article identity is its normalized canonical URL. The browser store contains only the link and display metadata above—never article text.

### Response envelope

Every server route returns one of:

```js
{ ok: true, data: {}, warnings: [] }
{ ok: false, error: { code: "string", message: "string" }, warnings: [] }
```

Keys are always present. Public errors contain no stack traces, provider output, prompts, secrets, or publisher HTML.

## Reserved API routes

| Route | Method | Introduced | Responsibility |
| --- | --- | --- | --- |
| `/api/articles` | `GET` | Phase 1 | Discover, normalize, deduplicate, rank, and return article summaries. |
| `/api/article?id=…` | `GET` | Phase 1 | Retrieve and extract one allowlisted public article. |
| `/api/analyze` | `POST` | Phase 2 | Validate an article and return grounded language analysis. |
| `/api/explain` | `POST` | Phase 2 | Explain a bounded sentence verified against an article. |
| `/api/word` | `POST` | Learning loop | Explain one tapped article word in its verified sentence context. |
| `/api/import` | `POST` | Phase 4 | Validate pasted text or extract one public HTTPS article and return an imported article. |
| `/api/related` | `POST` | Phase 5 | Search for and return three verified reputable English links on the article topic. |

## DO NOT CHANGE WITHOUT ASKING

### DOM IDs

- `load-reading` — initiates sample/live discovery.
- `preview-state` — exposes deliberate foundation test states.
- `status-message` — polite live workflow status.
- `notice` — warning, empty, and error message region.
- `article-list` — article summary collection.
- `result-count` — rendered result count.

### `ui.js` exports

- Permanent: `setBusy(isBusy)`, `setStatus(message)`, `showError(message)`, `showEmpty(message)`, `renderList(items)`, `clearResults()`.
- Foundation additions: `showNotice(message)`, `onLoadRequested(handler)`, `onPreviewStateChanged(handler)`, `getPreviewState()`.

Only `ui.js` may read from or write to the DOM.

The normal site URL uses live data. Adding `?preview=1` switches that browser session to hand-written sample data and reveals the success, partial-source, empty, and error controls without editing configuration files.

### `source.js` public methods

- `source.load(params)` → `{ items: ArticleSummary[], warnings: string[] }`. Foundation-only test parameters may simulate an isolated source failure; they are removed when Phase 1 replaces sample loading.
- `source.detail(id)` → `ArticleDetail`.
- `source.analyze(article, learnerLevel, knownTerms)` → `ArticleAnalysis` with normalized known terms excluded.
- `source.explain({ article, sentenceZh, learnerLevel })` → `SentenceExplanation`.
- `source.save(record)` → `{ added: boolean, record: VocabularyRecord, records: VocabularyRecord[] }`.
- `source.list()` → `VocabularyRecord[]`.
- `source.remove(id)` → `{ removed: boolean, records: VocabularyRecord[] }`.
- `source.reviewQueue(now)` → due `VocabularyRecord[]` ordered by due time.
- `source.review(id, rating, now)` → `{ record: VocabularyRecord, records: VocabularyRecord[] }`.
- `source.listKnown()` → `KnownWord[]`.
- `source.markKnown(termZh)` and `source.unmarkKnown(termZh)` update the known-word store.
- `source.lookupWord({ article, termZh, contextSentenceZh, learnerLevel })` → `ContextualWordHelp`.
- `source.importArticle(input)` → one normalized imported `ArticleDetail`; pasted text and link extraction both enter through this method.
- `source.related(article)` → `{ items: RelatedArticle[] }` containing exactly three verified links.
- `source.saveArticle(article)`, `source.listArticles()`, and `source.removeArticle(id)` are the saved-article persistence boundary.

All browser network and persistence operations enter through `source.js`.

External URLs, route paths, timeouts, result limits, and feature switches live only in `config.js` or the server-only `api/_shared/server-config.js`.

### Learner levels

Allowed values are `Intermediate` and `Advanced`.

### Browser storage

- Key: `daily-chinese-read:v1:vocabulary`.
- Version: `1`.
- Stored value in Phase 3: `{ version: 1, records: VocabularyRecord[] }`.
- Known-word key: `daily-chinese-read:v1:known-words`; stored value: `{ version: 1, words: KnownWord[] }`.
- Unknown versions or malformed values produce a recoverable storage error and are never silently overwritten.
- Saved-article key: `daily-chinese-read:v1:articles`; stored value: `{ version: 1, records: SavedArticle[] }`.

### Source identifiers

- `the-paper` → 澎湃新闻.
- `stcn` → 证券时报.
- `jiemian` → 界面新闻.
- `user-import` → a reader-supplied article held in current page memory.

This replaces the Phase 0 `yicai` identifier and migrates the source set from two to three active publishers with the user's approval on 2026-09-13.

### Phase 1 API details

- `GET /api/articles?interests=comma,separated` returns `{ ok: true, data: { items: ArticleSummary[] }, warnings: string[] }`.
- `GET /api/article?id=source:numericId` returns `{ ok: true, data: ArticleDetail, warnings: [] }`.
- Every `ArticleDetail` includes the trusted publication homepage and a concise publication description for the end-of-article source note.
- Article IDs are server-issued values matching `the-paper:<digits>`, `stcn:<digits>`, or `jiemian:<digits>`; arbitrary URLs are never accepted.
- `renderArticle(article)`, `clearReader()`, `setArticleBusy(isBusy)`, `showArticleError(message)`, `onArticleSelected(handler)`, `onReaderBack(handler)`, and `setPreviewControlsVisible(isVisible)` are additive `ui.js` exports.
- Phase 1 adds DOM IDs `reading-list`, `reader`, `reader-back`, `reader-status`, `reader-error`, `reader-content`, and `preview-state-control`.

### Phase 2 API and UI details

- `POST /api/analyze` accepts `{ article: ArticleDetail, learnerLevel, interests }` and returns a validated `ArticleAnalysis` envelope.
- `POST /api/explain` accepts `{ article: ArticleDetail, sentenceZh, learnerLevel }` and returns a validated `SentenceExplanation` envelope.
- Both routes accept JSON only, bound request sizes, treat article text as untrusted input, use server-only provider credentials, and expose no provider response or prompt text in errors.
- `clearAnalysis(article)`, `getLearnerLevel()`, `onAnalysisRequested(handler)`, `onSentenceHelpRequested(handler)`, `renderAnalysis(article, analysis)`, `renderSentenceHelp(explanation)`, `setAnalysisBusy(isBusy)`, `setSentenceHelpBusy(isBusy)`, `showAnalysisError(message)`, and `showSentenceHelpError(message)` are additive `ui.js` exports.
- Phase 2 adds DOM IDs `language-tools`, `learner-level`, `analyze-article`, `analysis-status`, `analysis-error`, `analysis-panel`, `analysis-gist`, `analysis-terms`, `sentence-tools`, `explain-sentence`, `selection-preview`, `sentence-status`, `sentence-error`, and `sentence-result`.

### Phase 3 persistence and UI details

- `source.save(record)`, `source.list()`, and `source.remove(id)` are the only vocabulary persistence boundary and use the versioned browser-storage contract above.
- `source.save(record)` computes `id` from normalized `termZh + articleId + contextSentenceZh` and assigns `savedAt`; duplicate identities return the existing record without adding a row.
- Invalid JSON, unknown storage versions, invalid records, duplicate stored identities, unavailable storage, and failed writes raise a readable recoverable error. Existing malformed data is never overwritten.
- `onTermSaveRequested(handler)`, `setTermSaveBusy(index, isBusy)`, `showTermSaveResult(index, isSaved, message)`, `markSavedTerms(records)`, `onVocabularyRequested(handler)`, `onHomeRequested(handler)`, `onVocabularyBack(handler)`, `onVocabularyRemoveRequested(handler)`, `showVocabularyView()`, `hideVocabularyView()`, `setVocabularyBusy(isBusy)`, `setVocabularyRemoveBusy(id, isBusy)`, `setVocabularyCount(count)`, `showVocabularyError(message, clearList)`, `showVocabularyEmpty(message)`, and `renderVocabulary(records)` are additive `ui.js` exports.
- Phase 3 and the approved style-guide pass add DOM IDs `open-vocabulary`, `vocabulary-count`, `vocabulary-save-status`, `vocabulary`, `vocabulary-back`, `vocabulary-status`, `vocabulary-notice`, `vocabulary-list`, `mobile-home`, `mobile-vocabulary`, `home-intro`, and `reading-controls`.
- The learning loop adds contextual word help, review queue/session, and known-word controls through the documented `word-help-*`, `review-*`, and `known-words*` DOM IDs.

### Phase 4 import API and UI details

- `POST /api/import` accepts JSON only. Link input is `{ mode: "url", url, learnerLevel }`; pasted input is `{ mode: "text", titleZh, sourceName, canonicalUrl, text, learnerLevel }`.
- Link mode calls only the configured Firecrawl single-page extraction endpoint with the server-side `FIRECRAWL_API_KEY`. Paste mode never calls Firecrawl.
- The route accepts public HTTPS URLs without credentials, rejects unsafe network targets, bounds request and response sizes, requires meaningful Chinese text, and returns only the standard response envelope.
- `onImportRequested(handler)`, `onImportBack(handler)`, `onImportModeChanged(handler)`, `onImportSubmitted(handler)`, `onImportedArticleOpen(handler)`, `showImportView()`, `hideImportView(restoreHome)`, `setImportMode(mode)`, `getImportInput()`, `setImportBusy(isBusy)`, `showImportError(message)`, `clearImportPreview()`, `renderImportPreview(article)`, and `setLearnerLevel(value)` are additive `ui.js` exports.
- Phase 4 adds DOM IDs `open-import`, `import-view`, `import-back`, `import-tab-url`, `import-tab-text`, `import-form`, `import-url-panel`, `import-url`, `import-text-panel`, `import-title-input`, `import-source-input`, `import-original-url`, `import-text`, `import-level`, `import-submit`, `import-status`, `import-error`, `import-preview`, `import-preview-content`, and `open-imported-article`.
- Opening an imported article passes the normalized object into the existing reader, analysis, highlighting, contextual word-help, sentence-help, and vocabulary workflows without a second article fetch.

### Phase 5 related reading and saved-article details

- `POST /api/related` accepts `{ article: ArticleDetail }`, validates and bounds the article, and uses the server-side `OPENAI_API_KEY` with the Responses API web-search tool.
- Existing language work uses `OPENAI_MODEL` (default `gpt-5-mini`). Related web search uses `OPENAI_SEARCH_MODEL` (default `gpt-5.5`) and a server-side reputable-publication allowlist.
- Returned links must be HTTPS, unique, allowlisted, and present in provider search citations. Subscriber-only destinations are allowed, but the app never bypasses access or fetches their article bodies.
- `onArticleSaveRequested(handler)`, `setArticleSaveBusy(isBusy)`, `showArticleSaveResult(isSaved, message)`, `markArticleSaved(records)`, `clearRelatedReading()`, `setRelatedReadingBusy(isBusy)`, `renderRelatedReading(items)`, `showRelatedReadingError(message)`, `onRelatedReadingRetry(handler)`, `renderSavedArticles(records)`, `showSavedArticlesEmpty(message)`, `showSavedArticlesError(message)`, `setSavedArticleRemoveBusy(id, isBusy)`, and `onSavedArticleRemoveRequested(handler)` are additive `ui.js` exports.
- Phase 5 adds DOM IDs `reader-save`, `save-article`, `article-save-status`, `related-reading`, `related-reading-title`, `related-reading-status`, `related-reading-error`, `related-reading-list`, `related-reading-retry`, `saved-articles`, `saved-articles-title`, `saved-articles-status`, `saved-articles-notice`, and `saved-articles-list`.
