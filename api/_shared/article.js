import { PublicError } from "./http.js";
import { serverConfig } from "./server-config.js";

export function validateArticle(detail) {
  const paragraphs = detail.paragraphs
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const bodyText = paragraphs.join("\n\n").slice(0, serverConfig.maximumArticleCharacters);
  const navigationSignals = (bodyText.match(/首页|登录|下载客户端|用户评论|广告合作/g) || []).length;

  if (bodyText.length < serverConfig.minimumArticleCharacters || navigationSignals > 4) {
    throw new PublicError("ARTICLE_NOT_READABLE", "This article is not available in a clean readable form.", 422);
  }

  return { ...detail, imageUrl: detail.imageUrl || "", bodyText, paragraphs };
}

export function requireArticleId(id, sourceId) {
  const match = String(id || "").match(new RegExp(`^${sourceId}:(\\d{4,12})$`));
  if (!match) throw new PublicError("ARTICLE_ID_INVALID", "The selected article ID is invalid.", 400);
  return match[1];
}
