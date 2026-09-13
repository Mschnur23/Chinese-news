import { config } from "./config.js";

let sampleCache;

async function readSamples() {
  if (sampleCache) return sampleCache;
  const response = await fetch(config.sampleDataPath, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("SAMPLE_DATA_UNAVAILABLE");
  sampleCache = await response.json();
  return sampleCache;
}

function unavailable(feature) {
  throw new Error(`${feature}_AVAILABLE_IN_LATER_PHASE`);
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
    const payload = await requestJson(`/api/articles?${query}`);
    return { items: payload.data.items, warnings: payload.warnings };
  },

  async detail(id) {
    if (config.mode === "sample") {
      const samples = await readSamples();
      const article = samples.articleDetails.find((item) => item.id === id);
      if (!article) throw new Error("Article not found.");
      return article;
    }
    const payload = await requestJson(`/api/article?id=${encodeURIComponent(id)}`);
    return payload.data;
  },

  async analyze(article, learnerLevel) {
    if (config.mode === "sample") {
      const samples = await readSamples();
      if (samples.articleAnalysis?.articleId !== article.id) throw new Error("Sample analysis is unavailable for this article.");
      await new Promise((resolve) => window.setTimeout(resolve, config.sampleDelayMs));
      return samples.articleAnalysis;
    }
    const payload = await requestJson("/api/analyze", {
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
    const payload = await requestJson("/api/explain", {
      method: "POST",
      timeoutMs: config.analysisRequestTimeoutMs,
      body: { article, sentenceZh, learnerLevel },
    });
    return payload.data;
  },

  async save() {
    unavailable("VOCABULARY_SAVE");
  },

  async list() {
    return [];
  },
});
