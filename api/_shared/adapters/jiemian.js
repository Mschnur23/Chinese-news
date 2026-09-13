import { requireArticleId, validateArticle } from "../article.js";
import { between, cleanText, extractImageUrl, extractMetadataImageUrl, extractParagraphs, firstText, toIsoDate, truncate } from "../html.js";
import { fetchPublisherHtml, PublicError } from "../http.js";
import { serverConfig } from "../server-config.js";

const definition = serverConfig.sources.jiemian;

export const jiemianAdapter = Object.freeze({
  ...definition,
  async discover(limit) {
    const { html } = await fetchPublisherHtml(definition.discoveryUrl, definition.hosts);
    const publicHtml = html.replace(/<div class="vip-module">[\s\S]*?<div class="commerce-module">/i, '<div class="commerce-module">');
    const items = [];
    const seen = new Set();
    const pattern = /<a\b([^>]*href=["'](?:https?:\/\/(?:www\.)?jiemian\.com)?\/article\/(\d+)\.html[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;
    for (const match of publicHtml.matchAll(pattern)) {
      const numericId = match[2];
      const titleZh = cleanText(match[3]);
      if (seen.has(numericId) || titleZh.length < 8 || /VIP|会员/.test(match[3])) continue;
      seen.add(numericId);
      const context = publicHtml.slice(Math.max(0, match.index - 200), Math.min(publicHtml.length, match.index + match[0].length + 500));
      const dateText = context.match(/(?:20\d{2}[-/.])?\d{1,2}[-/.]\d{1,2}\s+\d{1,2}:\d{2}/)?.[0] || "";
      const description = firstText(context, /<div[^>]*class=["'][^"']*news-summary[^"']*["'][^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
      items.push({
        id: `${definition.id}:${numericId}`,
        titleZh,
        sourceId: definition.id,
        sourceName: definition.name,
        canonicalUrl: definition.articleUrl(numericId),
        imageUrl: extractImageUrl(context, definition.homepageUrl),
        publishedAt: toIsoDate(dateText),
        description: truncate(description, 180),
      });
      if (items.length >= limit * 8) break;
    }
    return items
      .sort((left, right) => Number(right.id.split(":")[1]) - Number(left.id.split(":")[1]))
      .slice(0, limit);
  },

  async detail(id) {
    const numericId = requireArticleId(id, definition.id);
    const { html, finalUrl } = await fetchPublisherHtml(definition.articleUrl(numericId), definition.hosts);
    if (/var\s+is_pay\s*=\s*['"]1['"]/.test(html) || /class=["'][^"']*paywall/i.test(html)) {
      throw new PublicError("ARTICLE_PAYWALLED", "This 界面新闻 article requires paid access and cannot be shown here.", 422);
    }
    const titleZh = firstText(html, /<div[^>]*class=["'][^"']*article-header[^"']*["'][^>]*>[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const info = between(html, /<div[^>]*class=["'][^"']*article-info[^"']*["'][^>]*>/i, /<div[^>]*class=["'][^"']*article-main/i);
    const content = between(html, /<div[^>]*class=["'][^"']*article-content[^"']*["'][^>]*>/i, /<!--\s*(?:关联公司|界面AI|分享收藏)/i);
    const timestamp = html.match(/data-article-publish-time=["'](\d+)["']/)?.[1];
    const publishedAt = timestamp ? new Date(Number(timestamp) * 1000).toISOString() : toIsoDate(info);
    const author = firstText(info, /<span[^>]*class=["'][^"']*author[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    return validateArticle({
      id,
      titleZh,
      sourceId: definition.id,
      sourceName: definition.name,
      sourceHomepageUrl: definition.homepageUrl,
      sourceDescription: definition.description,
      canonicalUrl: finalUrl.split("?")[0],
      imageUrl: extractImageUrl(content, finalUrl) || extractMetadataImageUrl(html, finalUrl),
      publishedAt,
      author,
      bodyText: "",
      paragraphs: extractParagraphs(content),
    });
  },
});
