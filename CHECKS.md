# Daily Chinese Read — Cumulative Checks

Run this list after every phase. Record failures; never remove a previously passing guarantee.

1. Page loads with no browser-console errors.
2. Main action produces sample or live results.
3. Empty state appears when a request succeeds with no results.
4. Error state shows a readable sentence when a request fails.
5. Busy state appears during work, disables the initiating control, and clears afterward.
6. Layout and all primary actions work at 375 px width without horizontal scrolling.
7. No secret appears in any Git-tracked file or browser response.
8. One source may fail while valid results from the other source still render with a warning.
9. Selecting an article renders clean Chinese text and its source link. *(Phase 1)*
10. A blocked, paywalled, or invalid article produces a readable fallback and is not misrepresented as readable. *(Phase 1)*
11. Analysis returns a two-sentence gist and the level-specific number of unique, article-grounded terms: exactly 20 for Intermediate and exactly 10 for Advanced. *(Phase 2)*
12. Invalid or ungrounded analysis is rejected and the original article remains readable. *(Phase 2)*
13. Each highlighted term works by hover, keyboard focus, and tap. *(Phase 2)*
14. Sentence help accepts article text and rejects text not found in the article. *(Phase 2)*
15. A vocabulary record saves, survives refresh, and does not duplicate. *(Phase 3)*
16. One saved vocabulary record can be removed without affecting the others. *(Phase 3)*
17. Malformed local-storage data produces a recoverable state. *(Phase 3)*
18. Success state renders 3–5 complete sample article cards with no omitted visible fields.
19. Partial-source state keeps valid articles visible and displays a source-specific warning.
20. Every control is reachable with the keyboard and has a visible focus indicator.
21. The page remains readable at 200% browser text zoom.
22. Browser modules preserve their documented boundaries: only `ui.js` accesses the DOM, and only `source.js` fetches or accesses persistence.
23. Live discovery returns normalized candidates from 澎湃新闻, 证券时报, and 界面新闻 when each publisher is available.
24. Every live article ID is a source-scoped numeric identifier; `/api/article` rejects arbitrary URLs and unknown sources.
25. Article retrieval enforces HTTPS, publisher hostname allowlists, redirect, timeout, and response-size limits.
26. A selected article opens in the in-app reader, preserves paragraph boundaries, and keeps its canonical publisher link visible.
27. 界面新闻 paid content and any suspiciously short or navigation-heavy extraction is rejected with a readable message.
28. Closing the reader returns keyboard focus to the article list.
29. The end of every readable article shows the publication name, a brief description, and a working link to the publication homepage.
30. Changing the learner level and retrying analysis produces a new request without replacing or hiding the original article.
31. Term highlights never inject model output as HTML; overlapping terms remain readable and keyboard accessible.
32. `/api/analyze` and `/api/explain` accept JSON only, bound request sizes, and return safe public errors when AI is unconfigured or unavailable.
33. Model prompts explicitly delimit retrieved article text as untrusted data, and provider credentials remain server-side.
34. `npm run check` passes the Technical Guidelines architecture, configuration, contract, sample-data, and secret-safety checks.
35. Opening `/?preview=1` exposes success, partial-source, empty, error, and busy states without changing the live default.
36. Saving a selected term immediately marks it saved, increments the count, and stores every `VocabularyRecord` field. *(Phase 3)*
37. Saving the same normalized term, article, and context twice leaves one stored row. *(Phase 3)*
38. Saved terms survive refresh, render with their contextual sentence and article link, and can be revisited from either the list or reader. *(Phase 3)*
39. Among level-appropriate vocabulary candidates, repeated terms are ordered ahead of rarer terms; frequency never promotes easy function words by itself, and overlapping highlights respect this priority.
40. Removing one saved term preserves every other record and returns the removed term’s Save action to its available state. *(Phase 3)*
41. Invalid JSON, unknown versions, malformed records, duplicate stored IDs, and unavailable storage show a recoverable error without overwriting existing data. *(Phase 3)*
42. The interface follows `DailyChineseRead_StyleGuide.md`: warm-gray canvas, white rounded feed cards, restrained blue accents, readable 18–22 px article text, centered content widths, and a two-destination mobile navigation without gradients or decorative animation. *(Style guide)*
43. New and due saved words enter a spaced-repetition queue; Again, Good, and Easy persist review history and schedule progressively later reviews.
44. “I know this” persists a normalized known word, removes its saved review records, excludes it from later analysis, and can be undone from My Words.
45. Tapping an unhighlighted Chinese word requests pinyin and a concise contextual meaning only after the term and sentence are verified against the article.
46. A valid pasted Chinese article preserves paragraph boundaries, previews successfully, and opens in the existing reader. *(Phase 4)*
47. A valid public HTTPS article link is extracted server-side and opens with the same normalized reader structure. *(Phase 4)*
48. Imported articles use the existing level-specific analysis, word-only highlights, tapped-word help, sentence help, article-in-brief, and vocabulary controls. *(Phase 4)*
49. Invalid schemes, credentials, private or local targets, shorteners, unsupported ports, non-Chinese text, oversized input, and unreadable extraction responses produce bounded readable errors. *(Phase 4)*
50. A missing or unavailable `FIRECRAWL_API_KEY` disables only Link import; Paste text remains usable. *(Phase 4)*
51. Imported article bodies are not written to browser storage, logs, analytics, or response errors; saved vocabulary retains only its existing bounded fields. *(Phase 4)*
52. Missing imported metadata creates no empty links and no fabricated author, publication-description, date, or source-link placeholder copy. *(Phase 4)*
