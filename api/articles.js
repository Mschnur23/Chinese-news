import { jiemianAdapter } from "./_shared/adapters/jiemian.js";
import { stcnAdapter } from "./_shared/adapters/stcn.js";
import { thePaperAdapter } from "./_shared/adapters/the-paper.js";
import { PublicError, sendJson } from "./_shared/http.js";
import { decorateAndRank } from "./_shared/ranking.js";
import { serverConfig } from "./_shared/server-config.js";

const adapters = Object.freeze([thePaperAdapter, stcnAdapter, jiemianAdapter]);

function requestedInterests(query) {
  const raw = typeof query?.interests === "string" ? query.interests : "";
  return raw.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8);
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return sendJson(response, 405, { ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use GET for article discovery." }, warnings: [] });
  }

  const warnings = [];
  try {
    const interests = requestedInterests(request.query);
    const results = await Promise.allSettled(adapters.map((adapter) => adapter.discover(serverConfig.candidateLimitPerSource)));
    const candidates = [];
    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.length) {
        candidates.push(...result.value);
      } else {
        warnings.push(`${adapters[index].name} is temporarily unavailable.`);
      }
    });

    const items = decorateAndRank(candidates, interests, serverConfig.displayedResultLimit);
    if (!items.length) throw new PublicError("NO_ARTICLES", "No readable recent articles are available right now.", 503);
    return sendJson(response, 200, { ok: true, data: { items }, warnings });
  } catch (error) {
    const publicError = error instanceof PublicError ? error : new PublicError("DISCOVERY_FAILED", "Today’s articles could not be prepared.", 500);
    return sendJson(response, publicError.status, { ok: false, error: { code: publicError.code, message: publicError.message }, warnings });
  }
}

