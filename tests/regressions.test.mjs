import assert from "node:assert/strict";
import test from "node:test";

import { extractEditorialParagraphs } from "../api/_shared/import.js";
import { sendJson } from "../api/_shared/http.js";
import { enforcePaidRequestLimit, resetPaidRequestLimitsForTests } from "../api/_shared/rate-limit.js";
import { serverConfig } from "../api/_shared/server-config.js";
import { requestRelatedReading, requestStructuredModel } from "../api/_shared/model.js";
import { emptyDriveSyncMeta, mergeDriveSyncDocuments } from "../sync-data.js";

test("short extraction never restores unfiltered page furniture", () => {
  const result = extractEditorialParagraphs(`首页 登录 下载客户端\n\n这是一则很短的中文新闻正文。\n\n相关阅读 广告合作`, {
    titleZh: "短新闻",
  });
  assert.equal(result.some((paragraph) => /首页|相关阅读|广告合作/.test(paragraph)), false);
});

test("paid endpoints enforce their per-client request budget", () => {
  resetPaidRequestLimitsForTests();
  const request = { headers: { "x-vercel-forwarded-for": "203.0.113.10" }, socket: {} };
  for (let index = 0; index < serverConfig.paidRequestLimits.analyze; index += 1) {
    assert.doesNotThrow(() => enforcePaidRequestLimit(request, "analyze", 1000));
  }
  assert.throws(
    () => enforcePaidRequestLimit(request, "analyze", 1000),
    (error) => error.code === "RATE_LIMITED" && error.status === 429,
  );
});

test("JSON responses can opt into public caching without changing the default", () => {
  const headers = new Map();
  const response = {
    statusCode: 0,
    status(value) { this.statusCode = value; },
    setHeader(name, value) { headers.set(name, value); },
    json() {},
  };
  sendJson(response, 200, { ok: true }, { cacheControl: "public, s-maxage=60" });
  assert.equal(headers.get("Cache-Control"), "public, s-maxage=60");
  sendJson(response, 400, { ok: false });
  assert.equal(headers.get("Cache-Control"), "no-store");
});

test("structured output and web search share the same Responses API transport", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  const requests = [];
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    const isSearch = Array.isArray(requests.at(-1).tools);
    const output = isSearch ? { items: [] } : { value: "ok" };
    return {
      ok: true,
      async json() {
        return { output_text: JSON.stringify(output), output: [] };
      },
    };
  };
  try {
    const schema = { type: "object", additionalProperties: false, properties: { value: { type: "string" } }, required: ["value"] };
    assert.deepEqual(await requestStructuredModel({ instructions: "test", input: "test", schema, schemaName: "test", maxOutputTokens: 50 }), { value: "ok" });
    assert.deepEqual(await requestRelatedReading({ instructions: "test", input: "test", schema: { type: "object" } }), { output: { items: [] }, citedUrls: [] });
    assert.equal(requests.length, 2);
    assert.equal(requests[0].tools, undefined);
    assert.equal(requests[1].tool_choice, "required");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test("Drive sync merges newer review state and honors newer deletions", () => {
  const localMeta = emptyDriveSyncMeta("2026-09-20T10:00:00.000Z");
  const remoteMeta = emptyDriveSyncMeta("2026-09-20T09:00:00.000Z");
  remoteMeta.tombstones.articles["https://example.test/story"] = "2026-09-20T11:00:00.000Z";
  const baseVocabulary = {
    id: "word:article:sentence",
    termZh: "产业",
    savedAt: "2026-09-19T08:00:00.000Z",
    lastReviewedAt: null,
  };
  const merged = mergeDriveSyncDocuments(
    {
      version: 1,
      updatedAt: localMeta.updatedAt,
      vocabulary: [baseVocabulary],
      knownWords: [],
      articles: [{ id: "https://example.test/story", savedAt: "2026-09-20T08:00:00.000Z" }],
      meta: localMeta,
    },
    {
      version: 1,
      updatedAt: remoteMeta.updatedAt,
      vocabulary: [{ ...baseVocabulary, reviewStage: 2, lastReviewedAt: "2026-09-20T10:30:00.000Z" }],
      knownWords: [{ termZh: "应用", normalized: "应用", knownAt: "2026-09-20T09:30:00.000Z" }],
      articles: [],
      meta: remoteMeta,
    },
  );
  assert.equal(merged.vocabulary[0].reviewStage, 2);
  assert.equal(merged.knownWords.length, 1);
  assert.equal(merged.articles.length, 0);
});

test("Drive connection creates one app-data file and stores no token", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalLocation = globalThis.location;
  const originalStorage = globalThis.localStorage;
  const originalGoogle = globalThis.google;
  const memory = new Map();
  const requests = [];
  globalThis.location = { search: "" };
  globalThis.window = { location: { protocol: "http:" }, setTimeout, clearTimeout };
  globalThis.localStorage = {
    getItem(key) { return memory.has(key) ? memory.get(key) : null; },
    setItem(key, value) { memory.set(key, String(value)); },
    removeItem(key) { memory.delete(key); },
  };
  globalThis.google = {
    accounts: {
      oauth2: {
        initTokenClient(options) {
          return { requestAccessToken() { options.callback({ access_token: "temporary-test-token" }); } };
        },
      },
    },
  };
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), authorization: options.headers?.Authorization || "", method: options.method || "GET" });
    const payload = String(url).includes("/api/client-config")
      ? { ok: true, data: { googleDriveConfigured: true, googleClientId: "public-client-id" }, warnings: [] }
      : String(url).includes("uploadType=multipart")
        ? { id: "drive-file-1", modifiedTime: "2026-09-20T12:00:00.000Z" }
        : { files: [] };
    return {
      ok: true,
      status: 200,
      headers: { get() { return null; } },
      async text() { return JSON.stringify(payload); },
      async json() { return payload; },
    };
  };
  try {
    const { source: driveSource } = await import(`../source.js?drive-test=${Date.now()}`);
    const result = await driveSource.connectDrive();
    assert.equal(result.vocabularyCount, 0);
    assert.equal(requests.filter((request) => request.url.includes("uploadType=multipart")).length, 1);
    assert.equal(requests.some((request) => request.authorization === "Bearer temporary-test-token"), true);
    assert.equal([...memory.values()].some((value) => value.includes("temporary-test-token")), false);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
    globalThis.location = originalLocation;
    globalThis.localStorage = originalStorage;
    globalThis.google = originalGoogle;
  }
});
