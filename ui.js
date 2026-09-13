import { config } from "./config.js?v=optional-description-1";

const elements = {
  body: document.body,
  loadButton: document.querySelector("#load-reading"),
  stateSelect: document.querySelector("#preview-state"),
  stateControl: document.querySelector("#preview-state-control"),
  status: document.querySelector("#status-message"),
  notice: document.querySelector("#notice"),
  results: document.querySelector("#article-list"),
  resultCount: document.querySelector("#result-count"),
  homeIntro: document.querySelector("#home-intro"),
  homeControls: document.querySelector("#reading-controls"),
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
  analysisGistPanel: document.querySelector(".analysis-gist"),
  analysisGist: document.querySelector("#analysis-gist"),
  analysisTerms: document.querySelector("#analysis-terms"),
  analysisTermCount: document.querySelector("#analysis-term-count"),
  wordHelp: document.querySelector("#word-help"),
  wordHelpTerm: document.querySelector("#word-help-term"),
  wordHelpPinyin: document.querySelector("#word-help-pinyin"),
  wordHelpMeaning: document.querySelector("#word-help-meaning"),
  wordHelpStatus: document.querySelector("#word-help-status"),
  wordHelpClose: document.querySelector("#word-help-close"),
  sentenceTools: document.querySelector("#sentence-tools"),
  explainButton: document.querySelector("#explain-sentence"),
  selectionPreview: document.querySelector("#selection-preview"),
  sentenceStatus: document.querySelector("#sentence-status"),
  sentenceError: document.querySelector("#sentence-error"),
  sentenceResult: document.querySelector("#sentence-result"),
  vocabularyOpen: document.querySelector("#open-vocabulary"),
  mobileHome: document.querySelector("#mobile-home"),
  mobileVocabulary: document.querySelector("#mobile-vocabulary"),
  vocabularyCount: document.querySelector("#vocabulary-count"),
  vocabularySaveStatus: document.querySelector("#vocabulary-save-status"),
  vocabulary: document.querySelector("#vocabulary"),
  vocabularyBack: document.querySelector("#vocabulary-back"),
  vocabularyStatus: document.querySelector("#vocabulary-status"),
  vocabularyNotice: document.querySelector("#vocabulary-notice"),
  vocabularyList: document.querySelector("#vocabulary-list"),
  reviewSummary: document.querySelector("#review-summary"),
  reviewDueCount: document.querySelector("#review-due-count"),
  reviewStart: document.querySelector("#review-start"),
  reviewSession: document.querySelector("#review-session"),
  reviewProgress: document.querySelector("#review-progress"),
  reviewTerm: document.querySelector("#review-term"),
  reviewContext: document.querySelector("#review-context"),
  reviewReveal: document.querySelector("#review-reveal"),
  reviewAnswer: document.querySelector("#review-answer"),
  reviewPinyin: document.querySelector("#review-pinyin"),
  reviewMeaning: document.querySelector("#review-meaning"),
  reviewExit: document.querySelector("#review-exit"),
  knownWords: document.querySelector("#known-words"),
  knownWordsList: document.querySelector("#known-words-list"),
};

let lastArticleTrigger = null;
let currentReaderBody = null;
let currentArticle = null;
let currentAnalysis = null;
let selectedSentence = "";
let vocabularyReturnView = "list";

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createArticleImage(imageUrl, titleZh, className) {
  if (!imageUrl) return null;
  const image = createElement("img", className);
  image.src = imageUrl;
  image.alt = titleZh ? `配图：${titleZh}` : "文章配图";
  image.loading = "lazy";
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";
  image.addEventListener("error", () => { image.hidden = true; }, { once: true });
  return image;
}

function appendTappableText(parent, text, contextSentenceZh) {
  const segments = typeof Intl.Segmenter === "function"
    ? [...new Intl.Segmenter("zh", { granularity: "word" }).segment(text)]
    : [...text].map((segment) => ({ segment, isWordLike: /[\p{Script=Han}]/u.test(segment) }));
  segments.forEach(({ segment, isWordLike }) => {
    if (!isWordLike || !/[\p{Script=Han}]/u.test(segment)) {
      parent.append(document.createTextNode(segment));
      return;
    }
    const token = createElement("button", "word-token", segment);
    token.type = "button";
    token.dataset.word = segment;
    token.dataset.context = contextSentenceZh;
    token.setAttribute("aria-label", `Explain ${segment}`);
    parent.append(token);
  });
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
    const image = createArticleImage(item.imageUrl, item.titleZh, "article-card__image");
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
    const description = item.description
      ? createElement("p", "article-card__description", item.description)
      : null;

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

    article.append(...[image, topLine, title, topic, description, reasons, footer].filter(Boolean));
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
  elements.homeIntro.hidden = true;
  elements.homeControls.hidden = true;
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

  const image = createArticleImage(article.imageUrl, article.titleZh, "reader__image");

  const body = createElement("div", "reader__body");
  article.paragraphs.forEach((text) => {
    const paragraph = createElement("p");
    appendTappableText(paragraph, text, text);
    body.append(paragraph);
  });

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

  elements.readerContent.replaceChildren(...[
    header,
    image,
    elements.languageTools,
    body,
    publication,
    elements.analysisGistPanel,
  ].filter(Boolean));
  currentReaderBody = body;
  currentArticle = article;
  currentAnalysis = null;
  selectedSentence = "";
  elements.selectionPreview.textContent = "No sentence selected yet.";
  elements.explainButton.disabled = true;
  elements.languageTools.hidden = false;
  clearAnalysis(article);
  clearSentenceHelp();
  clearWordHelp();
  elements.reader.focus();
}

function appendHighlightedParagraph(paragraphElement, text, terms) {
  const orderedTerms = terms.map((term, index) => ({ ...term, index }));
  let cursor = 0;

  while (cursor < text.length) {
    let match = null;
    orderedTerms.forEach((term) => {
      const position = text.indexOf(term.exactOccurrence, cursor);
      if (position < 0) return;
      if (!match || position < match.position) {
        match = { position, term };
      }
    });

    if (!match) {
      appendTappableText(paragraphElement, text.slice(cursor), text);
      break;
    }
    if (match.position > cursor) appendTappableText(paragraphElement, text.slice(cursor, match.position), text);

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
  currentAnalysis = null;
  elements.analysisPanel.hidden = true;
  elements.analysisGistPanel.hidden = true;
  elements.analysisGist.replaceChildren();
  elements.analysisTerms.replaceChildren();
  elements.analysisStatus.textContent = "";
  elements.analysisError.hidden = true;
  elements.analysisError.textContent = "";

  if (article && currentReaderBody) {
    currentReaderBody.replaceChildren();
    article.paragraphs.forEach((text) => {
      const paragraph = createElement("p");
      appendTappableText(paragraph, text, text);
      currentReaderBody.append(paragraph);
    });
  }
}

export function setAnalysisBusy(isBusy) {
  const termCount = config.analysisTermCounts[elements.learnerLevel.value];
  elements.analyzeButton.disabled = isBusy;
  elements.learnerLevel.disabled = isBusy;
  elements.analyzeButton.textContent = isBusy ? "Preparing…" : "Prepare language guide";
  if (isBusy) {
    elements.analysisStatus.textContent = `Finding ${termCount} useful terms and checking each one against the article…`;
  } else if (elements.analysisStatus.textContent.startsWith("Finding ")) {
    elements.analysisStatus.textContent = "";
  }
}

export function showAnalysisError(message) {
  elements.analysisError.textContent = message;
  elements.analysisError.hidden = !message;
}

export function renderAnalysis(article, analysis) {
  currentAnalysis = analysis;
  elements.analysisGist.replaceChildren();
  analysis.gistEn.forEach((sentence) => elements.analysisGist.append(createElement("p", "", sentence)));
  elements.analysisTermCount.textContent = `${analysis.terms.length} terms in context`;

  const termFragment = document.createDocumentFragment();
  analysis.terms.forEach((term, index) => {
    const card = createElement("div", "term-card");
    const jumpButton = createElement("button", "term-card__jump");
    jumpButton.type = "button";
    jumpButton.dataset.termIndex = String(index);
    jumpButton.setAttribute("aria-label", `Find ${term.termZh} in the article`);
    jumpButton.append(
      createElement("strong", "term-card__zh", term.termZh),
      createElement("span", "term-card__pinyin", term.pinyin),
      createElement("span", "term-card__meaning", term.meaningEn),
    );
    const saveButton = createElement("button", "term-card__save", "Save term");
    saveButton.type = "button";
    saveButton.dataset.saveTermIndex = String(index);
    saveButton.setAttribute("aria-label", `Save ${term.termZh} to vocabulary`);
    const knownButton = createElement("button", "term-card__known", "I know this");
    knownButton.type = "button";
    knownButton.dataset.knownTermIndex = String(index);
    knownButton.setAttribute("aria-label", `Mark ${term.termZh} as known`);
    const actions = createElement("div", "term-card__actions");
    actions.append(saveButton, knownButton);
    card.append(jumpButton, actions);
    termFragment.append(card);
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
  elements.analysisGistPanel.hidden = false;
  elements.vocabularySaveStatus.textContent = "";
  elements.analysisStatus.textContent = "Language guide ready. Highlighted terms now appear in the original article.";
}

export function onTermSaveRequested(handler) {
  elements.analysisTerms.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-save-term-index]");
    if (!button || !currentArticle || !currentAnalysis) return;
    const index = Number(button.dataset.saveTermIndex);
    const term = currentAnalysis.terms[index];
    if (term) handler({ article: currentArticle, term, index });
  });
}

export function onKnownTermRequested(handler) {
  elements.analysisTerms.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-known-term-index]");
    if (!button || !currentAnalysis) return;
    const index = Number(button.dataset.knownTermIndex);
    const term = currentAnalysis.terms[index];
    if (term) handler({ term, index });
  });
}

export function setKnownTermBusy(index, isBusy) {
  const button = elements.analysisTerms.querySelector(`button[data-known-term-index="${index}"]`);
  if (!button) return;
  const isKnown = button.classList.contains("term-card__known--known");
  button.disabled = isBusy || isKnown;
  button.textContent = isBusy ? "Updating…" : isKnown ? "Known ✓" : "I know this";
}

export function markKnownTerms(words, message = "") {
  if (!currentAnalysis) return;
  const known = new Set(words.map((word) => word.termZh.normalize("NFKC").trim().toLocaleLowerCase()));
  currentAnalysis.terms.forEach((term, index) => {
    const button = elements.analysisTerms.querySelector(`button[data-known-term-index="${index}"]`);
    if (!button) return;
    const isKnown = known.has(term.termZh.normalize("NFKC").trim().toLocaleLowerCase());
    button.disabled = isKnown;
    button.classList.toggle("term-card__known--known", isKnown);
    button.textContent = isKnown ? "Known ✓" : "I know this";
  });
  if (message) elements.vocabularySaveStatus.textContent = message;
}

export function setTermSaveBusy(index, isBusy) {
  const button = elements.analysisTerms.querySelector(`button[data-save-term-index="${index}"]`);
  if (!button) return;
  button.disabled = isBusy;
  button.textContent = isBusy ? "Saving…" : "Save term";
}

export function showTermSaveResult(index, isSaved, message) {
  const button = elements.analysisTerms.querySelector(`button[data-save-term-index="${index}"]`);
  if (button) {
    const term = currentAnalysis?.terms[index];
    button.disabled = isSaved;
    button.classList.toggle("term-card__save--saved", isSaved);
    button.textContent = isSaved ? "Saved ✓" : "Save term";
    if (term) button.setAttribute("aria-label", isSaved ? `${term.termZh} is saved` : `Save ${term.termZh} to vocabulary`);
  }
  elements.vocabularySaveStatus.textContent = message;
}

export function markSavedTerms(records) {
  if (!currentArticle || !currentAnalysis) return;
  currentAnalysis.terms.forEach((term, index) => {
    const isSaved = records.some((record) => (
      record.articleId === currentArticle.id
      && record.termZh === term.termZh
      && record.contextSentenceZh === term.contextSentenceZh
    ));
    showTermSaveResult(index, isSaved, "");
  });
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

export function onWordHelpRequested(handler) {
  elements.readerContent.addEventListener("click", (event) => {
    const token = event.target.closest("button[data-word]");
    if (!token || !currentArticle) return;
    handler({ termZh: token.dataset.word, contextSentenceZh: token.dataset.context });
  });
}

export function setWordHelpBusy(termZh, isBusy) {
  elements.wordHelp.hidden = false;
  elements.wordHelpTerm.textContent = termZh;
  elements.wordHelpPinyin.textContent = "";
  elements.wordHelpMeaning.textContent = "";
  elements.wordHelpStatus.textContent = isBusy ? "Finding the meaning in this sentence…" : "";
}

export function renderWordHelp(word) {
  elements.wordHelp.hidden = false;
  elements.wordHelpTerm.textContent = word.termZh;
  elements.wordHelpPinyin.textContent = word.pinyin;
  elements.wordHelpMeaning.textContent = word.meaningEn;
  elements.wordHelpStatus.textContent = "";
  elements.wordHelp.focus?.();
}

export function showWordHelpError(message) {
  elements.wordHelp.hidden = false;
  elements.wordHelpMeaning.textContent = message;
  elements.wordHelpStatus.textContent = "";
}

export function clearWordHelp() {
  elements.wordHelp.hidden = true;
  elements.wordHelpTerm.textContent = "";
  elements.wordHelpPinyin.textContent = "";
  elements.wordHelpMeaning.textContent = "";
  elements.wordHelpStatus.textContent = "";
}

elements.wordHelpClose.addEventListener("click", clearWordHelp);

export function clearReader() {
  elements.reader.hidden = true;
  elements.readerContent.replaceChildren();
  elements.readerError.hidden = true;
  elements.listSection.hidden = false;
  elements.homeIntro.hidden = false;
  elements.homeControls.hidden = false;
  elements.languageTools.hidden = true;
  currentReaderBody = null;
  currentArticle = null;
  currentAnalysis = null;
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

export function onVocabularyRequested(handler) {
  elements.vocabularyOpen.addEventListener("click", handler);
  elements.mobileVocabulary.addEventListener("click", handler);
}

export function onHomeRequested(handler) {
  elements.mobileHome.addEventListener("click", handler);
}

export function onVocabularyBack(handler) {
  elements.vocabularyBack.addEventListener("click", handler);
}

export function onVocabularyRemoveRequested(handler) {
  elements.vocabularyList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-vocabulary-id]");
    if (button) handler(button.dataset.vocabularyId);
  });
}

export function onVocabularyKnownRequested(handler) {
  elements.vocabularyList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-vocabulary-known]");
    if (button) handler(button.dataset.vocabularyKnown);
  });
}

export function onKnownWordRestoreRequested(handler) {
  elements.knownWordsList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-restore-known]");
    if (button) handler(button.dataset.restoreKnown);
  });
}

export function onReviewStart(handler) {
  elements.reviewStart.addEventListener("click", handler);
}

export function onReviewExit(handler) {
  elements.reviewExit.addEventListener("click", handler);
}

export function onReviewReveal(handler) {
  elements.reviewReveal.addEventListener("click", handler);
}

export function onReviewRated(handler) {
  elements.reviewAnswer.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-review-rating]");
    if (button) handler(button.dataset.reviewRating);
  });
}

export function showVocabularyView() {
  vocabularyReturnView = elements.reader.hidden ? "list" : "reader";
  elements.listSection.hidden = true;
  elements.reader.hidden = true;
  elements.homeIntro.hidden = true;
  elements.homeControls.hidden = true;
  elements.vocabulary.hidden = false;
  elements.vocabularyOpen.setAttribute("aria-expanded", "true");
  elements.mobileVocabulary.setAttribute("aria-current", "page");
  elements.mobileHome.removeAttribute("aria-current");
  elements.vocabulary.focus();
}

export function hideVocabularyView() {
  elements.vocabulary.hidden = true;
  elements.vocabularyOpen.setAttribute("aria-expanded", "false");
  elements.mobileVocabulary.removeAttribute("aria-current");
  elements.mobileHome.setAttribute("aria-current", "page");
  if (vocabularyReturnView === "reader" && currentArticle) {
    elements.reader.hidden = false;
    elements.homeIntro.hidden = true;
    elements.homeControls.hidden = true;
  } else {
    elements.listSection.hidden = false;
    elements.homeIntro.hidden = false;
    elements.homeControls.hidden = false;
  }
  elements.vocabularyOpen.focus();
}

export function setVocabularyBusy(isBusy) {
  elements.vocabulary.setAttribute("aria-busy", String(isBusy));
  elements.vocabularyOpen.disabled = isBusy;
  elements.mobileVocabulary.disabled = isBusy;
  elements.vocabularyBack.disabled = isBusy;
  if (isBusy) {
    elements.vocabularyStatus.textContent = "Loading saved vocabulary…";
  } else if (elements.vocabularyStatus.textContent === "Loading saved vocabulary…") {
    elements.vocabularyStatus.textContent = "";
  }
}

export function setVocabularyRemoveBusy(id, isBusy) {
  const button = [...elements.vocabularyList.querySelectorAll("button[data-vocabulary-id]")]
    .find((item) => item.dataset.vocabularyId === id);
  if (!button) return;
  button.disabled = isBusy;
  button.textContent = isBusy ? "Removing…" : "Remove";
}

export function renderReviewSummary(records) {
  const count = records.length;
  elements.reviewDueCount.textContent = String(count);
  elements.reviewStart.disabled = count === 0;
  elements.reviewStart.textContent = count ? `Review ${count}` : "Nothing due";
}

export function renderReviewCard(record, position, total) {
  elements.reviewSummary.hidden = true;
  elements.vocabularyList.hidden = true;
  elements.knownWords.hidden = true;
  elements.vocabularyStatus.hidden = true;
  elements.reviewSession.hidden = false;
  elements.reviewProgress.textContent = `Review ${position} of ${total}`;
  elements.reviewTerm.textContent = record.termZh;
  elements.reviewContext.textContent = record.contextSentenceZh;
  elements.reviewPinyin.textContent = record.pinyin;
  elements.reviewMeaning.textContent = record.meaningEn;
  elements.reviewAnswer.hidden = true;
  elements.reviewReveal.hidden = false;
  elements.reviewSession.focus();
}

export function revealReviewAnswer() {
  elements.reviewAnswer.hidden = false;
  elements.reviewReveal.hidden = true;
  elements.reviewAnswer.querySelector("button")?.focus();
}

export function setReviewBusy(isBusy) {
  elements.reviewAnswer.querySelectorAll("button").forEach((button) => { button.disabled = isBusy; });
}

export function hideReviewSession(message = "") {
  elements.reviewSession.hidden = true;
  elements.reviewSummary.hidden = false;
  elements.vocabularyList.hidden = false;
  elements.knownWords.hidden = false;
  elements.vocabularyStatus.hidden = false;
  if (message) elements.vocabularyStatus.textContent = message;
}

export function setVocabularyCount(count) {
  elements.vocabularyCount.textContent = String(count);
  elements.vocabularyCount.setAttribute("aria-label", `${count} saved ${count === 1 ? "term" : "terms"}`);
}

export function showVocabularyError(message, clearList = true) {
  elements.vocabularyNotice.className = "notice notice--error";
  elements.vocabularyNotice.textContent = message;
  elements.vocabularyNotice.hidden = !message;
  if (clearList) elements.vocabularyList.replaceChildren();
}

export function showVocabularyEmpty(message) {
  elements.vocabularyNotice.className = "notice notice--empty";
  elements.vocabularyNotice.textContent = message;
  elements.vocabularyNotice.hidden = false;
  elements.vocabularyList.replaceChildren();
}

export function renderVocabulary(records) {
  elements.vocabularyNotice.hidden = true;
  elements.vocabularyNotice.textContent = "";
  const fragment = document.createDocumentFragment();
  records.forEach((record) => {
    const card = createElement("article", "vocabulary-card");
    const heading = createElement("div", "vocabulary-card__heading");
    const term = createElement("h3", "vocabulary-card__term", record.termZh || "Term unavailable");
    const pinyin = createElement("p", "vocabulary-card__pinyin", record.pinyin || "Pinyin unavailable");
    heading.append(term, pinyin);
    const meaning = createElement("p", "vocabulary-card__meaning", record.meaningEn || "Meaning unavailable");
    const context = createElement("blockquote", "vocabulary-card__context", record.contextSentenceZh || "Context unavailable");
    const articleTitle = createElement("p", "vocabulary-card__article", record.articleTitleZh || "Article title unavailable");
    const metadata = createElement(
      "p",
      "vocabulary-card__meta",
      `${record.sourceName || "Source unavailable"} · ${formatPublicationDate(record.publishedAt)} · Saved ${formatPublicationDate(record.savedAt)}`,
    );
    const actions = createElement("div", "vocabulary-card__actions");
    const original = createElement("a", "vocabulary-card__link", "Open original article ↗");
    original.href = record.canonicalUrl;
    original.target = "_blank";
    original.rel = "noopener noreferrer";
    const remove = createElement("button", "text-button vocabulary-card__remove", "Remove");
    remove.type = "button";
    remove.dataset.vocabularyId = record.id;
    remove.setAttribute("aria-label", `Remove ${record.termZh || "this term"} from saved vocabulary`);
    const known = createElement("button", "text-button vocabulary-card__known", "I know this");
    known.type = "button";
    known.dataset.vocabularyKnown = record.termZh;
    known.setAttribute("aria-label", `Mark ${record.termZh || "this term"} as known`);
    actions.append(original, known, remove);
    card.append(heading, meaning, context, articleTitle, metadata, actions);
    fragment.append(card);
  });
  elements.vocabularyList.replaceChildren(fragment);
  elements.vocabularyStatus.textContent = `${records.length} saved ${records.length === 1 ? "term" : "terms"}.`;
}

export function renderKnownWords(words) {
  const fragment = document.createDocumentFragment();
  words.forEach((word) => {
    const row = createElement("div", "known-word");
    row.append(createElement("span", "", word.termZh));
    const restore = createElement("button", "text-button", "Restore");
    restore.type = "button";
    restore.dataset.restoreKnown = word.termZh;
    restore.setAttribute("aria-label", `Allow ${word.termZh} in future language guides`);
    row.append(restore);
    fragment.append(row);
  });
  elements.knownWordsList.replaceChildren(fragment);
  elements.knownWords.hidden = words.length === 0;
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
