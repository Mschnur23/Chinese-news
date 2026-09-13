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
  sourceHomepageUrl: "https URL",
  sourceDescription: "string",
  canonicalUrl: "string",
  publishedAt: "ISO-8601 string | null",
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
  terms: [{
    termZh: "string",
    pinyin: "string",
    meaningEn: "string",
    exactOccurrence: "string",
    contextSentenceZh: "string"
  }]
}
```

`gistEn` contains exactly two non-empty sentences. `terms` contains exactly 10 unique entries. Every `termZh`, `exactOccurrence`, and `contextSentenceZh` must be present in the selected article.

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
  publishedAt: "ISO-8601 string | null",
  savedAt: "ISO-8601 string"
}
```

Vocabulary identity is deterministic: normalized `termZh + articleId + contextSentenceZh`. Array position is never part of identity.

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
- `source.analyze(article, learnerLevel)` → `ArticleAnalysis`.
- `source.explain({ article, sentenceZh, learnerLevel })` → `SentenceExplanation`.
- `source.save(record)` → `{ added: boolean, record: VocabularyRecord, records: VocabularyRecord[] }`.
- `source.list()` → `VocabularyRecord[]`.
- `source.remove(id)` → `{ removed: boolean, records: VocabularyRecord[] }`.

All browser network and persistence operations enter through `source.js`.

External URLs, route paths, timeouts, result limits, and feature switches live only in `config.js` or the server-only `api/_shared/server-config.js`.

### Learner levels

Allowed values are `Intermediate` and `Advanced`.

### Browser storage

- Key: `daily-chinese-read:v1:vocabulary`.
- Version: `1`.
- Stored value in Phase 3: `{ version: 1, records: VocabularyRecord[] }`.
- Unknown versions or malformed values produce a recoverable storage error and are never silently overwritten.

### Source identifiers

- `the-paper` → 澎湃新闻.
- `stcn` → 证券时报.
- `jiemian` → 界面新闻.

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
- `onTermSaveRequested(handler)`, `setTermSaveBusy(index, isBusy)`, `showTermSaveResult(index, isSaved, message)`, `markSavedTerms(records)`, `onVocabularyRequested(handler)`, `onVocabularyBack(handler)`, `onVocabularyRemoveRequested(handler)`, `showVocabularyView()`, `hideVocabularyView()`, `setVocabularyBusy(isBusy)`, `setVocabularyRemoveBusy(id, isBusy)`, `setVocabularyCount(count)`, `showVocabularyError(message, clearList)`, `showVocabularyEmpty(message)`, and `renderVocabulary(records)` are additive `ui.js` exports.
- Phase 3 adds DOM IDs `open-vocabulary`, `vocabulary-count`, `vocabulary-save-status`, `vocabulary`, `vocabulary-back`, `vocabulary-status`, `vocabulary-notice`, and `vocabulary-list`.
