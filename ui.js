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
  languageTools: document.querySelector("#language-tools"),
  learnerLevel: document.querySelector("#learner-level"),
  analyzeButton: document.querySelector("#analyze-article"),
  analysisStatus: document.querySelector("#analysis-status"),
  analysisError: document.querySelector("#analysis-error"),
  analysisPanel: document.querySelector("#analysis-panel"),
  analysisGist: document.querySelector("#analysis-gist"),
  analysisTerms: document.querySelector("#analysis-terms"),
  sentenceTools: document.querySelector("#sentence-tools"),
  explainButton: document.querySelector("#explain-sentence"),
  selectionPreview: document.querySelector("#selection-preview"),
  sentenceStatus: document.querySelector("#sentence-status"),
  sentenceError: document.querySelector("#sentence-error"),
  sentenceResult: document.querySelector("#sentence-result"),
};

let lastArticleTrigger = null;
let currentReaderBody = null;
let currentArticle = null;
let selectedSentence = "";

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
    elements.languageTools.hidden = true;
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
  currentReaderBody = body;
  currentArticle = article;
  selectedSentence = "";
  elements.selectionPreview.textContent = "No sentence selected yet.";
  elements.explainButton.disabled = true;
  elements.languageTools.hidden = false;
  clearAnalysis(article);
  clearSentenceHelp();
  elements.reader.focus();
}

function appendHighlightedParagraph(paragraphElement, text, terms) {
  const orderedTerms = terms
    .map((term, index) => ({ ...term, index }))
    .sort((left, right) => right.exactOccurrence.length - left.exactOccurrence.length);
  let cursor = 0;

  while (cursor < text.length) {
    let match = null;
    orderedTerms.forEach((term) => {
      const position = text.indexOf(term.exactOccurrence, cursor);
      if (position < 0) return;
      if (!match || position < match.position || (position === match.position && term.exactOccurrence.length > match.term.exactOccurrence.length)) {
        match = { position, term };
      }
    });

    if (!match) {
      paragraphElement.append(document.createTextNode(text.slice(cursor)));
      break;
    }
    if (match.position > cursor) paragraphElement.append(document.createTextNode(text.slice(cursor, match.position)));

    const highlight = createElement("button", "term-highlight", match.term.exactOccurrence);
    highlight.type = "button";
    highlight.dataset.termIndex = String(match.term.index);
    highlight.setAttribute("aria-expanded", "false");
    highlight.setAttribute(
      "aria-label",
      `${match.term.termZh}, ${match.term.pinyin}: ${match.term.meaningEn}`,
    );
    const tooltip = createElement("span", "term-tooltip");
    tooltip.setAttribute("aria-hidden", "true");
    tooltip.append(
      createElement("strong", "", match.term.pinyin),
      createElement("span", "", match.term.meaningEn),
    );
    highlight.append(tooltip);
    paragraphElement.append(highlight);
    cursor = match.position + match.term.exactOccurrence.length;
  }
}

export function clearAnalysis(article = currentArticle) {
  elements.analysisPanel.hidden = true;
  elements.analysisGist.replaceChildren();
  elements.analysisTerms.replaceChildren();
  elements.analysisStatus.textContent = "";
  elements.analysisError.hidden = true;
  elements.analysisError.textContent = "";

  if (article && currentReaderBody) {
    currentReaderBody.replaceChildren();
    article.paragraphs.forEach((text) => currentReaderBody.append(createElement("p", "", text)));
  }
}

export function setAnalysisBusy(isBusy) {
  elements.analyzeButton.disabled = isBusy;
  elements.learnerLevel.disabled = isBusy;
  elements.analyzeButton.textContent = isBusy ? "Preparing…" : "Prepare language guide";
  if (isBusy) {
    elements.analysisStatus.textContent = "Finding 10 useful terms and checking each one against the article…";
  } else if (elements.analysisStatus.textContent.startsWith("Finding 10")) {
    elements.analysisStatus.textContent = "";
  }
}

export function showAnalysisError(message) {
  elements.analysisError.textContent = message;
  elements.analysisError.hidden = !message;
}

export function renderAnalysis(article, analysis) {
  elements.analysisGist.replaceChildren();
  analysis.gistEn.forEach((sentence) => elements.analysisGist.append(createElement("p", "", sentence)));

  const termFragment = document.createDocumentFragment();
  analysis.terms.forEach((term, index) => {
    const button = createElement("button", "term-card");
    button.type = "button";
    button.dataset.termIndex = String(index);
    button.setAttribute("aria-label", `Find ${term.termZh} in the article`);
    button.append(
      createElement("strong", "term-card__zh", term.termZh),
      createElement("span", "term-card__pinyin", term.pinyin),
      createElement("span", "term-card__meaning", term.meaningEn),
    );
    termFragment.append(button);
  });
  elements.analysisTerms.replaceChildren(termFragment);

  if (currentReaderBody) {
    currentReaderBody.replaceChildren();
    article.paragraphs.forEach((text) => {
      const paragraph = createElement("p");
      appendHighlightedParagraph(paragraph, text, analysis.terms);
      currentReaderBody.append(paragraph);
    });
  }

  elements.analysisPanel.hidden = false;
  elements.analysisStatus.textContent = "Language guide ready. Highlighted terms now appear in the original article.";
}

export function getLearnerLevel() {
  return elements.learnerLevel.value;
}

export function onAnalysisRequested(handler) {
  elements.analyzeButton.addEventListener("click", handler);
}

export function setSentenceHelpBusy(isBusy) {
  elements.explainButton.disabled = isBusy || !selectedSentence;
  elements.explainButton.textContent = isBusy ? "Explaining…" : "Explain selected sentence";
  if (isBusy) {
    elements.sentenceStatus.textContent = "Preparing a grounded translation and explanation…";
  } else if (elements.sentenceStatus.textContent.startsWith("Preparing a grounded")) {
    elements.sentenceStatus.textContent = "";
  }
}

export function showSentenceHelpError(message) {
  elements.sentenceError.textContent = message;
  elements.sentenceError.hidden = !message;
}

export function renderSentenceHelp(explanation) {
  const selected = createElement("blockquote", "sentence-result__source", explanation.sentenceZh);
  const translationLabel = createElement("p", "eyebrow", "Natural translation");
  const translation = createElement("p", "sentence-result__translation", explanation.translationEn);
  const explanationLabel = createElement("p", "eyebrow", "Grammar & context");
  const detail = createElement("p", "", explanation.explanationEn);
  elements.sentenceResult.replaceChildren(selected, translationLabel, translation, explanationLabel, detail);
  elements.sentenceResult.hidden = false;
  elements.sentenceStatus.textContent = "Sentence help ready.";
  elements.sentenceResult.focus();
}

function clearSentenceHelp() {
  elements.sentenceResult.hidden = true;
  elements.sentenceResult.replaceChildren();
  elements.sentenceError.hidden = true;
  elements.sentenceError.textContent = "";
  elements.sentenceStatus.textContent = "";
}

export function onSentenceHelpRequested(handler) {
  elements.explainButton.addEventListener("click", () => handler(selectedSentence));
}

export function clearReader() {
  elements.reader.hidden = true;
  elements.readerContent.replaceChildren();
  elements.readerError.hidden = true;
  elements.listSection.hidden = false;
  elements.languageTools.hidden = true;
  currentReaderBody = null;
  currentArticle = null;
  selectedSentence = "";
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

elements.analysisTerms.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-term-index]");
  if (!button || !currentReaderBody) return;
  const highlight = currentReaderBody.querySelector(`.term-highlight[data-term-index="${button.dataset.termIndex}"]`);
  if (highlight) {
    highlight.focus();
    highlight.scrollIntoView({ block: "center", behavior: "smooth" });
  }
});

elements.readerContent.addEventListener("click", (event) => {
  const highlight = event.target.closest(".term-highlight");
  if (!highlight) return;
  const willOpen = highlight.getAttribute("aria-expanded") !== "true";
  currentReaderBody?.querySelectorAll(".term-highlight[aria-expanded=\"true\"]").forEach((item) => item.setAttribute("aria-expanded", "false"));
  highlight.setAttribute("aria-expanded", String(willOpen));
});

document.addEventListener("selectionchange", () => {
  if (!currentReaderBody) return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
  const range = selection.getRangeAt(0);
  const ancestor = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
    ? range.commonAncestorContainer
    : range.commonAncestorContainer.parentElement;
  if (!ancestor || !currentReaderBody.contains(ancestor)) return;

  selectedSentence = selection.toString().replace(/\s+/g, " ").trim();
  elements.selectionPreview.textContent = selectedSentence || "No sentence selected yet.";
  elements.explainButton.disabled = !selectedSentence;
  clearSentenceHelp();
});
