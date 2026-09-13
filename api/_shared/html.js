const namedEntities = Object.freeze({
  amp: "&",
  apos: "'",
  gt: ">",
  hellip: "…",
  ldquo: "“",
  lsquo: "‘",
  lt: "<",
  mdash: "—",
  middot: "·",
  nbsp: " ",
  quot: '"',
  rdquo: "”",
  rsquo: "’",
});

export function decodeHtml(value = "") {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const isHex = entity[1]?.toLowerCase() === "x";
      const codePoint = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return namedEntities[entity.toLowerCase()] ?? match;
  });
}

export function cleanText(value = "") {
  return decodeHtml(
    value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--([\s\S]*?)-->/g, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[\u00a0\t\r\n ]+/g, " ")
    .trim();
}

export function extractParagraphs(fragment = "") {
  const paragraphs = [];
  for (const match of fragment.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const paragraph = cleanText(match[1]);
    if (/\p{Script=Han}/u.test(paragraph) && paragraph.length >= 12) paragraphs.push(paragraph);
  }
  return paragraphs;
}

export function normalizeImageUrl(value = "", baseUrl = "") {
  if (typeof value !== "string") return "";
  const candidate = decodeHtml(value).trim().split(/\s+/)[0];
  if (!candidate || candidate.startsWith("data:")) return "";
  try {
    const url = baseUrl ? new URL(candidate, baseUrl) : new URL(candidate);
    if (url.protocol !== "https:") return "";
    // Publisher feeds often attach a small Alibaba OSS thumbnail transform.
    // Request the original asset so cards remain sharp on high-density screens.
    if (url.searchParams.has("x-oss-process")) {
      url.searchParams.delete("x-oss-process");
    }
    return url.href;
  } catch {
    return "";
  }
}

function largestSrcsetUrl(value = "") {
  let best = { score: 0, url: "" };
  for (const entry of value.split(",")) {
    const [url, descriptor = "1x"] = entry.trim().split(/\s+/);
    const width = descriptor.match(/^(\d+)w$/)?.[1];
    const density = descriptor.match(/^(\d+(?:\.\d+)?)x$/)?.[1];
    const score = width ? Number(width) : density ? Number(density) * 1000 : 1;
    if (url && score >= best.score) best = { score, url };
  }
  return best.url;
}

export function extractMetadataImageUrl(fragment = "", baseUrl = "") {
  const candidates = [
    fragment.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1],
    fragment.match(/<meta\b[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)?.[1],
    fragment.match(/<meta\b[^>]*name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/i)?.[1],
  ];
  for (const candidate of candidates) {
    const normalized = normalizeImageUrl(candidate, baseUrl);
    if (normalized) return normalized;
  }
  return "";
}

export function extractImageUrl(fragment = "", baseUrl = "") {
  const metadataImage = extractMetadataImageUrl(fragment, baseUrl);
  if (metadataImage) return metadataImage;
  const candidates = [
    largestSrcsetUrl(fragment.match(/<img\b[^>]*data-srcset=["']([^"']+)["']/i)?.[1]),
    largestSrcsetUrl(fragment.match(/<img\b[^>]*srcset=["']([^"']+)["']/i)?.[1]),
    fragment.match(/<img\b[^>]*data-src=["']([^"']+)["']/i)?.[1],
    fragment.match(/<img\b[^>]*data-original=["']([^"']+)["']/i)?.[1],
    fragment.match(/<img\b[^>]*src=["']([^"']+)["']/i)?.[1],
  ];
  for (const candidate of candidates) {
    const normalized = normalizeImageUrl(candidate, baseUrl);
    if (normalized) return normalized;
  }
  return "";
}

export function between(value, startPattern, endPattern) {
  const start = value.search(startPattern);
  if (start < 0) return "";
  const tail = value.slice(start);
  const startMatch = tail.match(startPattern);
  if (!startMatch) return "";
  const contentStart = start + startMatch.index + startMatch[0].length;
  const remaining = value.slice(contentStart);
  const end = remaining.search(endPattern);
  return end < 0 ? remaining : remaining.slice(0, end);
}

export function firstText(value, pattern) {
  const match = value.match(pattern);
  return cleanText(match?.[1] || "");
}

export function toIsoDate(value, now = new Date()) {
  if (!value) return null;
  const normalized = cleanText(String(value));
  const relative = normalized.match(/(\d+)\s*(分钟|小时|天)前/);
  if (relative) {
    const amount = Number(relative[1]);
    const unitMs = relative[2] === "分钟" ? 60000 : relative[2] === "小时" ? 3600000 : 86400000;
    return new Date(now.getTime() - amount * unitMs).toISOString();
  }

  const full = normalized.match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})(?:日)?(?:\s+(\d{1,2}):(\d{2}))?/);
  if (full) {
    return new Date(`${full[1]}-${full[2].padStart(2, "0")}-${full[3].padStart(2, "0")}T${(full[4] || "00").padStart(2, "0")}:${full[5] || "00"}:00+08:00`).toISOString();
  }

  const short = normalized.match(/(\d{1,2})[-/.](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (short) {
    return new Date(`${now.getFullYear()}-${short[1].padStart(2, "0")}-${short[2].padStart(2, "0")}T${(short[3] || "00").padStart(2, "0")}:${short[4] || "00"}:00+08:00`).toISOString();
  }

  return null;
}

export function truncate(value, maximum = 180) {
  const text = cleanText(value);
  return text.length > maximum ? `${text.slice(0, maximum - 1)}…` : text;
}
