import { PublicError } from "./http.js";
import { serverConfig } from "./server-config.js";

const allowedLearnerLevels = new Set(["Intermediate", "Advanced"]);
const termCountsByLearnerLevel = Object.freeze({ Intermediate: 20, Advanced: 10 });
const articleIdPattern = /^(the-paper|stcn|jiemian):\d+$/;

function requireString(value, field, maximumLength) {
  if (typeof value !== "string") {
    throw new PublicError("REQUEST_INVALID", `${field} is required.`, 400);
  }
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > maximumLength) {
    throw new PublicError("REQUEST_INVALID", `${field} is invalid.`, 400);
  }
  return cleaned;
}

function normalized(value) {
  return value.replace(/\s+/g, " ").trim();
}

function occurrenceCount(text, occurrence) {
  return text.split(occurrence).length - 1;
}

export function parseJsonRequest(request) {
  const contentType = String(request.headers?.["content-type"] || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    throw new PublicError("CONTENT_TYPE_INVALID", "Send this request as JSON.", 415);
  }

  const length = Number(request.headers?.["content-length"] || 0);
  if (length > serverConfig.maximumModelRequestBytes) {
    throw new PublicError("REQUEST_TOO_LARGE", "The article is too large to analyze.", 413);
  }

  let body = request.body;
  if (typeof body === "string") {
    if (new TextEncoder().encode(body).byteLength > serverConfig.maximumModelRequestBytes) {
      throw new PublicError("REQUEST_TOO_LARGE", "The article is too large to analyze.", 413);
    }
    try {
      body = JSON.parse(body);
    } catch {
      throw new PublicError("REQUEST_INVALID", "The request contains invalid JSON.", 400);
    }
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new PublicError("REQUEST_INVALID", "The request body is invalid.", 400);
  }
  if (new TextEncoder().encode(JSON.stringify(body)).byteLength > serverConfig.maximumModelRequestBytes) {
    throw new PublicError("REQUEST_TOO_LARGE", "The article is too large to analyze.", 413);
  }
  return body;
}

export function validateLearnerLevel(value) {
  if (!allowedLearnerLevels.has(value)) {
    throw new PublicError("LEARNER_LEVEL_INVALID", "Choose Intermediate or Advanced Mandarin.", 400);
  }
  return value;
}

export function termCountForLearnerLevel(value) {
  return termCountsByLearnerLevel[validateLearnerLevel(value)];
}

export function validateInterests(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 8) {
    throw new PublicError("INTERESTS_INVALID", "The interest list is invalid.", 400);
  }
  return value.map((item) => requireString(item, "Interest", 80));
}

export function validateKnownTerms(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 500) {
    throw new PublicError("KNOWN_TERMS_INVALID", "The known-word list is invalid.", 400);
  }
  const terms = value.map((item) => requireString(item, "Known term", 80));
  return [...new Map(terms.map((term) => [normalized(term).toLocaleLowerCase(), term])).values()];
}

export function validateArticleForLanguage(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PublicError("ARTICLE_INVALID", "The article is missing or invalid.", 400);
  }

  const id = requireString(value.id, "Article ID", 80);
  if (!articleIdPattern.test(id)) {
    throw new PublicError("ARTICLE_INVALID", "The article ID is invalid.", 400);
  }
  const sourceId = requireString(value.sourceId, "Source ID", 30);
  if (id.split(":")[0] !== sourceId || !serverConfig.sources[sourceId]) {
    throw new PublicError("ARTICLE_INVALID", "The article source is invalid.", 400);
  }

  let canonicalUrl;
  try {
    canonicalUrl = new URL(value.canonicalUrl);
  } catch {
    throw new PublicError("ARTICLE_INVALID", "The canonical article link is invalid.", 400);
  }
  if (canonicalUrl.protocol !== "https:" || !serverConfig.sources[sourceId].hosts.includes(canonicalUrl.hostname)) {
    throw new PublicError("ARTICLE_INVALID", "The article source is not allowed.", 400);
  }

  const paragraphs = Array.isArray(value.paragraphs)
    ? value.paragraphs.map((item) => requireString(item, "Article paragraph", serverConfig.maximumArticleCharacters))
    : [];
  if (!paragraphs.length || paragraphs.length > 300) {
    throw new PublicError("ARTICLE_INVALID", "The article text is missing or invalid.", 400);
  }
  const bodyText = requireString(value.bodyText, "Article text", serverConfig.maximumArticleCharacters);
  const boundedParagraphText = paragraphs.join("\n\n").slice(0, serverConfig.maximumArticleCharacters);
  if (normalized(boundedParagraphText) !== normalized(bodyText)) {
    throw new PublicError("ARTICLE_INVALID", "The article paragraphs do not match its text.", 400);
  }

  return {
    id,
    titleZh: requireString(value.titleZh, "Article title", 500),
    sourceId,
    sourceName: requireString(value.sourceName, "Source name", 80),
    canonicalUrl: canonicalUrl.toString(),
    bodyText,
  };
}

export function validateSentenceSelection(value, article) {
  const sentence = requireString(value, "Selected sentence", serverConfig.maximumSentenceCharacters);
  if (!normalized(article.bodyText).includes(normalized(sentence))) {
    throw new PublicError("SENTENCE_NOT_IN_ARTICLE", "Select text directly from the article before requesting help.", 400);
  }
  return sentence;
}

function validateModelString(value, field, maximumLength = 1200) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maximumLength) {
    throw new PublicError("MODEL_OUTPUT_INVALID", "The language guide did not pass validation. Please retry.", 502);
  }
  return value.trim();
}

export function validateAnalysisOutput(value, article, expectedTermCount = 10, knownTerms = []) {
  if (!value || typeof value !== "object" || value.articleId !== article.id) {
    throw new PublicError("MODEL_OUTPUT_INVALID", "The language guide did not match this article. Please retry.", 502);
  }
  if (
    ![10, 20].includes(expectedTermCount)
    || !Array.isArray(value.gistEn)
    || value.gistEn.length !== 2
    || !Array.isArray(value.terms)
    || value.terms.length !== expectedTermCount
  ) {
    throw new PublicError("MODEL_OUTPUT_INVALID", "The language guide was incomplete. Please retry.", 502);
  }

  const gistEn = value.gistEn.map((sentence) => validateModelString(sentence, "Gist", 700));
  const seen = new Set();
  const known = new Set(knownTerms.map((term) => normalized(term).toLocaleLowerCase()));
  const terms = value.terms.map((rawTerm) => {
    if (!rawTerm || typeof rawTerm !== "object") {
      throw new PublicError("MODEL_OUTPUT_INVALID", "The language guide contained an invalid term. Please retry.", 502);
    }
    const termZh = validateModelString(rawTerm.termZh, "Term", 24);
    // The model may occasionally put a full clause in exactOccurrence even
    // when termZh is a proper vocabulary item. Highlight only that item.
    validateModelString(rawTerm.exactOccurrence, "Occurrence", 80);
    const term = {
      termZh,
      pinyin: validateModelString(rawTerm.pinyin, "Pinyin", 160),
      meaningEn: validateModelString(rawTerm.meaningEn, "Meaning", 300),
      exactOccurrence: termZh,
      contextSentenceZh: validateModelString(rawTerm.contextSentenceZh, "Context", 600),
    };
    const identity = normalized(term.termZh).toLocaleLowerCase();
    if (known.has(identity)) {
      throw new PublicError("MODEL_OUTPUT_KNOWN_TERM", "The language guide repeated a word marked as known. Please retry.", 502);
    }
    if (seen.has(identity)) {
      throw new PublicError("MODEL_OUTPUT_INVALID", "The language guide repeated a term. Please retry.", 502);
    }
    seen.add(identity);
    if (
      !article.bodyText.includes(term.termZh)
      || !article.bodyText.includes(term.contextSentenceZh)
      || !term.contextSentenceZh.includes(term.termZh)
    ) {
      throw new PublicError("MODEL_OUTPUT_UNGROUNDED", "The language guide could not be verified against the article. Please retry.", 502);
    }
    return term;
  });

  const prioritizedTerms = terms
    .map((term, priority) => ({ term, priority, frequency: occurrenceCount(article.bodyText, term.exactOccurrence) }))
    .sort((left, right) => right.frequency - left.frequency || left.priority - right.priority)
    .map(({ term }) => term);

  return { articleId: article.id, gistEn, terms: prioritizedTerms };
}

export function validateWordSelection(termValue, contextValue, article) {
  const termZh = requireString(termValue, "Selected word", 80);
  const contextSentenceZh = requireString(contextValue, "Word context", 600);
  if (!article.bodyText.includes(contextSentenceZh) || !contextSentenceZh.includes(termZh)) {
    throw new PublicError("WORD_NOT_IN_ARTICLE", "Tap a word directly in the article before requesting help.", 400);
  }
  return { termZh, contextSentenceZh };
}

export function validateWordHelpOutput(value, selection) {
  if (!value || typeof value !== "object") {
    throw new PublicError("MODEL_OUTPUT_INVALID", "The word explanation was invalid. Please retry.", 502);
  }
  const termZh = validateModelString(value.termZh, "Selected word", 80);
  const contextSentenceZh = validateModelString(value.contextSentenceZh, "Word context", 600);
  if (normalized(termZh) !== normalized(selection.termZh) || normalized(contextSentenceZh) !== normalized(selection.contextSentenceZh)) {
    throw new PublicError("MODEL_OUTPUT_UNGROUNDED", "The word explanation did not match the selected article text. Please retry.", 502);
  }
  return {
    termZh,
    pinyin: validateModelString(value.pinyin, "Pinyin", 160),
    meaningEn: validateModelString(value.meaningEn, "Meaning", 400),
    contextSentenceZh,
  };
}

export function validateExplanationOutput(value, sentenceZh) {
  if (!value || typeof value !== "object") {
    throw new PublicError("MODEL_OUTPUT_INVALID", "The sentence explanation was invalid. Please retry.", 502);
  }
  const returnedSentence = validateModelString(value.sentenceZh, "Sentence", serverConfig.maximumSentenceCharacters);
  if (normalized(returnedSentence) !== normalized(sentenceZh)) {
    throw new PublicError("MODEL_OUTPUT_UNGROUNDED", "The explanation did not match the selected sentence. Please retry.", 502);
  }
  return {
    sentenceZh,
    translationEn: validateModelString(value.translationEn, "Translation", 1200),
    explanationEn: validateModelString(value.explanationEn, "Explanation", 1600),
  };
}

export function analysisSchemaForTermCount(termCount) {
  if (![10, 20].includes(termCount)) throw new Error("Unsupported analysis term count");
  return {
    type: "object",
    additionalProperties: false,
    required: ["articleId", "gistEn", "terms"],
    properties: {
      articleId: { type: "string" },
      gistEn: { type: "array", minItems: 2, maxItems: 2, items: { type: "string" } },
      terms: {
        type: "array",
        minItems: termCount,
        maxItems: termCount,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["termZh", "pinyin", "meaningEn", "exactOccurrence", "contextSentenceZh"],
          properties: {
            termZh: { type: "string" },
            pinyin: { type: "string" },
            meaningEn: { type: "string" },
            exactOccurrence: { type: "string" },
            contextSentenceZh: { type: "string" },
          },
        },
      },
    },
  };
}

export const explanationSchema = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["sentenceZh", "translationEn", "explanationEn"],
  properties: {
    sentenceZh: { type: "string" },
    translationEn: { type: "string" },
    explanationEn: { type: "string" },
  },
});

export const wordHelpSchema = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["termZh", "pinyin", "meaningEn", "contextSentenceZh"],
  properties: {
    termZh: { type: "string" },
    pinyin: { type: "string" },
    meaningEn: { type: "string" },
    contextSentenceZh: { type: "string" },
  },
});
