import { config } from "./config.js?v=drive-sync-1";
import { driveSyncDocumentVersion, emptyDriveSyncMeta, mergeDriveSyncDocuments } from "./sync-data.js?v=drive-sync-1";

let sampleCache;
const detailCache = new Map();
const analysisCache = new Map();
const relatedCache = new Map();
let driveAccessToken = "";
let driveFileId = "";
let driveClientConfig;
let driveSyncChain = Promise.resolve();

function remember(cache, key, value, maximumEntries = 40) {
  if (!cache.has(key) && cache.size >= maximumEntries) cache.delete(cache.keys().next().value);
  cache.set(key, value);
  return value;
}

function wait(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Request cancelled", "AbortError"));
    const finish = () => {
      signal?.removeEventListener("abort", abort);
      resolve();
    };
    const abort = () => {
      window.clearTimeout(timeout);
      reject(new DOMException("Request cancelled", "AbortError"));
    };
    const timeout = window.setTimeout(finish, milliseconds);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

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

function articleStorageError() {
  return new Error("Saved articles could not be read or updated. Your existing browser data was left unchanged.");
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

function normalizeSavedArticle(value, options = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw articleStorageError();
  let canonicalUrl;
  try {
    canonicalUrl = new URL(value.canonicalUrl);
    if (canonicalUrl.protocol !== "https:" || canonicalUrl.username || canonicalUrl.password) throw new Error();
    canonicalUrl.hash = "";
  } catch {
    throw articleStorageError();
  }
  const savedAt = options.forSave ? new Date().toISOString() : validDate(value.savedAt);
  const record = {
    id: canonicalUrl.toString(),
    canonicalUrl: canonicalUrl.toString(),
    titleZh: requiredText(value.titleZh),
    sourceName: requiredText(value.sourceName),
    savedAt,
  };
  if (!options.forSave && value.id !== record.id) throw articleStorageError();
  return record;
}

function readSavedArticlesStore() {
  try {
    const raw = localStorage.getItem(config.savedArticlesStorageKey);
    if (raw === null) return [];
    const value = JSON.parse(raw);
    if (!value || value.version !== config.savedArticlesStorageVersion || !Array.isArray(value.records)) throw articleStorageError();
    const records = value.records.map((record) => normalizeSavedArticle(record));
    if (new Set(records.map((record) => record.id)).size !== records.length) throw articleStorageError();
    return records;
  } catch {
    throw articleStorageError();
  }
}

function writeSavedArticlesStore(records) {
  try {
    localStorage.setItem(config.savedArticlesStorageKey, JSON.stringify({ version: config.savedArticlesStorageVersion, records }));
  } catch {
    throw articleStorageError();
  }
}

function validTombstones(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value);
  if (entries.length > 10000) throw storageError();
  return Object.fromEntries(entries.map(([id, deletedAt]) => [requiredText(id), validDate(deletedAt)]));
}

function normalizeDriveSyncMeta(value) {
  if (value === null || value === undefined) return emptyDriveSyncMeta();
  if (!value || value.version !== config.driveSyncVersion || !value.tombstones) throw storageError();
  return {
    version: config.driveSyncVersion,
    updatedAt: validDate(value.updatedAt),
    tombstones: {
      vocabulary: validTombstones(value.tombstones.vocabulary),
      knownWords: validTombstones(value.tombstones.knownWords),
      articles: validTombstones(value.tombstones.articles),
    },
  };
}

function readDriveSyncMeta() {
  try {
    const raw = localStorage.getItem(config.driveSyncMetaKey);
    return normalizeDriveSyncMeta(raw === null ? null : JSON.parse(raw));
  } catch {
    throw storageError();
  }
}

function writeDriveSyncMeta(meta) {
  try {
    localStorage.setItem(config.driveSyncMetaKey, JSON.stringify(meta));
  } catch {
    throw storageError();
  }
}

function recordSyncMutations(changes) {
  const changedAt = new Date().toISOString();
  const meta = readDriveSyncMeta();
  changes.forEach(({ collection, id, deleted = false }) => {
    if (deleted) meta.tombstones[collection][id] = changedAt;
    else delete meta.tombstones[collection][id];
  });
  meta.updatedAt = changedAt;
  writeDriveSyncMeta(meta);
}

function normalizeDriveSyncDocument(value) {
  if (!value || value.version !== driveSyncDocumentVersion) throw storageError();
  if (!Array.isArray(value.vocabulary) || !Array.isArray(value.knownWords) || !Array.isArray(value.articles)) throw storageError();
  const vocabulary = value.vocabulary.map((record) => normalizeVocabularyRecord(record));
  const knownWords = value.knownWords.map(normalizeKnownWord);
  const articles = value.articles.map((record) => normalizeSavedArticle(record));
  if (new Set(vocabulary.map((record) => record.id)).size !== vocabulary.length) throw storageError();
  if (new Set(knownWords.map((word) => word.normalized)).size !== knownWords.length) throw storageError();
  if (new Set(articles.map((article) => article.id)).size !== articles.length) throw storageError();
  return {
    version: driveSyncDocumentVersion,
    updatedAt: validDate(value.updatedAt),
    vocabulary,
    knownWords,
    articles,
    meta: normalizeDriveSyncMeta(value.meta),
  };
}

function localDriveSyncDocument() {
  const meta = readDriveSyncMeta();
  return {
    version: driveSyncDocumentVersion,
    updatedAt: meta.updatedAt,
    vocabulary: readVocabularyStore(),
    knownWords: readKnownWordsStore(),
    articles: readSavedArticlesStore(),
    meta,
  };
}

function writeDriveSyncDocument(syncValue) {
  const keys = [config.storageKey, config.knownWordsStorageKey, config.savedArticlesStorageKey, config.driveSyncMetaKey];
  const previous = new Map(keys.map((key) => [key, localStorage.getItem(key)]));
  try {
    writeVocabularyStore(syncValue.vocabulary);
    writeKnownWordsStore(syncValue.knownWords);
    writeSavedArticlesStore(syncValue.articles);
    writeDriveSyncMeta(syncValue.meta);
  } catch (error) {
    try {
      previous.forEach((value, key) => restoreStorageValue(key, value));
    } catch {
      // Preserve the original storage failure.
    }
    throw error;
  }
}

function restoreStorageValue(key, value) {
  if (value === null) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
}

function writeKnownAndVocabularyStores(words, records) {
  const previousKnown = localStorage.getItem(config.knownWordsStorageKey);
  const previousVocabulary = localStorage.getItem(config.storageKey);
  try {
    writeKnownWordsStore(words);
    writeVocabularyStore(records);
  } catch (error) {
    try {
      restoreStorageValue(config.knownWordsStorageKey, previousKnown);
      restoreStorageValue(config.storageKey, previousVocabulary);
    } catch {
      // Preserve the original storage error; recovery is best-effort when the
      // browser has disabled storage entirely.
    }
    throw error;
  }
}

async function requestJson(url, options = {}) {
  if (window.location.protocol === "file:") {
    throw new Error("Open this reader through its local or deployed web address to use live articles.");
  }

  const controller = new AbortController();
  let timedOut = false;
  const timeout = window.setTimeout(
    () => {
      timedOut = true;
      controller.abort();
    },
    options.timeoutMs || config.requestTimeoutMs,
  );
  const abortFromCaller = () => controller.abort();
  options.signal?.addEventListener("abort", abortFromCaller, { once: true });
  if (options.signal?.aborted) controller.abort();
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
    if (error?.name === "AbortError" && timedOut) throw new Error("The request took too long. Please try again.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abortFromCaller);
  }
}

function driveError(message = "Google Drive sync is temporarily unavailable. Your browser copy remains available.") {
  return new Error(message);
}

async function readBoundedDriveResponse(response) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > config.maximumDriveSyncBytes) throw driveError("The Google Drive sync file is too large to use safely.");
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > config.maximumDriveSyncBytes) {
    throw driveError("The Google Drive sync file is too large to use safely.");
  }
  return text;
}

async function driveRequest(path, options = {}) {
  if (!driveAccessToken) throw driveError("Reconnect Google Drive to continue syncing.");
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), config.driveRequestTimeoutMs);
  try {
    const response = await fetch(`${options.upload ? config.googleDriveUploadBaseUrl : config.googleDriveApiBaseUrl}${path}`, {
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${driveAccessToken}`,
        Accept: "application/json",
        ...(options.json ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body,
      signal: controller.signal,
    });
    if (response.status === 401) {
      driveAccessToken = "";
      throw driveError("Your Google session expired. Reconnect Drive to continue syncing.");
    }
    const text = await readBoundedDriveResponse(response);
    if (!response.ok) throw driveError();
    return text ? JSON.parse(text) : {};
  } catch (error) {
    if (error?.name === "AbortError") throw driveError("Google Drive took too long to respond. Please try again.");
    if (error instanceof SyntaxError) throw driveError("Google Drive returned an unreadable sync file.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function googleClientConfiguration() {
  if (driveClientConfig) return driveClientConfig;
  const payload = await requestJson(config.apiRoutes.clientConfig);
  driveClientConfig = payload.data;
  return driveClientConfig;
}

async function requestDriveAccess(prompt) {
  const clientConfig = await googleClientConfiguration();
  if (!clientConfig.googleDriveConfigured || !clientConfig.googleClientId) {
    throw driveError("Google Drive sync is not configured for this deployment yet.");
  }
  const oauth = globalThis.google?.accounts?.oauth2;
  if (!oauth?.initTokenClient) throw driveError("Google authorization could not be loaded. Check your connection and try again.");

  const response = await new Promise((resolve, reject) => {
    const client = oauth.initTokenClient({
      client_id: clientConfig.googleClientId,
      scope: config.googleDriveScope,
      callback: (tokenResponse) => {
        if (tokenResponse?.error || !tokenResponse?.access_token) {
          reject(driveError("Google Drive authorization was not completed."));
          return;
        }
        resolve(tokenResponse);
      },
      error_callback: () => reject(driveError("Google Drive authorization was closed or interrupted.")),
    });
    client.requestAccessToken({ prompt });
  });
  driveAccessToken = response.access_token;
}

async function findDriveSyncFile() {
  if (driveFileId) return driveFileId;
  const query = new URLSearchParams({
    spaces: "appDataFolder",
    q: `name='${config.googleDriveFileName}' and trashed=false`,
    fields: "files(id,name,modifiedTime)",
    pageSize: "10",
  });
  const result = await driveRequest(`/files?${query}`);
  driveFileId = result.files?.[0]?.id || "";
  return driveFileId;
}

async function readRemoteDriveDocument(fileId) {
  if (!fileId) {
    const empty = emptyDriveSyncMeta();
    return { version: driveSyncDocumentVersion, updatedAt: empty.updatedAt, vocabulary: [], knownWords: [], articles: [], meta: empty };
  }
  const value = await driveRequest(`/files/${encodeURIComponent(fileId)}?alt=media`);
  return normalizeDriveSyncDocument(value);
}

async function writeRemoteDriveDocument(fileId, syncValue) {
  const body = JSON.stringify(syncValue);
  if (new TextEncoder().encode(body).byteLength > config.maximumDriveSyncBytes) {
    throw driveError("Your saved library is too large for the current Drive sync limit.");
  }
  if (fileId) {
    const result = await driveRequest(`/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,modifiedTime`, {
      method: "PATCH",
      upload: true,
      json: true,
      body,
    });
    return result.id;
  }

  const multipart = new FormData();
  multipart.append("metadata", new Blob([JSON.stringify({
    name: config.googleDriveFileName,
    parents: ["appDataFolder"],
    mimeType: "application/json",
  })], { type: "application/json" }));
  multipart.append("file", new Blob([body], { type: "application/json" }));
  const result = await driveRequest("/files?uploadType=multipart&fields=id,modifiedTime", {
    method: "POST",
    upload: true,
    body: multipart,
  });
  return result.id;
}

async function synchronizeDriveLibrary() {
  const local = localDriveSyncDocument();
  const fileId = await findDriveSyncFile();
  const remote = await readRemoteDriveDocument(fileId);
  const merged = mergeDriveSyncDocuments(local, remote);
  const syncedAt = new Date().toISOString();
  merged.updatedAt = syncedAt;
  merged.meta.updatedAt = syncedAt;
  writeDriveSyncDocument(merged);
  driveFileId = await writeRemoteDriveDocument(fileId, merged);
  return {
    syncedAt,
    vocabularyCount: merged.vocabulary.length,
    knownWordCount: merged.knownWords.length,
    articleCount: merged.articles.length,
  };
}

function enqueueDriveSync() {
  const operation = driveSyncChain.then(synchronizeDriveLibrary, synchronizeDriveLibrary);
  driveSyncChain = operation.catch(() => {});
  return operation;
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
  async driveConfiguration() {
    if (!config.featureFlags.driveSync) return { googleDriveConfigured: false, googleClientId: "" };
    if (config.mode === "sample") return { googleDriveConfigured: false, googleClientId: "" };
    return googleClientConfiguration();
  },

  async isDriveSyncEnabled() {
    try {
      return localStorage.getItem(config.driveSyncPreferenceKey) === "true";
    } catch {
      return false;
    }
  },

  async connectDrive(options = {}) {
    await requestDriveAccess(options.prompt ?? "consent");
    const result = await enqueueDriveSync();
    localStorage.setItem(config.driveSyncPreferenceKey, "true");
    return result;
  },

  async syncDrive() {
    return enqueueDriveSync();
  },

  async disconnectDrive() {
    const token = driveAccessToken;
    driveAccessToken = "";
    driveFileId = "";
    try {
      localStorage.removeItem(config.driveSyncPreferenceKey);
    } catch {
      throw storageError();
    }
    const revoke = globalThis.google?.accounts?.oauth2?.revoke;
    if (token && revoke) await new Promise((resolve) => revoke(token, resolve));
    return { connected: false };
  },

  async related(article, options = {}) {
    const cacheKey = `${article.id}:${article.titleZh}:${article.bodyText.length}`;
    if (relatedCache.has(cacheKey)) return relatedCache.get(cacheKey);
    if (config.mode === "sample") {
      await wait(config.sampleDelayMs, options.signal);
      const samples = await readSamples();
      const result = { items: samples.relatedReading || [] };
      return remember(relatedCache, cacheKey, result);
    }
    const payload = await requestJson(config.apiRoutes.related, {
      method: "POST",
      timeoutMs: config.relatedReadingRequestTimeoutMs,
      signal: options.signal,
      body: { article },
    });
    return remember(relatedCache, cacheKey, payload.data);
  },

  async importArticle(input, options = {}) {
    if (config.mode === "sample") {
      await wait(config.sampleDelayMs, options.signal);
      const pastedArticle = normalizeSampleImport(input);
      if (pastedArticle) return pastedArticle;
      const samples = await readSamples();
      if (!samples.importedArticle) throw new Error("Sample import is unavailable.");
      return samples.importedArticle;
    }
    const payload = await requestJson(config.apiRoutes.import, {
      method: "POST",
      timeoutMs: config.importRequestTimeoutMs,
      signal: options.signal,
      body: input,
    });
    return payload.data;
  },

  async load(params = {}, options = {}) {
    if (config.mode === "sample") {
      await wait(config.sampleDelayMs, options.signal);
      const samples = await readSamples();
      const limit = Math.min(params.limit || config.displayedResultLimit, config.displayedResultLimit);
      const excludedSourceIds = Array.isArray(params.excludedSourceIds) ? params.excludedSourceIds : [];
      const items = samples.articleSummaries.filter((item) => !excludedSourceIds.includes(item.sourceId));
      return { items: items.slice(0, limit), warnings: excludedSourceIds.length ? [...samples.warnings] : [] };
    }

    const query = new URLSearchParams({ interests: (params.interests || []).join(",") });
    const payload = await requestJson(`${config.apiRoutes.articles}?${query}`, { signal: options.signal });
    return { items: payload.data.items, warnings: payload.warnings };
  },

  async detail(id, options = {}) {
    if (detailCache.has(id)) return detailCache.get(id);
    if (config.mode === "sample") {
      const samples = await readSamples();
      const article = samples.articleDetails.find((item) => item.id === id);
      if (!article) throw new Error("Article not found.");
      return remember(detailCache, id, article);
    }
    const payload = await requestJson(`${config.apiRoutes.article}?id=${encodeURIComponent(id)}`, { signal: options.signal });
    return remember(detailCache, id, payload.data);
  },

  async analyze(article, learnerLevel, knownTerms = [], options = {}) {
    const normalizedKnown = knownTerms.map(normalizedIdentityPart).sort();
    const cacheKey = `${article.id}:${article.bodyText.length}:${learnerLevel}:${normalizedKnown.join(",")}`;
    if (analysisCache.has(cacheKey)) return analysisCache.get(cacheKey);
    if (config.mode === "sample") {
      const samples = await readSamples();
      const isImported = article.sourceId === "user-import";
      if (!isImported && samples.articleAnalysis?.articleId !== article.id) throw new Error("Sample analysis is unavailable for this article.");
      await wait(config.sampleDelayMs, options.signal);
      const termCount = config.analysisTermCounts[learnerLevel] || config.analysisTermCounts[config.defaultLearnerLevel];
      const known = new Set(knownTerms.map(normalizedIdentityPart));
      const terms = samples.articleAnalysis.terms
        .filter((term) => !known.has(normalizedIdentityPart(term.termZh)))
        .filter((term) => !isImported || (article.bodyText.includes(term.termZh) && article.bodyText.includes(term.contextSentenceZh)))
        .slice(0, termCount);
      if (terms.length !== termCount) throw new Error("The sample vocabulary pool is exhausted. Restore a known word or choose Advanced.");
      const result = { ...samples.articleAnalysis, articleId: article.id, terms };
      return remember(analysisCache, cacheKey, result);
    }
    const payload = await requestJson(config.apiRoutes.analyze, {
      method: "POST",
      timeoutMs: config.analysisRequestTimeoutMs,
      signal: options.signal,
      body: { article, learnerLevel, interests: config.defaultInterests, knownTerms },
    });
    return remember(analysisCache, cacheKey, payload.data);
  },

  async explain({ article, sentenceZh, learnerLevel, signal }) {
    if (config.mode === "sample") {
      const samples = await readSamples();
      if (!article.bodyText.includes(sentenceZh) || !sentenceZh.includes("越来越多企业")) {
        throw new Error("Select the complete sample sentence beginning with ‘越来越多企业’.");
      }
      await wait(config.sampleDelayMs, signal);
      return { ...samples.sentenceExplanation, sentenceZh };
    }
    const payload = await requestJson(config.apiRoutes.explain, {
      method: "POST",
      timeoutMs: config.analysisRequestTimeoutMs,
      signal,
      body: { article, sentenceZh, learnerLevel },
    });
    return payload.data;
  },

  async lookupWord({ article, termZh, contextSentenceZh, learnerLevel, signal }) {
    if (config.mode === "sample") {
      const samples = await readSamples();
      const match = samples.articleAnalysis.terms.find((term) => term.termZh === termZh)
        || samples.wordHelp?.find((term) => term.termZh === termZh);
      if (!match) throw new Error(`Sample word help is unavailable for ${termZh}. Try a highlighted content word.`);
      await wait(config.sampleDelayMs, signal);
      return { termZh, pinyin: match.pinyin, meaningEn: match.meaningEn, contextSentenceZh };
    }
    const payload = await requestJson(config.apiRoutes.word, {
      method: "POST",
      timeoutMs: config.analysisRequestTimeoutMs,
      signal,
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
    recordSyncMutations([{ collection: "vocabulary", id: candidate.id }]);
    return { added: true, record: candidate, records: nextRecords };
  },

  async saveArticle(article) {
    const candidate = normalizeSavedArticle(article, { forSave: true });
    const records = readSavedArticlesStore();
    const existing = records.find((item) => item.id === candidate.id);
    if (existing) return { added: false, record: existing, records };
    const nextRecords = [candidate, ...records];
    writeSavedArticlesStore(nextRecords);
    recordSyncMutations([{ collection: "articles", id: candidate.id }]);
    return { added: true, record: candidate, records: nextRecords };
  },

  async listArticles() {
    return readSavedArticlesStore();
  },

  async removeArticle(id) {
    const recordId = requiredText(id);
    const records = readSavedArticlesStore();
    const nextRecords = records.filter((record) => record.id !== recordId);
    if (nextRecords.length === records.length) return { removed: false, records };
    writeSavedArticlesStore(nextRecords);
    recordSyncMutations([{ collection: "articles", id: recordId, deleted: true }]);
    return { removed: true, records: nextRecords };
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
    recordSyncMutations([{ collection: "vocabulary", id: recordId, deleted: true }]);
    return { removed: true, records: nextRecords };
  },

  async reviewQueue(now = new Date().toISOString()) {
    const timestamp = new Date(validDate(now)).getTime();
    return readVocabularyStore()
      .filter((record) => new Date(record.reviewDueAt).getTime() <= timestamp)
      .sort((left, right) => new Date(left.reviewDueAt) - new Date(right.reviewDueAt));
  },

  async librarySnapshot(now = new Date().toISOString()) {
    const snapshot = { records: [], due: [], known: [], articles: [], errors: [] };
    try {
      snapshot.records = readVocabularyStore();
      const timestamp = new Date(validDate(now)).getTime();
      snapshot.due = snapshot.records
        .filter((record) => new Date(record.reviewDueAt).getTime() <= timestamp)
        .sort((left, right) => new Date(left.reviewDueAt) - new Date(right.reviewDueAt));
    } catch (error) {
      snapshot.errors.push(error.message);
    }
    try {
      snapshot.known = readKnownWordsStore();
    } catch (error) {
      snapshot.errors.push(error.message);
    }
    try {
      snapshot.articles = readSavedArticlesStore();
    } catch (error) {
      snapshot.errors.push(error.message);
    }
    return snapshot;
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
    recordSyncMutations([{ collection: "vocabulary", id: record.id }]);
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
    const previousRecords = readVocabularyStore();
    const records = previousRecords.filter((record) => normalizedIdentityPart(record.termZh) !== candidate.normalized);
    writeKnownAndVocabularyStores(nextWords, records);
    const removedIds = new Set(records.map((record) => record.id));
    recordSyncMutations([
      { collection: "knownWords", id: candidate.normalized },
      ...previousRecords
        .filter((record) => !removedIds.has(record.id))
        .map((record) => ({ collection: "vocabulary", id: record.id, deleted: true })),
    ]);
    return { added: !existing, word: existing || candidate, words: nextWords, records };
  },

  async unmarkKnown(termZh) {
    const normalized = normalizedIdentityPart(termZh);
    const words = readKnownWordsStore();
    const nextWords = words.filter((word) => word.normalized !== normalized);
    writeKnownWordsStore(nextWords);
    if (nextWords.length !== words.length) {
      recordSyncMutations([{ collection: "knownWords", id: normalized, deleted: true }]);
    }
    return { removed: nextWords.length !== words.length, words: nextWords };
  },
});
