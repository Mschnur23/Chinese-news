import { config } from "./config.js?v=phase4-import-1";

let sampleCache;

async function readSamples() {
  if (sampleCache) return sampleCache;
  const response = await fetch(config.sampleDataPath, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("SAMPLE_DATA_UNAVAILABLE");
  sampleCache = await response.json();
  return sampleCache;
}

function storageError() {
  return new Error("Saved vocabulary could not be read or updated. Your existing browser data was left unchanged.");
}

function requiredText(value) {
  if (typeof value !== "string" || !value.trim()) throw storageError();
  return value.trim();
}

function optionalHttpsUrl(value) {
  if (value === undefined || value === null || value === "") return "";
  const text = requiredText(value);
  try {
    if (new URL(text).protocol !== "https:") throw storageError();
  } catch {
    throw storageError();
  }
  return text;
}

function normalizedIdentityPart(value) {
  return requiredText(value).normalize("NFKC").replace(/\s+/g, " ").toLocaleLowerCase();
}

function vocabularyId(record) {
  return [record.termZh, record.articleId, record.contextSentenceZh]
    .map((value) => encodeURIComponent(normalizedIdentityPart(value)))
    .join(":");
}

function validDate(value, nullable = false) {
  if (nullable && value === null) return null;
  const text = requiredText(value);
  if (Number.isNaN(new Date(text).getTime())) throw storageError();
  return text;
}

function nonNegativeInteger(value, fallback = 0) {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function normalizeVocabularyRecord(value, options = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw storageError();
  const savedAt = options.forSave ? new Date().toISOString() : validDate(value.savedAt);
  const record = {
    id: "",
    termZh: requiredText(value.termZh),
    pinyin: requiredText(value.pinyin),
    meaningEn: requiredText(value.meaningEn),
    contextSentenceZh: requiredText(value.contextSentenceZh),
    articleId: requiredText(value.articleId),
    articleTitleZh: requiredText(value.articleTitleZh),
    sourceName: requiredText(value.sourceName),
    canonicalUrl: optionalHttpsUrl(value.canonicalUrl),
    publishedAt: validDate(value.publishedAt, true),
    savedAt,
    reviewStage: options.forSave ? 0 : nonNegativeInteger(value.reviewStage),
    reviewDueAt: options.forSave ? savedAt : validDate(value.reviewDueAt || savedAt),
    lastReviewedAt: options.forSave ? null : (value.lastReviewedAt ? validDate(value.lastReviewedAt) : null),
    reviewCount: options.forSave ? 0 : nonNegativeInteger(value.reviewCount),
    lapseCount: options.forSave ? 0 : nonNegativeInteger(value.lapseCount),
  };
  record.id = vocabularyId(record);
  if (!options.forSave && value.id !== record.id) throw storageError();
  return record;
}

function normalizeKnownWord(value) {
  const termZh = requiredText(typeof value === "string" ? value : value?.termZh);
  return {
    termZh,
    normalized: normalizedIdentityPart(termZh),
    knownAt: typeof value === "string" ? new Date().toISOString() : validDate(value.knownAt),
  };
}

function readKnownWordsStore() {
  try {
    const raw = localStorage.getItem(config.knownWordsStorageKey);
    if (raw === null) return [];
    const value = JSON.parse(raw);
    if (!value || value.version !== config.knownWordsStorageVersion || !Array.isArray(value.words)) throw storageError();
    const words = value.words.map(normalizeKnownWord);
    if (new Set(words.map((word) => word.normalized)).size !== words.length) throw storageError();
    return words;
  } catch {
    throw storageError();
  }
}

function writeKnownWordsStore(words) {
  try {
    localStorage.setItem(config.knownWordsStorageKey, JSON.stringify({ version: config.knownWordsStorageVersion, words }));
  } catch {
    throw storageError();
  }
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 86400000).toISOString();
}

function readVocabularyStore() {
  try {
    const raw = localStorage.getItem(config.storageKey);
    if (raw === null) return [];
    const value = JSON.parse(raw);
    if (!value || value.version !== config.storageVersion || !Array.isArray(value.records)) throw storageError();
    const records = value.records.map((record) => normalizeVocabularyRecord(record));
    if (new Set(records.map((record) => record.id)).size !== records.length) throw storageError();
    return records;
  } catch {
    throw storageError();
  }
}

function writeVocabularyStore(records) {
  try {
    localStorage.setItem(config.storageKey, JSON.stringify({ version: config.storageVersion, records }));
  } catch {
    throw storageError();
  }
}

async function requestJson(url, options = {}) {
  if (window.location.protocol === "file:") {
    throw new Error("Open this reader through its local or deployed web address to use live articles.");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    options.timeoutMs || config.requestTimeoutMs,
  );
  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error?.message || "The request could not be completed.");
    }
    return payload;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("The request took too long. Please try again.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function normalizeSampleImport(input) {
  if (!input || !["url", "text"].includes(input.mode)) throw new Error("Choose a link or pasted text.");
  if (input.mode === "url") {
    try {
      const url = new URL(input.url);
      if (url.protocol !== "https:" || url.username || url.password) throw new Error();
    } catch {
      throw new Error("Enter a complete HTTPS article link.");
    }
    return null;
  }
  const titleZh = typeof input.titleZh === "string" ? input.titleZh.trim() : "";
  const text = typeof input.text === "string" ? input.text.normalize("NFKC").trim() : "";
  if (!titleZh) throw new Error("Add the article title.");
  if (text.length < config.minimumImportCharacters) throw new Error("Add more of the Chinese article before importing it.");
  if (text.length > config.maximumImportCharacters) throw new Error("Shorten the article to 30,000 characters or fewer.");
  if ((text.match(/\p{Script=Han}/gu) || []).length < 100) throw new Error("The import needs more Chinese article text.");
  const paragraphs = text.split(/\n\s*\n+|\n+/).map((item) => item.replace(/\s+/g, " ").trim()).filter(Boolean);
  let canonicalUrl = "";
  if (input.canonicalUrl?.trim()) {
    try {
      const parsedUrl = new URL(input.canonicalUrl.trim());
      if (parsedUrl.protocol !== "https:") throw new Error();
      canonicalUrl = parsedUrl.toString();
    } catch {
      throw new Error("Use a complete HTTPS original link, or leave it blank.");
    }
  }
  return {
    id: "user-import:0000000000000001",
    originType: "text",
    titleZh,
    sourceId: "user-import",
    sourceName: input.sourceName?.trim() || (canonicalUrl ? new URL(canonicalUrl).hostname.replace(/^www\./, "") : "Pasted article"),
    sourceHomepageUrl: canonicalUrl ? `${new URL(canonicalUrl).origin}/` : "",
    sourceDescription: "",
    canonicalUrl,
    imageUrl: "",
    publishedAt: null,
    author: "",
    bodyText: paragraphs.join("\n\n"),
    paragraphs,
  };
}

export const source = Object.freeze({
  async importArticle(input) {
    if (config.mode === "sample") {
      await new Promise((resolve) => window.setTimeout(resolve, config.sampleDelayMs));
      const pastedArticle = normalizeSampleImport(input);
      if (pastedArticle) return pastedArticle;
      const samples = await readSamples();
      if (!samples.importedArticle) throw new Error("Sample import is unavailable.");
      return samples.importedArticle;
    }
    const payload = await requestJson(config.apiRoutes.import, {
      method: "POST",
      timeoutMs: config.importRequestTimeoutMs,
      body: input,
    });
    return payload.data;
  },

  async load(params = {}) {
    if (config.mode === "sample") {
      await new Promise((resolve) => window.setTimeout(resolve, config.sampleDelayMs));
      const samples = await readSamples();
      const limit = Math.min(params.limit || config.displayedResultLimit, config.displayedResultLimit);
      const excludedSourceIds = Array.isArray(params.excludedSourceIds) ? params.excludedSourceIds : [];
      const items = samples.articleSummaries.filter((item) => !excludedSourceIds.includes(item.sourceId));
      return { items: items.slice(0, limit), warnings: excludedSourceIds.length ? [...samples.warnings] : [] };
    }

    const query = new URLSearchParams({ interests: (params.interests || []).join(",") });
    const payload = await requestJson(`${config.apiRoutes.articles}?${query}`);
    return { items: payload.data.items, warnings: payload.warnings };
  },

  async detail(id) {
    if (config.mode === "sample") {
      const samples = await readSamples();
      const article = samples.articleDetails.find((item) => item.id === id);
      if (!article) throw new Error("Article not found.");
      return article;
    }
    const payload = await requestJson(`${config.apiRoutes.article}?id=${encodeURIComponent(id)}`);
    return payload.data;
  },

  async analyze(article, learnerLevel, knownTerms = []) {
    if (config.mode === "sample") {
      const samples = await readSamples();
      const isImported = article.sourceId === "user-import";
      if (!isImported && samples.articleAnalysis?.articleId !== article.id) throw new Error("Sample analysis is unavailable for this article.");
      await new Promise((resolve) => window.setTimeout(resolve, config.sampleDelayMs));
      const termCount = config.analysisTermCounts[learnerLevel] || config.analysisTermCounts[config.defaultLearnerLevel];
      const known = new Set(knownTerms.map(normalizedIdentityPart));
      const terms = samples.articleAnalysis.terms
        .filter((term) => !known.has(normalizedIdentityPart(term.termZh)))
        .filter((term) => !isImported || (article.bodyText.includes(term.termZh) && article.bodyText.includes(term.contextSentenceZh)))
        .slice(0, termCount);
      if (terms.length !== termCount) throw new Error("The sample vocabulary pool is exhausted. Restore a known word or choose Advanced.");
      return { ...samples.articleAnalysis, articleId: article.id, terms };
    }
    const payload = await requestJson(config.apiRoutes.analyze, {
      method: "POST",
      timeoutMs: config.analysisRequestTimeoutMs,
      body: { article, learnerLevel, interests: config.defaultInterests, knownTerms },
    });
    return payload.data;
  },

  async explain({ article, sentenceZh, learnerLevel }) {
    if (config.mode === "sample") {
      const samples = await readSamples();
      if (!article.bodyText.includes(sentenceZh) || !sentenceZh.includes("越来越多企业")) {
        throw new Error("Select the complete sample sentence beginning with ‘越来越多企业’.");
      }
      await new Promise((resolve) => window.setTimeout(resolve, config.sampleDelayMs));
      return { ...samples.sentenceExplanation, sentenceZh };
    }
    const payload = await requestJson(config.apiRoutes.explain, {
      method: "POST",
      timeoutMs: config.analysisRequestTimeoutMs,
      body: { article, sentenceZh, learnerLevel },
    });
    return payload.data;
  },

  async lookupWord({ article, termZh, contextSentenceZh, learnerLevel }) {
    if (config.mode === "sample") {
      const samples = await readSamples();
      const match = samples.articleAnalysis.terms.find((term) => term.termZh === termZh)
        || samples.wordHelp?.find((term) => term.termZh === termZh);
      if (!match) throw new Error(`Sample word help is unavailable for ${termZh}. Try a highlighted content word.`);
      await new Promise((resolve) => window.setTimeout(resolve, config.sampleDelayMs));
      return { termZh, pinyin: match.pinyin, meaningEn: match.meaningEn, contextSentenceZh };
    }
    const payload = await requestJson(config.apiRoutes.word, {
      method: "POST",
      timeoutMs: config.analysisRequestTimeoutMs,
      body: { article, termZh, contextSentenceZh, learnerLevel },
    });
    return payload.data;
  },

  async save(record) {
    const candidate = normalizeVocabularyRecord(record, { forSave: true });
    const records = readVocabularyStore();
    const existing = records.find((item) => item.id === candidate.id);
    if (existing) return { added: false, record: existing, records };
    const nextRecords = [candidate, ...records];
    writeVocabularyStore(nextRecords);
    return { added: true, record: candidate, records: nextRecords };
  },

  async list() {
    return readVocabularyStore();
  },

  async remove(id) {
    const recordId = requiredText(id);
    const records = readVocabularyStore();
    const nextRecords = records.filter((record) => record.id !== recordId);
    if (nextRecords.length === records.length) return { removed: false, records };
    writeVocabularyStore(nextRecords);
    return { removed: true, records: nextRecords };
  },

  async reviewQueue(now = new Date().toISOString()) {
    const timestamp = new Date(validDate(now)).getTime();
    return readVocabularyStore()
      .filter((record) => new Date(record.reviewDueAt).getTime() <= timestamp)
      .sort((left, right) => new Date(left.reviewDueAt) - new Date(right.reviewDueAt));
  },

  async review(id, rating, now = new Date().toISOString()) {
    if (!["again", "good", "easy"].includes(rating)) throw storageError();
    const reviewedAt = validDate(now);
    const records = readVocabularyStore();
    const index = records.findIndex((record) => record.id === requiredText(id));
    if (index < 0) throw storageError();
    const current = records[index];
    const step = rating === "again" ? 0 : rating === "easy" ? 2 : 1;
    const nextStage = rating === "again" ? 0 : Math.min(current.reviewStage + step, config.reviewIntervalsDays.length - 1);
    const dueAt = rating === "again"
      ? new Date(new Date(reviewedAt).getTime() + 10 * 60000).toISOString()
      : addDays(new Date(reviewedAt), config.reviewIntervalsDays[nextStage]);
    const record = {
      ...current,
      reviewStage: nextStage,
      reviewDueAt: dueAt,
      lastReviewedAt: reviewedAt,
      reviewCount: current.reviewCount + 1,
      lapseCount: current.lapseCount + (rating === "again" ? 1 : 0),
    };
    const nextRecords = [...records];
    nextRecords[index] = record;
    writeVocabularyStore(nextRecords);
    return { record, records: nextRecords };
  },

  async listKnown() {
    return readKnownWordsStore();
  },

  async markKnown(termZh) {
    const candidate = normalizeKnownWord(termZh);
    const words = readKnownWordsStore();
    const existing = words.find((word) => word.normalized === candidate.normalized);
    const nextWords = existing ? words : [candidate, ...words];
    const records = readVocabularyStore().filter((record) => normalizedIdentityPart(record.termZh) !== candidate.normalized);
    writeKnownWordsStore(nextWords);
    writeVocabularyStore(records);
    return { added: !existing, word: existing || candidate, words: nextWords, records };
  },

  async unmarkKnown(termZh) {
    const normalized = normalizedIdentityPart(termZh);
    const words = readKnownWordsStore();
    const nextWords = words.filter((word) => word.normalized !== normalized);
    writeKnownWordsStore(nextWords);
    return { removed: nextWords.length !== words.length, words: nextWords };
  },
});
