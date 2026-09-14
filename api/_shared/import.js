import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { cleanText, normalizeImageUrl } from "./html.js";
import { PublicError } from "./http.js";
import { serverConfig } from "./server-config.js";

function requiredString(value, field, maximumLength) {
  if (typeof value !== "string") {
    throw new PublicError("IMPORT_INPUT_INVALID", `${field} is required.`, 400);
  }
  const cleaned = value.normalize("NFKC").trim();
  if (!cleaned || cleaned.length > maximumLength) {
    throw new PublicError("IMPORT_INPUT_INVALID", `${field} is invalid.`, 400);
  }
  return cleaned;
}

function optionalString(value, maximumLength) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") throw new PublicError("IMPORT_INPUT_INVALID", "Import metadata is invalid.", 400);
  return value.normalize("NFKC").trim().slice(0, maximumLength);
}

function isPrivateIpv4(hostname) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && (b === 0 || b === 168))
    || (a === 198 && (b === 18 || b === 19))
    || a >= 224;
}

function isPrivateIpv6(hostname) {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || /^fe[89ab]/.test(normalized);
}

export function validateImportUrl(value, { optional = false } = {}) {
  if ((value === undefined || value === null || String(value).trim() === "") && optional) return "";
  let url;
  try {
    url = new URL(requiredString(value, "Article URL", 2048));
  } catch (error) {
    if (error instanceof PublicError) throw error;
    throw new PublicError("IMPORT_URL_INVALID", "Enter a complete HTTPS article link.", 400);
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const blockedName = serverConfig.blockedImportHosts.includes(hostname)
    || hostname.endsWith(".local")
    || hostname.endsWith(".internal");
  const addressType = isIP(hostname);
  const blockedAddress = addressType === 4 ? isPrivateIpv4(hostname) : addressType === 6 ? isPrivateIpv6(hostname) : false;
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || (url.port && url.port !== "443")
    || blockedName
    || blockedAddress
  ) {
    throw new PublicError("IMPORT_URL_UNSUPPORTED", "Use a direct public HTTPS article link.", 400);
  }
  url.hash = "";
  return url.toString();
}

export function parseImportRequest(request) {
  const contentType = String(request.headers?.["content-type"] || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    throw new PublicError("CONTENT_TYPE_INVALID", "Send this request as JSON.", 415);
  }
  const declaredLength = Number(request.headers?.["content-length"] || 0);
  if (declaredLength > serverConfig.maximumImportRequestBytes) {
    throw new PublicError("IMPORT_TEXT_TOO_LONG", "The imported article is too long.", 413);
  }
  let body = request.body;
  if (typeof body === "string") {
    if (new TextEncoder().encode(body).byteLength > serverConfig.maximumImportRequestBytes) {
      throw new PublicError("IMPORT_TEXT_TOO_LONG", "The imported article is too long.", 413);
    }
    try {
      body = JSON.parse(body);
    } catch {
      throw new PublicError("IMPORT_INPUT_INVALID", "The import request is invalid.", 400);
    }
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new PublicError("IMPORT_INPUT_INVALID", "The import request is invalid.", 400);
  }
  if (new TextEncoder().encode(JSON.stringify(body)).byteLength > serverConfig.maximumImportRequestBytes) {
    throw new PublicError("IMPORT_TEXT_TOO_LONG", "The imported article is too long.", 413);
  }
  if (!['url', 'text'].includes(body.mode)) {
    throw new PublicError("IMPORT_MODE_INVALID", "Choose link or pasted text.", 400);
  }
  return body;
}

function cleanMarkdownBlock(block) {
  return cleanText(
    block
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/^\s{0,3}(?:#{1,6}|>|[-+*]|\d+[.)])\s+/gm, "")
      .replace(/[*_~`]/g, ""),
  );
}

export function paragraphsFromText(value, { markdown = false } = {}) {
  if (typeof value !== "string") return [];
  const normalized = value.normalize("NFKC").replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];
  const withoutCode = markdown ? normalized.replace(/```[\s\S]*?```/g, " ") : normalized;
  let blocks = withoutCode.split(/\n\s*\n+/);
  if (blocks.length === 1 && withoutCode.includes("\n")) blocks = withoutCode.split(/\n+/);
  return blocks
    .map((block) => markdown ? cleanMarkdownBlock(block) : cleanText(block))
    .filter((block) => block.length >= 2 && /\p{Script=Han}/u.test(block))
    .slice(0, 300);
}

function validateArticleText(paragraphs) {
  const bodyText = paragraphs.join("\n\n");
  if (bodyText.length < serverConfig.minimumArticleCharacters) {
    throw new PublicError("IMPORT_TEXT_TOO_SHORT", "Add more of the Chinese article before importing it.", 422);
  }
  if (bodyText.length > serverConfig.maximumArticleCharacters) {
    throw new PublicError("IMPORT_TEXT_TOO_LONG", "Shorten the article to 30,000 characters or fewer.", 413);
  }
  const hanCount = (bodyText.match(/\p{Script=Han}/gu) || []).length;
  if (hanCount < serverConfig.minimumImportHanCharacters) {
    throw new PublicError("IMPORT_NOT_CHINESE", "The import needs more Chinese article text.", 422);
  }
  return bodyText;
}

function stableId(titleZh, canonicalUrl, bodyText) {
  const hash = createHash("sha256")
    .update(`${titleZh}\u0000${canonicalUrl}\u0000${bodyText}`)
    .digest("hex")
    .slice(0, 16);
  return `user-import:${hash}`;
}

function optionalDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function importedArticle({ originType, titleZh, sourceName, canonicalUrl, sourceDescription = "", imageUrl = "", publishedAt = null, author = "", paragraphs }) {
  const bodyText = validateArticleText(paragraphs);
  const homepage = canonicalUrl ? new URL(canonicalUrl).origin + "/" : "";
  return {
    id: stableId(titleZh, canonicalUrl, bodyText),
    originType,
    titleZh,
    sourceId: "user-import",
    sourceName,
    sourceHomepageUrl: homepage,
    sourceDescription,
    canonicalUrl,
    imageUrl,
    publishedAt,
    author,
    bodyText,
    paragraphs,
  };
}

export function normalizePastedArticle(input) {
  const titleZh = requiredString(input.titleZh, "Article title", serverConfig.maximumImportTitleCharacters);
  const canonicalUrl = validateImportUrl(input.canonicalUrl, { optional: true });
  const sourceName = optionalString(input.sourceName, serverConfig.maximumImportSourceCharacters)
    || (canonicalUrl ? new URL(canonicalUrl).hostname.replace(/^www\./, "") : "Pasted article");
  return importedArticle({
    originType: "text",
    titleZh,
    sourceName,
    canonicalUrl,
    paragraphs: paragraphsFromText(requiredString(input.text, "Article text", serverConfig.maximumArticleCharacters)),
  });
}

export function normalizeExtractedArticle(canonicalUrl, data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new PublicError("IMPORT_EXTRACTION_UNAVAILABLE", "The article could not be extracted. Paste its text instead.", 502);
  }
  const metadata = data.metadata && typeof data.metadata === "object" ? data.metadata : {};
  let paragraphs = paragraphsFromText(data.markdown, { markdown: true });
  const firstHeading = typeof data.markdown === "string" ? data.markdown.match(/^#\s+(.+)$/m)?.[1] : "";
  const titleZh = optionalString(metadata.title || firstHeading, serverConfig.maximumImportTitleCharacters);
  if (!titleZh) throw new PublicError("IMPORT_ARTICLE_UNREADABLE", "No article title was found. Paste the text instead.", 422);
  if (paragraphs[0]?.replace(/\s+/g, " ").trim() === titleZh.replace(/\s+/g, " ").trim()) {
    paragraphs = paragraphs.slice(1);
  }
  const sourceUrl = validateImportUrl(metadata.sourceURL || metadata.url || canonicalUrl);
  return importedArticle({
    originType: "url",
    titleZh,
    sourceName: optionalString(metadata.ogSiteName || metadata.siteName, serverConfig.maximumImportSourceCharacters)
      || new URL(sourceUrl).hostname.replace(/^www\./, ""),
    sourceDescription: optionalString(metadata.description || metadata.ogDescription, 500),
    canonicalUrl: sourceUrl,
    imageUrl: normalizeImageUrl(metadata.ogImage || metadata.image || "", sourceUrl),
    publishedAt: optionalDate(metadata.publishedTime || metadata.articlePublishedTime || metadata.datePublished),
    author: optionalString(metadata.author, 160),
    paragraphs,
  });
}
