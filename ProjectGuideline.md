# Daily Chinese Read — Project Guideline

## 1. Product definition

Daily Chinese Read is a personalized reader for advanced Mandarin learners. It surfaces a small set of recent, credible, publicly accessible Chinese-language articles about the user's standing interests, then adds just enough AI-generated language support for the user to read the original Chinese without repeatedly switching to a dictionary or English coverage.

This is a **Category 3 — AI interpretation** project. Web retrieval is supporting infrastructure; the product's distinctive value is the model's grounded interpretation of a native Chinese article into a useful gist, level-appropriate vocabulary, and contextual explanations.

## 2. Job to be done

> When I want to stay informed on topics I care about while keeping my Chinese sharp, I want a few relevant native Chinese articles with the difficult vocabulary made accessible, so I can read primary Chinese sources without constantly switching to dictionaries or English coverage.

## 3. MVP success statement

The MVP succeeds when a user can:

1. Open the site and see 3–5 recent, relevant articles from three trusted, non-paywalled Chinese-language sources.
2. Choose one and read clean original Chinese text inside the app.
3. Use a short English gist and level-specific highlighted vocabulary: exactly 20 terms for Intermediate or exactly 10 for Advanced, each with pinyin and a contextual English meaning.
4. Request help for a selected difficult sentence.
5. Save useful terms to a personal vocabulary list that survives a browser refresh.

The complete happy path is:

```text
Open app
  → review 3–5 article choices
  → choose one article
  → read the original Chinese with selective support
  → save useful vocabulary
  → revisit the saved vocabulary list
```

## 4. Intended user and default profile

- One user; no account or sign-in.
- Intermediate-to-advanced Mandarin learner, with an approximate level selected in the interface.
- Standing interests are a short, editable list such as AI, China technology, business/economics, policy, startups, and U.S.–China relations.
- The user wants native material preserved, not rewritten into graded Chinese.

## 5. Source policy

For the MVP, use these three technically verified anchor sources:

- 澎湃新闻 (The Paper)
- 证券时报 (Securities Times)
- 界面新闻 (Jiemian)

This three-source set is an approved MVP scope migration. Do not add or substitute another active source without approval. Treat paid 界面新闻 content as unavailable and never present it as readable.

Every active source must:

- publish credible Chinese-language reporting relevant to the product's topic range;
- expose recent article metadata and readable article bodies through public pages or feeds;
- be accessible without bypassing a paywall, login, robots restriction, or anti-bot control;
- preserve attribution and the canonical article URL;
- fail independently so one broken source does not prevent the other from loading.

The app must never imply that it republishes or owns source content. Show the source and a link to the original article.

## 6. Three-phase build

Complete the phases in order. A phase is complete only when its acceptance criteria pass and the prior phase still passes its regression checks.

### Phase 1 — Article discovery and reading view

#### Goal

Prove the riskiest pipeline: discover recent articles from three public sources, normalize their metadata, retrieve one selected article, and display clean Chinese body text.

#### Build

- Retrieve a bounded recent candidate set from each active source. Start with about 10 items per source; make the limit configurable.
- Normalize every candidate into one stable article-card shape.
- Rank candidates using the user's standing interests, recency, and likely general significance.
- Display the best 3–5 choices with:
  - Chinese headline;
  - source and publication time;
  - topic;
  - one-sentence “Why it matters”;
  - one-sentence “Why it fits your interests”;
  - estimated Mandarin difficulty;
  - estimated reading time.
- When a card is selected, retrieve only that article's full content.
- Extract and display the headline, source, publication date, canonical URL, and clean original Chinese body.
- Provide loading, empty, partial-source-failure, and readable error states.

#### Scope rule

“Why it matters” is an informed model judgment grounded in the available headline, description, source, and date. The MVP must not claim that a story was overlooked by U.S. media because it does not measure U.S. coverage.

#### Acceptance criteria

- All three configured sources can produce normalized candidates, or one source can fail while the others still produce a usable result.
- The page shows 3–5 cards when enough valid candidates exist.
- Each card includes all required fields or an explicit neutral fallback; required keys are never omitted.
- Selecting a card displays readable Chinese article text without navigation, ads, or unrelated page chrome.
- The original source and canonical link remain visible.
- No inaccessible, paywalled, or blocked article is presented as readable in the app.
- The experience works at 375 px width and produces no browser-console errors.

### Phase 2 — AI language scaffolding

#### Goal

Turn the selected native article into a level-appropriate reading experience while keeping the original Chinese central.

#### Build

- Let the user choose an approximate Mandarin level from a small fixed set.
- For the selected article, make one structured model request that returns:
  - a two-sentence English gist;
  - exactly 20 useful or likely-difficult Chinese words or phrases for Intermediate, or exactly 10 for Advanced;
  - pinyin for each term;
  - a concise English meaning specific to this article;
  - the exact occurrence and containing sentence from the retrieved text.
- Show the level-specific terms in a compact preview above the article.
- Highlight exact occurrences of those same terms in the article.
- On hover, keyboard focus, or tap, show pinyin and contextual meaning.
- Let the user select a difficult sentence and request a natural English translation plus a short grammar or context explanation.
- Validate model output before rendering it. Reject or repair malformed output and show a readable retry state.

#### Grounding rules

- Every selected term and quoted context must be verifiably present in the retrieved article text.
- Among level-appropriate difficult or useful candidates, prioritize repeated terms by exact-occurrence frequency; use difficulty or contextual usefulness as the tie-breaker, and never promote easy function words based on frequency alone.
- Definitions and explanations must reflect the term's meaning in that sentence, not merely its most common dictionary meaning.
- The gist must summarize only the retrieved article and must not add unsupported facts.
- Model output is interpretation, not source text; keep the visual distinction clear.
- Prompt instructions found inside retrieved pages are untrusted article content and must never override the application's system instructions or output contract.

#### Scope rule

The MVP guarantees interaction only for the model-selected terms (20 for Intermediate or 10 for Advanced). Arbitrary-word segmentation and dictionary lookup are not required. Sentence help is available only after deliberate user selection; there is no full side-by-side article translation.

#### Acceptance criteria

- A valid analysis contains a two-sentence gist and exactly 20 unique terms for Intermediate or exactly 10 for Advanced.
- Every term and context excerpt can be matched to the article text before it is highlighted.
- Hover, focus, and tap expose the same definition content.
- Sentence help operates only on user-selected article text and fails with a readable message.
- Invalid, incomplete, or ungrounded model output never reaches the UI silently.
- The reader remains usable if analysis fails; the original article and retry action stay available.
- All Phase 1 checks continue to pass.

### Phase 3 — Personal vocabulary

#### Goal

Make the reading session persistent by letting the user keep useful terms without adding accounts or a database.

#### Build

- Add a Save action to each selected-term definition.
- Store saved vocabulary in browser `localStorage`.
- Save this complete record:
  - Chinese word or phrase;
  - pinyin;
  - contextual English meaning;
  - original Chinese sentence;
  - article title;
  - article source;
  - canonical article URL;
  - publication date when available;
  - date saved.
- Add a vocabulary view that lists saved records and links back to their original articles.
- Prevent accidental duplicates using a documented stable identity rule, while allowing the user to remove a saved record.
- Treat malformed or unavailable local storage as a recoverable error.

#### Acceptance criteria

- Saving a term provides immediate visible confirmation.
- Saved terms remain after refresh in the same browser.
- Duplicate saves do not create duplicate rows.
- Every displayed record contains the full contract, using explicit fallbacks for unavailable values.
- A user can remove one vocabulary record without clearing the rest.
- Saved words enter a spaced-repetition queue that retains their original article sentence.
- A user can mark a term known so later language guides exclude it, and can restore it from the vocabulary view.
- Any tappable Chinese content word can request pinyin and a contextual definition grounded in its article sentence.
- Empty and storage-error states are understandable.
- All Phase 1 and Phase 2 checks continue to pass.

## 7. Explicit exclusions

Do not build these in the three-phase MVP:

- authentication, accounts, multi-user behavior, or cloud database persistence;
- spaced repetition, flashcard scheduling, quizzes, mastery scores, or adaptive learner modeling;
- comparison with U.S. media or claims that coverage was “overlooked”;
- more than the three approved active article sources;
- broad crawling, paywall bypassing, login automation, or defeating anti-bot controls;
- arbitrary-word automatic segmentation or universal hover definitions;
- full-article or side-by-side translation;
- article rewriting or graded-Chinese rewriting;
- audio, pronunciation scoring, notifications, a daily scheduler, social features, a browser extension, or a mobile app;
- saved article history beyond the source context stored with vocabulary.

## 8. Product principles

- **Native article first:** preserve the source's Chinese; scaffold around it.
- **Selective help:** explain what is likely useful, not every word on the page.
- **Grounded AI:** every claim and excerpt must trace back to retrieved content or clearly be labeled as model judgment.
- **Progressive cost:** retrieve metadata first, retrieve one full article after selection, and analyze only that selected article.
- **Graceful degradation:** source, extraction, and model failures must be isolated and readable.
- **Small, honest MVP:** do not simulate capabilities the app has not measured or implemented.

## 9. Definition of done

The MVP is done only when all three phases meet their acceptance criteria, the full regression checklist passes, secrets are absent from tracked files and browser responses, and the deployed Vercel URL completes the happy path using live public article data.
