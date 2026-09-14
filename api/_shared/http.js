import { serverConfig } from "./server-config.js";

export class PublicError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function sendJson(response, status, payload, options = {}) {
  response.status(status);
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", options.cacheControl || "no-store");
  response.json(payload);
}

function assertAllowedUrl(value, allowedHosts) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !allowedHosts.includes(url.hostname)) {
    throw new PublicError("SOURCE_URL_REJECTED", "The publisher URL is not allowed.", 400);
  }
  return url;
}

async function readBoundedText(response) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > serverConfig.maximumResponseBytes) {
    throw new PublicError("SOURCE_RESPONSE_TOO_LARGE", "The publisher response was too large.", 502);
  }

  if (!response.body?.getReader) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > serverConfig.maximumResponseBytes) {
      throw new PublicError("SOURCE_RESPONSE_TOO_LARGE", "The publisher response was too large.", 502);
    }
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let bytesRead = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    if (bytesRead > serverConfig.maximumResponseBytes) {
      await reader.cancel();
      throw new PublicError("SOURCE_RESPONSE_TOO_LARGE", "The publisher response was too large.", 502);
    }
    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}

export async function fetchPublisherHtml(value, allowedHosts) {
  let url = assertAllowedUrl(value, allowedHosts);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), serverConfig.requestTimeoutMs);

  try {
    for (let redirects = 0; redirects <= serverConfig.maximumRedirects; redirects += 1) {
      const response = await fetch(url, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "zh-CN,zh;q=0.9",
          "User-Agent": serverConfig.userAgent,
        },
        redirect: "manual",
        signal: controller.signal,
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || redirects === serverConfig.maximumRedirects) {
          throw new PublicError("SOURCE_REDIRECT_REJECTED", "The publisher redirected too many times.", 502);
        }
        url = assertAllowedUrl(new URL(location, url).toString(), allowedHosts);
        continue;
      }

      if (!response.ok) {
        throw new PublicError("SOURCE_UNAVAILABLE", "The publisher is temporarily unavailable.", 502);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) {
        throw new PublicError("SOURCE_CONTENT_REJECTED", "The publisher returned an unsupported response.", 502);
      }

      assertAllowedUrl(response.url || url.toString(), allowedHosts);
      return { html: await readBoundedText(response), finalUrl: response.url || url.toString() };
    }
  } catch (error) {
    if (error instanceof PublicError) throw error;
    if (error?.name === "AbortError") {
      throw new PublicError("SOURCE_TIMEOUT", "The publisher took too long to respond.", 504);
    }
    throw new PublicError("SOURCE_UNAVAILABLE", "The publisher is temporarily unavailable.", 502);
  } finally {
    clearTimeout(timeout);
  }

  throw new PublicError("SOURCE_UNAVAILABLE", "The publisher is temporarily unavailable.", 502);
}
