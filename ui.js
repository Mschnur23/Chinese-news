const elements = {
  body: document.body,
  loadButton: document.querySelector("#load-reading"),
  stateSelect: document.querySelector("#preview-state"),
  stateControl: document.querySelector("#preview-state-control"),
  status: document.querySelector("#status-message"),
  notice: document.querySelector("#notice"),
  results: document.querySelector("#article-list"),
  resultCount: document.querySelector("#result-count"),
  listSection: document.querySelector("#reading-list"),
  reader: document.querySelector("#reader"),
  readerBack: document.querySelector("#reader-back"),
  readerStatus: document.querySelector("#reader-status"),
  readerError: document.querySelector("#reader-error"),
  readerContent: document.querySelector("#reader-content"),
};

let lastArticleTrigger = null;

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function formatPublicationDate(value) {
  if (!value) return "Publication time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Publication time unavailable";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function setBusy(isBusy) {
  elements.body.dataset.busy = String(isBusy);
  elements.loadButton.disabled = isBusy;
  elements.stateSelect.disabled = isBusy;
  elements.loadButton.setAttribute("aria-busy", String(isBusy));
  elements.loadButton.textContent = isBusy ? "正在准备…" : "查看今日文章";
}

export function setStatus(message) {
  elements.status.textContent = message;
}

export function showError(message) {
  elements.notice.className = "notice notice--error";
  elements.notice.textContent = message;
  elements.notice.hidden = false;
}

export function showEmpty(message) {
  elements.notice.className = "notice notice--empty";
  elements.notice.textContent = message;
  elements.notice.hidden = false;
  elements.resultCount.textContent = "0 articles";
}

export function showNotice(message) {
  if (!message) {
    elements.notice.hidden = true;
    elements.notice.textContent = "";
    return;
  }
  elements.notice.className = "notice notice--warning";
  elements.notice.textContent = message;
  elements.notice.hidden = false;
}

export function renderList(items) {
  clearResults();
  const fragment = document.createDocumentFragment();

  items.forEach((item, index) => {
    const article = createElement("article", "article-card");
    const topLine = createElement("div", "article-card__topline");
    const source = createElement("span", "source-label", item.sourceName || "Source unavailable");
    const date = createElement("time", "article-time", formatPublicationDate(item.publishedAt));
    if (item.publishedAt) date.dateTime = item.publishedAt;
    topLine.append(source, date);

    const title = createElement("h3", "article-card__title");
    const openButton = createElement("button", "article-card__action", item.titleZh || "标题暂缺");
    openButton.type = "button";
    openButton.dataset.articleId = item.id;
    openButton.setAttribute("aria-label", `Read ${item.titleZh || "this article"}`);
    title.append(openButton);
    const topic = createElement("span", "topic-pill", item.topic || "Topic unavailable");
    const description = createElement("p", "article-card__description", item.description || "No description is available.");

    const reasons = createElement("dl", "article-card__reasons");
    const matterTerm = createElement("dt", "", "Why it matters");
    const matterDescription = createElement("dd", "", item.whyItMatters || "No assessment is available.");
    const fitTerm = createElement("dt", "", "Why it fits");
    const fitDescription = createElement("dd", "", item.whyItFits || "No interest match is available.");
    reasons.append(matterTerm, matterDescription, fitTerm, fitDescription);

    const footer = createElement("div", "article-card__footer");
    const difficulty = createElement("span", "", item.difficulty || "Unknown");
    const duration = createElement(
      "span",
      "",
      item.readingMinutes ? `${item.readingMinutes} min read` : "Length unavailable",
    );
    const order = createElement("span", "article-card__order", String(index + 1).padStart(2, "0"));
    footer.append(difficulty, duration, order);

    article.append(topLine, title, topic, description, reasons, footer);
    fragment.append(article);
  });

  elements.results.append(fragment);
  elements.resultCount.textContent = `${items.length} ${items.length === 1 ? "article" : "articles"}`;
}

export function clearResults() {
  elements.results.replaceChildren();
  elements.resultCount.textContent = "—";
}

export function onLoadRequested(handler) {
  elements.loadButton.addEventListener("click", handler);
}

export function onPreviewStateChanged(handler) {
  elements.stateSelect.addEventListener("change", (event) => handler(event.target.value));
}

export function getPreviewState() {
  return elements.stateSelect.value;
}

export function setPreviewControlsVisible(isVisible) {
  elements.stateControl.hidden = !isVisible;
}

export function setArticleBusy(isBusy) {
  elements.reader.hidden = false;
  elements.reader.setAttribute("aria-busy", String(isBusy));
  elements.readerStatus.textContent = isBusy ? "正在提取干净正文…" : "";
  elements.readerBack.disabled = isBusy;
  if (isBusy) {
    elements.listSection.hidden = true;
    elements.readerContent.replaceChildren();
  }
}

export function showArticleError(message) {
  elements.readerError.textContent = message;
  elements.readerError.hidden = !message;
}

export function renderArticle(article) {
  const header = createElement("header", "reader__header");
  const sourceLine = createElement("div", "reader__source-line");
  const source = createElement("span", "source-label", article.sourceName || "Source unavailable");
  const date = createElement("time", "", formatPublicationDate(article.publishedAt));
  if (article.publishedAt) date.dateTime = article.publishedAt;
  sourceLine.append(source, date);

  const title = createElement("h2", "reader__title", article.titleZh || "标题暂缺");
  const byline = createElement("p", "reader__byline", article.author ? `By ${article.author}` : "Author unavailable");
  const original = createElement("a", "reader__original", "View the original article ↗");
  original.href = article.canonicalUrl;
  original.target = "_blank";
  original.rel = "noopener noreferrer";
  header.append(sourceLine, title, byline, original);

  const body = createElement("div", "reader__body");
  article.paragraphs.forEach((text) => body.append(createElement("p", "", text)));

  const publication = createElement("aside", "publication-note");
  publication.setAttribute("aria-label", `About ${article.sourceName || "this publication"}`);
  const publicationKicker = createElement("p", "eyebrow", "About this publication");
  const publicationName = createElement("h3", "publication-note__name", article.sourceName || "Publication unavailable");
  const publicationDescription = createElement(
    "p",
    "publication-note__description",
    article.sourceDescription || "No publication description is available.",
  );
  const publicationLink = createElement("a", "publication-note__link", `Visit ${article.sourceName || "publication"} ↗`);
  publicationLink.href = article.sourceHomepageUrl;
  publicationLink.target = "_blank";
  publicationLink.rel = "noopener noreferrer";
  publication.append(publicationKicker, publicationName, publicationDescription, publicationLink);

  elements.readerContent.replaceChildren(header, body, publication);
  elements.reader.focus();
}

export function clearReader() {
  elements.reader.hidden = true;
  elements.readerContent.replaceChildren();
  elements.readerError.hidden = true;
  elements.listSection.hidden = false;
  lastArticleTrigger?.focus();
}

export function onArticleSelected(handler) {
  elements.results.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-article-id]");
    if (button) {
      lastArticleTrigger = button;
      handler(button.dataset.articleId);
    }
  });
}

export function onReaderBack(handler) {
  elements.readerBack.addEventListener("click", handler);
}
