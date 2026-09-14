import { importWithFirecrawl } from "./_shared/import-adapters/firecrawl.js";
import { normalizePastedArticle, parseImportRequest, validateImportUrl } from "./_shared/import.js";
import { validateLearnerLevel } from "./_shared/language.js";
import { PublicError, sendJson } from "./_shared/http.js";
import { enforcePaidRequestLimit } from "./_shared/rate-limit.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, { ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to import an article." }, warnings: [] });
  }

  try {
    enforcePaidRequestLimit(request, "import");
    const input = parseImportRequest(request);
    validateLearnerLevel(input.learnerLevel);
    const article = input.mode === "text"
      ? normalizePastedArticle(input)
      : await importWithFirecrawl(validateImportUrl(input.url));
    return sendJson(response, 200, { ok: true, data: article, warnings: [] });
  } catch (error) {
    const publicError = error instanceof PublicError
      ? error
      : new PublicError("IMPORT_FAILED", "The article could not be imported. Paste the text instead.", 500);
    return sendJson(response, publicError.status, { ok: false, error: { code: publicError.code, message: publicError.message }, warnings: [] });
  }
}
