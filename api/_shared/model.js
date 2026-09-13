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

export async function requestStructuredModel({ instructions, input, schema, schemaName, maxOutputTokens }) {
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
        model: serverConfig.openAIModel,
        store: false,
        instructions,
        input,
        reasoning: { effort: "low" },
        max_output_tokens: maxOutputTokens,
        text: {
          format: {
            type: "json_schema",
            name: schemaName,
            strict: true,
            schema,
          },
        },
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
      return JSON.parse(text);
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
