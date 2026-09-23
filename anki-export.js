function cleanText(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return cleanText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replace(/[\t\r\n]+/g, " ");
}

function tagPart(value) {
  return cleanText(value).replace(/\s+/g, "_").replace(/[^\p{L}\p{N}_-]/gu, "");
}

export function buildAnkiExport(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("Save at least one word before exporting to Anki.");
  }

  const seen = new Set();
  const rows = [];
  records.forEach((record) => {
    const chinese = cleanText(record?.termZh);
    const normalized = chinese.normalize("NFKC").replace(/\s+/g, "").toLocaleLowerCase("zh-CN");
    if (!chinese || !normalized || seen.has(normalized)) return;
    seen.add(normalized);

    const pinyin = escapeHtml(record.pinyin);
    const meaning = escapeHtml(record.meaningEn);
    const usageNote = escapeHtml(record.usageNote);
    const collocations = Array.isArray(record.collocations)
      ? record.collocations.map(escapeHtml).filter(Boolean).join(" · ")
      : "";
    const context = escapeHtml(record.contextSentenceZh);
    const article = escapeHtml(record.articleTitleZh);
    const source = escapeHtml(record.sourceName);
    const url = /^https:\/\//.test(cleanText(record.canonicalUrl)) ? escapeHtml(record.canonicalUrl) : "";
    const back = [
      pinyin ? `<div class="pinyin">${pinyin}</div>` : "",
      meaning ? `<div class="meaning">${meaning}</div>` : "",
      usageNote ? `<div class="usage">${usageNote}</div>` : "",
      collocations ? `<div class="collocations">${collocations}</div>` : "",
      context ? `<hr><div class="context">${context}</div>` : "",
      article || source || url
        ? `<div class="source">${[article, source].filter(Boolean).join(" · ")}${url ? ` · <a href="${url}">Original article</a>` : ""}</div>`
        : "",
    ].filter(Boolean).join("");
    const sourceTag = tagPart(record.sourceName);
    rows.push([chinese.replace(/[\t\r\n]+/g, " "), back, ["daily_chinese_read", sourceTag && `source::${sourceTag}`].filter(Boolean).join(" ")].join("\t"));
  });

  if (!rows.length) throw new Error("No complete saved words were available to export.");
  return [
    "#separator:Tab",
    "#html:true",
    "#columns:Chinese\tEnglish\tTags",
    "#tags column:3",
    ...rows,
  ].join("\n");
}
