import { config } from "./config.js?v=level-vocabulary-2";

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

function normalizeVocabularyRecord(value, options = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw storageError();
  const record = {
    id: "",
    termZh: requiredText(value.termZh),
    pinyin: requiredText(value.pinyin),
    meaningEn: requiredText(value.meaningEn),
    contextSentenceZh: requiredText(value.contextSentenceZh),
    articleId: requiredText(value.articleId),
    articleTitleZh: requiredText(value.articleTitleZh),
    sourceName: requiredText(value.sourceName),
    canonicalUrl: requiredText(value.canonicalUrl),
    publishedAt: validDate(value.publishedAt, true),
    savedAt: options.forSave ? new Date().toISOString() : validDate(value.savedAt),
  };
  try {
    if (new URL(record.canonicalUrl).protocol !== "https:") throw storageError();
  } catch {
    throw storageError();
  }
  record.id = vocabularyId(record);
  if (!options.forSave && value.id !== record.id) throw storageError();
  return record;
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

export const source = Object.freeze({
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

  async analyze(article, learnerLevel) {
    if (config.mode === "sample") {
      const samples = await readSamples();
      if (samples.articleAnalysis?.articleId !== article.id) throw new Error("Sample analysis is unavailable for this article.");
      await new Promise((resolve) => window.setTimeout(resolve, config.sampleDelayMs));
      const termCount = config.analysisTermCounts[learnerLevel] || config.analysisTermCounts[config.defaultLearnerLevel];
      return { ...samples.articleAnalysis, terms: samples.articleAnalysis.terms.slice(0, termCount) };
    }
    const payload = await requestJson(config.apiRoutes.analyze, {
      method: "POST",
      timeoutMs: config.analysisRequestTimeoutMs,
      body: { article, learnerLevel, interests: config.defaultInterests },
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
});
