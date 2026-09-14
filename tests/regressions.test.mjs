import assert from "node:assert/strict";
import test from "node:test";

import { extractEditorialParagraphs } from "../api/_shared/import.js";
import { sendJson } from "../api/_shared/http.js";
import { enforcePaidRequestLimit, resetPaidRequestLimitsForTests } from "../api/_shared/rate-limit.js";
import { serverConfig } from "../api/_shared/server-config.js";
import { requestRelatedReading, requestStructuredModel } from "../api/_shared/model.js";

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
