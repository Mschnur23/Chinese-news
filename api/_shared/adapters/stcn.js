import { requireArticleId, validateArticle } from "../article.js";
import { between, cleanText, extractParagraphs, firstText, toIsoDate, truncate } from "../html.js";
import { fetchPublisherHtml } from "../http.js";
import { serverConfig } from "../server-config.js";

const definition = serverConfig.sources.stcn;

export const stcnAdapter = Object.freeze({
  ...definition,
  async discover(limit) {
    const { html } = await fetchPublisherHtml(definition.discoveryUrl, definition.hosts);
    const items = [];
    const seen = new Set();
    const pattern = /<a\b([^>]*href=["'](?:https?:\/\/(?:www\.)?stcn\.com)?\/article\/detail\/(\d+)\.html[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;
    for (const match of html.matchAll(pattern)) {
      const numericId = match[2];
      const titleAttribute = match[1].match(/title=["']([^"']+)["']/i)?.[1] || "";
      const titleZh = cleanText(titleAttribute || match[3]);
      if (seen.has(numericId) || titleZh.length < 8) continue;
      seen.add(numericId);
      const context = html.slice(Math.max(0, match.index - 250), Math.min(html.length, match.index + match[0].length + 350));
      const dateText = context.match(/(20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\s+\d{1,2}:\d{2}|\d{1,2}[-/.]\d{1,2}\s+\d{1,2}:\d{2})/)?.[1] || "";
      const description = firstText(context, /<(?:p|div)[^>]*class=["'][^"']*(?:summary|desc)[^"']*["'][^>]*>([\s\S]*?)<\/(?:p|div)>/i);
      items.push({
        id: `${definition.id}:${numericId}`,
        titleZh,
        sourceId: definition.id,
        sourceName: definition.name,
        canonicalUrl: definition.articleUrl(numericId),
        publishedAt: toIsoDate(dateText),
        description: truncate(description, 180),
      });
      if (items.length >= limit) break;
    }
    return items;
  },

  async detail(id) {
    const numericId = requireArticleId(id, definition.id);
    const { html, finalUrl } = await fetchPublisherHtml(definition.articleUrl(numericId), definition.hosts);
    const titleZh = firstText(html, /<div[^>]*class=["'][^"']*detail-title[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    const info = between(html, /<div[^>]*class=["'][^"']*detail-info[^"']*["'][^>]*>/i, /<div[^>]*class=["'][^"']*detail-content-wrapper/i);
    const content = between(html, /<div[^>]*class=["'][^"']*detail-content["'][^>]*>/i, /<div[^>]*class=["'][^"']*detail-content-editor/i);
    const publishedAt = toIsoDate(info.match(/20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\s+\d{1,2}:\d{2}/)?.[0]);
    const author = cleanText(info.match(/来源[：:]([^<]+)/)?.[1] || "");
    return validateArticle({
      id,
      titleZh,
      sourceId: definition.id,
      sourceName: definition.name,
      sourceHomepageUrl: definition.homepageUrl,
      sourceDescription: definition.description,
      canonicalUrl: finalUrl.split("?")[0],
      publishedAt,
      author,
      bodyText: "",
      paragraphs: extractParagraphs(content),
    });
  },
});
