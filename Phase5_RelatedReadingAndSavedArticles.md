# Phase 5 — Related English Reading and Saved Articles

## What this adds

- Automatically requests three closely related English-language articles after a Chinese article opens.
- Searches only a server-side allowlist of highly reputable publishers and shows links, publication names, and one-sentence topic connections.
- Allows subscriber-only results while never attempting to bypass access or reproduce their text.
- Uses the existing `OPENAI_API_KEY`; normal language analysis stays on `OPENAI_MODEL`, while web search uses configurable `OPENAI_SEARCH_MODEL`.
- Adds a reader-level Save article action for articles with an original HTTPS link.
- Stores only the URL, title, publication name, and save time—never the article body.
- Adds a Saved articles section alongside the existing saved vocabulary and review tools.
- Preserves malformed-data recovery, duplicate prevention, browser-only persistence, and the existing architecture boundaries.

## Data and request flow

1. The reader sends the validated, bounded Chinese article to `POST /api/related`.
2. The server calls the OpenAI Responses API with the web-search tool and an allowlist of reputable domains.
3. The server validates that every returned URL is HTTPS, allowlisted, unique, and present in the provider's search citations.
4. The browser renders links only; it does not fetch the English article pages.
5. Saving an article writes one versioned link record to local browser storage.

## Configuration

- `OPENAI_API_KEY` — required for language tools and related reading.
- `OPENAI_MODEL` — defaults to `gpt-5-mini` for existing language analysis.
- `OPENAI_SEARCH_MODEL` — defaults to `gpt-5.5` for web search and may be overridden server-side.

No additional API key or database is required for these two capabilities.
