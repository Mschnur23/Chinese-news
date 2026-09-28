import { PublicError } from "./http.js";
import { serverConfig } from "./server-config.js";

function responseText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text;
  for (const item of payload?.output || []) {
    if (item?.type !== "message") continue;
    for (const content of item.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return "";
}

const nonRetryableLimitCodes = new Set([
  "credit_balance_exhausted",
  "organization_spend_limit_exceeded",
  "project_spend_limit_exceeded",
  "organization_usage_limit_exceeded",
]);

function providerErrorDetails(response, payload) {
  return {
    status: response.status,
    code: typeof payload?.error?.code === "string" ? payload.error.code : "unknown",
    type: typeof payload?.error?.type === "string" ? payload.error.type : "unknown",
    requestId: response.headers?.get?.("x-request-id") || "unavailable",
  };
}

function publicProviderError(details) {
  if (details.status === 401 || details.status === 403) {
    return new PublicError(
      "OPENAI_AUTH_FAILED",
      "OpenAI rejected the server credentials. Replace OPENAI_API_KEY in Vercel and redeploy.",
      503,
    );
  }
  if (details.status === 429 && (nonRetryableLimitCodes.has(details.code) || details.type === "insufficient_quota")) {
    return new PublicError(
      "OPENAI_LIMIT_REACHED",
      "OpenAI API credits or a spending limit have been reached. Check the project billing and usage limits.",
      503,
    );
  }
  if (details.status === 429) {
    return new PublicError("MODEL_RATE_LIMITED", "AI reading support is busy. Wait a moment and retry.", 503);
  }
  if (details.status === 400 || details.status === 404) {
    return new PublicError(
      "MODEL_REQUEST_REJECTED",
      "OpenAI rejected the reading-support request. Check OPENAI_MODEL and the Vercel function log.",
      502,
    );
  }
  return new PublicError("MODEL_PROVIDER_FAILED", "AI reading support is temporarily unavailable. Please retry.", 502);
}

function isRetryableProviderFailure(details) {
  if (details.status === 429) {
    return !nonRetryableLimitCodes.has(details.code) && details.type !== "insufficient_quota";
  }
  return details.status === 408 || details.status === 409 || details.status >= 500;
}

function retryDelayMs(response, attempt) {
  const retryAfter = response.headers?.get?.("retry-after");
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 4000);
  return 400 * (2 ** attempt) + Math.floor(Math.random() * 150);
}

function wait(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, milliseconds);
    signal.addEventListener("abort", () => {
      clearTimeout(timeout);
      reject(new DOMException("Request cancelled", "AbortError"));
    }, { once: true });
  });
}

async function requestModel({ instructions, input, model, maxOutputTokens, format, tools, toolChoice, include }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new PublicError(
      "AI_NOT_CONFIGURED",
      "AI reading support is not configured yet. Add OPENAI_API_KEY to the server environment and retry.",
      503,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), serverConfig.modelRequestTimeoutMs);
  try {
    const requestBody = JSON.stringify({
      model,
      store: false,
      instructions,
      input,
      reasoning: { effort: "low" },
      max_output_tokens: maxOutputTokens,
      ...(tools ? { tools } : {}),
      ...(toolChoice ? { tool_choice: toolChoice } : {}),
      ...(include ? { include } : {}),
      text: { format },
    });
    let payload = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      let response;
      try {
        response = await fetch(serverConfig.openAIEndpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: requestBody,
          signal: controller.signal,
        });
      } catch (error) {
        if (error?.name === "AbortError") throw error;
        console.error("OpenAI Responses API connection failed", { attempt: attempt + 1 });
        if (attempt < 2) {
          await wait(retryDelayMs({}, attempt), controller.signal);
          continue;
        }
        throw error;
      }
      payload = await response.json().catch(() => null);
      if (response.ok) break;
      const details = providerErrorDetails(response, payload);
      console.error("OpenAI Responses API request failed", details);
      if (attempt < 2 && isRetryableProviderFailure(details)) {
        await wait(retryDelayMs(response, attempt), controller.signal);
        continue;
      }
      throw publicProviderError(details);
    }
    const text = responseText(payload);
    if (!text) {
      throw new PublicError("MODEL_OUTPUT_INVALID", "The language response was empty. Please retry.", 502);
    }
    try {
      return { output: JSON.parse(text), payload };
    } catch {
      throw new PublicError("MODEL_OUTPUT_INVALID", "The language response was invalid. Please retry.", 502);
    }
  } catch (error) {
    if (error instanceof PublicError) throw error;
    if (error?.name === "AbortError") {
      throw new PublicError("MODEL_TIMEOUT", "AI reading support took too long. Please retry.", 504);
    }
    throw new PublicError("MODEL_PROVIDER_FAILED", "AI reading support is temporarily unavailable. Please retry.", 502);
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestStructuredModel({ instructions, input, schema, schemaName, maxOutputTokens }) {
  const result = await requestModel({
    instructions,
    input,
    model: serverConfig.openAIModel,
    maxOutputTokens,
    format: { type: "json_schema", name: schemaName, strict: true, schema },
  });
  return result.output;
}

function webSearchSourceUrls(payload) {
  const urls = [];
  for (const item of payload?.output || []) {
    for (const source of item?.action?.sources || []) {
      if (typeof source?.url === "string") urls.push(source.url);
    }
    for (const content of item?.content || []) {
      for (const annotation of content?.annotations || []) {
        const url = annotation?.url || annotation?.url_citation?.url;
        if (typeof url === "string") urls.push(url);
      }
    }
  }
  return [...new Set(urls)];
}

export async function requestRelatedReading({ instructions, input, schema }) {
  const result = await requestModel({
    instructions,
    input,
    model: serverConfig.openAISearchModel,
    maxOutputTokens: 1400,
    tools: [{ type: "web_search", filters: { allowed_domains: serverConfig.relatedReadingDomains } }],
    toolChoice: "required",
    include: ["web_search_call.action.sources"],
    format: { type: "json_schema", name: "related_english_reading", strict: true, schema },
  });
  return { output: result.output, citedUrls: webSearchSourceUrls(result.payload) };
}
