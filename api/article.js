import { jiemianAdapter } from "./_shared/adapters/jiemian.js";
import { stcnAdapter } from "./_shared/adapters/stcn.js";
import { thePaperAdapter } from "./_shared/adapters/the-paper.js";
import { PublicError, sendJson } from "./_shared/http.js";

const adapters = Object.freeze({
  "the-paper": thePaperAdapter,
  stcn: stcnAdapter,
  jiemian: jiemianAdapter,
});

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return sendJson(response, 405, { ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use GET for article retrieval." }, warnings: [] });
  }

  try {
    const id = typeof request.query?.id === "string" ? request.query.id : "";
    const sourceId = id.split(":")[0];
    const adapter = adapters[sourceId];
    if (!adapter) throw new PublicError("ARTICLE_ID_INVALID", "The selected article ID is invalid.", 400);
    const article = await adapter.detail(id);
    return sendJson(response, 200, { ok: true, data: article, warnings: [] });
  } catch (error) {
    const publicError = error instanceof PublicError ? error : new PublicError("ARTICLE_FAILED", "The selected article could not be prepared.", 500);
    return sendJson(response, publicError.status, { ok: false, error: { code: publicError.code, message: publicError.message }, warnings: [] });
  }
}

