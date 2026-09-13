const previewMode = new URLSearchParams(globalThis.location?.search || "").get("preview") === "1";

export const config = Object.freeze({
  mode: previewMode ? "sample" : "live",
  sampleDataPath: "./data/sample.json",
  apiRoutes: Object.freeze({
    articles: "/api/articles",
    article: "/api/article",
    analyze: "/api/analyze",
    explain: "/api/explain",
  }),
  sampleDelayMs: 450,
  activeSourceIds: Object.freeze(["the-paper", "stcn", "jiemian"]),
  candidateLimitPerSource: 10,
  displayedResultLimit: 5,
  learnerLevels: Object.freeze(["Intermediate", "Advanced"]),
  defaultLearnerLevel: "Advanced",
  defaultInterests: Object.freeze([
    "人工智能",
    "中国科技",
    "商业与经济",
    "政策",
    "创业",
    "中美关系",
  ]),
  maximumArticleCharacters: 30000,
  maximumSentenceCharacters: 500,
  requestTimeoutMs: 10000,
  analysisRequestTimeoutMs: 45000,
  storageKey: "daily-chinese-read:v1:vocabulary",
  storageVersion: 1,
  featureFlags: Object.freeze({
    liveRetrieval: true,
    showPreviewStates: previewMode,
    languageScaffolding: true,
    vocabulary: false,
  }),
});
