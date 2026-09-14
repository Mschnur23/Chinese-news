import { PublicError } from "./http.js";
import { serverConfig } from "./server-config.js";

export const relatedReadingSchema = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      minItems: serverConfig.relatedReadingLimit,
      maxItems: serverConfig.relatedReadingLimit,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["titleEn", "publication", "url", "descriptionEn"],
        properties: {
          titleEn: { type: "string" },
          publication: { type: "string" },
          url: { type: "string" },
          descriptionEn: { type: "string" },
        },
      },
    },
  },
});

function boundedText(value, maximum) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maximum) {
    throw new PublicError("MODEL_OUTPUT_INVALID", "Related reading could not be verified. Please retry.", 502);
  }
  return value.trim();
}

function normalizedUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error();
    const allowed = serverConfig.relatedReadingDomains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
    if (!allowed) throw new Error();
    url.hash = "";
    return url.toString();
  } catch {
    throw new PublicError("MODEL_OUTPUT_INVALID", "Related reading could not be verified. Please retry.", 502);
  }
}

function citationIdentity(value) {
  try {
    const url = new URL(value);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return "";
  }
}

export function validateRelatedReading(value, citedUrls = []) {
  if (!value || !Array.isArray(value.items) || value.items.length !== serverConfig.relatedReadingLimit) {
    throw new PublicError("MODEL_OUTPUT_INVALID", "Related reading was incomplete. Please retry.", 502);
  }
  const cited = new Set(citedUrls.map(citationIdentity).filter(Boolean));
  const seen = new Set();
  const items = value.items.map((item) => {
    const url = normalizedUrl(item?.url);
    const identity = citationIdentity(url);
    if (!cited.has(identity) || seen.has(identity)) {
      throw new PublicError("MODEL_OUTPUT_INVALID", "Related reading could not be verified. Please retry.", 502);
    }
    seen.add(identity);
    return {
      titleEn: boundedText(item.titleEn, 240),
      publication: boundedText(item.publication, 80),
      url,
      descriptionEn: boundedText(item.descriptionEn, 320),
    };
  });
  return { items };
}
