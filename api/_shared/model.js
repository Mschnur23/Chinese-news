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
    const response = await fetch(serverConfig.openAIEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
      }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new PublicError("MODEL_PROVIDER_FAILED", "AI reading support is temporarily unavailable. Please retry.", 502);
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
