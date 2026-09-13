import { requireArticleId, validateArticle } from "../article.js";
import { cleanText, extractParagraphs, toIsoDate, truncate } from "../html.js";
import { fetchPublisherHtml, PublicError } from "../http.js";
import { serverConfig } from "../server-config.js";

const definition = serverConfig.sources["the-paper"];

function nextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new PublicError("SOURCE_PARSE_FAILED", "澎湃新闻 returned an unreadable page.", 502);
  try {
    return JSON.parse(match[1]);
  } catch {
    throw new PublicError("SOURCE_PARSE_FAILED", "澎湃新闻 returned an unreadable page.", 502);
  }
}

export const thePaperAdapter = Object.freeze({
  ...definition,
  async discover(limit) {
    const { html } = await fetchPublisherHtml(definition.discoveryUrl, definition.hosts);
    const data = nextData(html);
    const found = [];
    const seen = new Set();

    function walk(value) {
      if (!value || typeof value !== "object" || found.length >= limit * 4) return;
      if (value.contId && value.name && !seen.has(String(value.contId)) && Number(value.contType ?? 0) === 0) {
        seen.add(String(value.contId));
        found.push({
          id: `${definition.id}:${value.contId}`,
          titleZh: cleanText(value.name),
          sourceId: definition.id,
          sourceName: definition.name,
          canonicalUrl: definition.articleUrl(value.contId),
          publishedAt: toIsoDate(value.pubTime || value.publishTime),
          description: truncate(value.summary || value.desc || value.nodeInfo?.desc || "", 180),
        });
      }
      for (const child of Object.values(value)) walk(child);
    }

    walk(data.props?.pageProps);
    return found.filter((item) => !/^视频[丨｜]/.test(item.titleZh)).slice(0, limit);
  },

  async detail(id) {
    const numericId = requireArticleId(id, definition.id);
    const url = definition.articleUrl(numericId);
    const { html, finalUrl } = await fetchPublisherHtml(url, definition.hosts);
    const data = nextData(html);
    const content = data.props?.pageProps?.detailData?.contentDetail;
    if (!content?.content || content.isPublished === true) {
      throw new PublicError("ARTICLE_NOT_READABLE", "This 澎湃新闻 article is not publicly readable.", 422);
    }
    const paragraphs = extractParagraphs(content.content);
    return validateArticle({
      id,
      titleZh: cleanText(content.name || ""),
      sourceId: definition.id,
      sourceName: definition.name,
      sourceHomepageUrl: definition.homepageUrl,
      sourceDescription: definition.description,
      canonicalUrl: finalUrl.split("?")[0],
      publishedAt: toIsoDate(content.pubTime || content.publishTime),
      author: cleanText(content.author || ""),
      bodyText: "",
      paragraphs,
    });
  },
});
