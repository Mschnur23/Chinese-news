import { normalizeExtractedArticle } from "../import.js";
import { PublicError } from "../http.js";
import { serverConfig } from "../server-config.js";

async function readBoundedJson(response) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > serverConfig.maximumResponseBytes) {
    throw new PublicError("IMPORT_EXTRACTION_UNAVAILABLE", "The extraction response was too large. Paste the text instead.", 502);
  }
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > serverConfig.maximumResponseBytes) {
    throw new PublicError("IMPORT_EXTRACTION_UNAVAILABLE", "The extraction response was too large. Paste the text instead.", 502);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new PublicError("IMPORT_EXTRACTION_UNAVAILABLE", "The extraction service returned an unreadable response. Paste the text instead.", 502);
  }
}

export async function importWithFirecrawl(canonicalUrl) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new PublicError("IMPORT_PROVIDER_NOT_CONFIGURED", "Link import is not configured yet. Paste the article text instead.", 503);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), serverConfig.importProviderTimeoutMs);
  try {
    const response = await fetch(serverConfig.firecrawlEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: canonicalUrl,
        formats: ["markdown"],
        onlyMainContent: true,
        onlyCleanContent: false,
        removeBase64Images: true,
        blockAds: true,
        proxy: "basic",
        storeInCache: false,
        skipTlsVerification: false,
        timeout: serverConfig.importProviderTimeoutMs,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new PublicError("IMPORT_EXTRACTION_UNAVAILABLE", "The article could not be extracted. Paste its text instead.", 502);
    }
    const payload = await readBoundedJson(response);
    if (!payload?.success) {
      throw new PublicError("IMPORT_EXTRACTION_UNAVAILABLE", "The article could not be extracted. Paste its text instead.", 502);
    }
    return normalizeExtractedArticle(canonicalUrl, payload.data);
  } catch (error) {
    if (error instanceof PublicError) throw error;
    if (error?.name === "AbortError") {
      throw new PublicError("IMPORT_EXTRACTION_UNAVAILABLE", "Article extraction timed out. Paste the text instead.", 504);
    }
    throw new PublicError("IMPORT_EXTRACTION_UNAVAILABLE", "The article could not be extracted. Paste its text instead.", 502);
  } finally {
    clearTimeout(timeout);
  }
}
