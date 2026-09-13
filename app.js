import { config } from "./config.js?v=optional-description-1";
import { source } from "./source.js?v=optional-description-1";
import {
  clearResults,
  clearReader,
  clearAnalysis,
  getLearnerLevel,
  getPreviewState,
  hideVocabularyView,
  hideReviewSession,
  markSavedTerms,
  markKnownTerms,
  onArticleSelected,
  onAnalysisRequested,
  onHomeRequested,
  onKnownTermRequested,
  onKnownWordRestoreRequested,
  onReviewExit,
  onReviewRated,
  onReviewReveal,
  onReviewStart,
  onTermSaveRequested,
  onVocabularyBack,
  onVocabularyRemoveRequested,
  onVocabularyRequested,
  onVocabularyKnownRequested,
  onWordHelpRequested,
  onSentenceHelpRequested,
  onLoadRequested,
  onPreviewStateChanged,
  onReaderBack,
  renderArticle,
  renderAnalysis,
  renderKnownWords,
  renderReviewCard,
  renderReviewSummary,
  renderSentenceHelp,
  renderWordHelp,
  renderVocabulary,
  renderList,
  setArticleBusy,
  setAnalysisBusy,
  setBusy,
  setSentenceHelpBusy,
  setKnownTermBusy,
  setReviewBusy,
  setPreviewControlsVisible,
  setStatus,
  setTermSaveBusy,
  setVocabularyBusy,
  setVocabularyCount,
  setVocabularyRemoveBusy,
  setWordHelpBusy,
  showTermSaveResult,
  showVocabularyEmpty,
  showVocabularyError,
  showVocabularyView,
  showArticleError,
  showAnalysisError,
  showEmpty,
  showError,
  showNotice,
  showSentenceHelpError,
  showWordHelpError,
  revealReviewAnswer,
} from "./ui.js?v=optional-description-1";

let currentArticle = null;
let articleRequestVersion = 0;
let analysisRequestVersion = 0;
let sentenceRequestVersion = 0;
let wordRequestVersion = 0;
let reviewRecords = [];
let reviewTotal = 0;

const previewMessages = Object.freeze({
  empty: "No suitable public articles were found. Try again later.",
  error: "We couldn’t prepare today’s reading. Please try again.",
});

function readableError(error, fallback) {
  const message = typeof error?.message === "string" ? error.message.trim() : "";
  return message && !/^[A-Z0-9_]+$/.test(message) ? message : fallback;
}

async function loadReading() {
  const previewState = config.mode === "sample" ? getPreviewState() : "success";
  setBusy(true);
  setStatus("Preparing a small set of native Chinese articles…");
  clearResults();
  showNotice("");

  try {
    if (previewState === "error") throw new Error(previewMessages.error);
    const result = await source.load({
      limit: config.displayedResultLimit,
      interests: config.defaultInterests,
      excludedSourceIds: previewState === "partial" ? [config.activeSourceIds[1]] : [],
    });

    if (previewState === "empty") {
      showEmpty(previewMessages.empty);
      setStatus("No articles are ready right now.");
      return;
    }

    renderList(result.items);
    showNotice(previewState === "partial" ? result.warnings[0] : "");
    setStatus(`Ready: ${result.items.length} recent articles selected for you.`);
  } catch (error) {
    showError(readableError(error, previewMessages.error));
    setStatus("Today’s reading could not be loaded.");
  } finally {
    setBusy(false);
  }
}

async function openArticle(id) {
  const requestVersion = ++articleRequestVersion;
  analysisRequestVersion += 1;
  sentenceRequestVersion += 1;
  currentArticle = null;
  setArticleBusy(true);
  showArticleError("");
  try {
    const article = await source.detail(id);
    if (requestVersion !== articleRequestVersion) return;
    currentArticle = article;
    renderArticle(article);
  } catch (error) {
    showArticleError(readableError(error, "This article could not be prepared. Choose another article or try again."));
  } finally {
    setArticleBusy(false);
  }

  if (currentArticle && config.featureFlags.languageScaffolding) {
    prepareAnalysis();
  }
}

async function prepareAnalysis() {
  if (!currentArticle) return;
  const article = currentArticle;
  const requestVersion = ++analysisRequestVersion;
  clearAnalysis(article);
  showAnalysisError("");
  setAnalysisBusy(true);
  try {
    let knownWords = [];
    try {
      knownWords = await source.listKnown();
    } catch {
      knownWords = [];
    }
    const analysis = await source.analyze(article, getLearnerLevel(), knownWords.map((word) => word.termZh));
    if (requestVersion !== analysisRequestVersion || article !== currentArticle) return;
    renderAnalysis(article, analysis);
    try {
      markSavedTerms(await source.list());
      markKnownTerms(knownWords);
    } catch (error) {
      showTermSaveResult(-1, false, readableError(error, "Saved vocabulary is temporarily unavailable."));
    }
  } catch (error) {
    if (requestVersion !== analysisRequestVersion) return;
    showAnalysisError(readableError(error, "The language guide could not be prepared. The original article is still available below."));
  } finally {
    if (requestVersion === analysisRequestVersion) setAnalysisBusy(false);
  }
}

async function markTermKnown({ term, index }) {
  setKnownTermBusy(index, true);
  try {
    const result = await source.markKnown(term.termZh);
    setVocabularyCount(result.records.length);
    markSavedTerms(result.records);
    markKnownTerms(result.words, `${term.termZh} will be excluded from future language guides.`);
  } catch (error) {
    markKnownTerms([], readableError(error, "This word could not be marked as known."));
  } finally {
    setKnownTermBusy(index, false);
  }
}

function vocabularyRecord(article, term) {
  return {
    id: "",
    termZh: term.termZh,
    pinyin: term.pinyin,
    meaningEn: term.meaningEn,
    contextSentenceZh: term.contextSentenceZh,
    articleId: article.id,
    articleTitleZh: article.titleZh,
    sourceName: article.sourceName,
    canonicalUrl: article.canonicalUrl,
    publishedAt: article.publishedAt,
    savedAt: new Date().toISOString(),
  };
}

async function saveVocabularyTerm({ article, term, index }) {
  setTermSaveBusy(index, true);
  try {
    const result = await source.save(vocabularyRecord(article, term));
    setVocabularyCount(result.records.length);
    showTermSaveResult(
      index,
      true,
      result.added ? `${term.termZh} was saved to your vocabulary.` : `${term.termZh} is already saved.`,
    );
  } catch (error) {
    showTermSaveResult(index, false, readableError(error, "This term could not be saved. Please try again."));
  }
}

async function openVocabulary() {
  showVocabularyView();
  showVocabularyError("");
  setVocabularyBusy(true);
  try {
    const [records, due, known] = await Promise.all([source.list(), source.reviewQueue(), source.listKnown()]);
    setVocabularyCount(records.length);
    reviewRecords = due;
    reviewTotal = due.length;
    renderReviewSummary(due);
    hideReviewSession();
    renderKnownWords(known);
    if (records.length) renderVocabulary(records);
    else showVocabularyEmpty("No saved terms yet. Open an article and save a term from its language guide.");
  } catch (error) {
    showVocabularyError(readableError(error, "Saved vocabulary could not be loaded. Your existing browser data was left unchanged."));
  } finally {
    setVocabularyBusy(false);
  }
}

async function markVocabularyKnown(termZh) {
  try {
    await source.markKnown(termZh);
    await openVocabulary();
  } catch (error) {
    showVocabularyError(readableError(error, "This word could not be marked as known."), false);
  }
}

async function restoreKnownWord(termZh) {
  try {
    await source.unmarkKnown(termZh);
    await openVocabulary();
  } catch (error) {
    showVocabularyError(readableError(error, "This word could not be restored."), false);
  }
}

function startReview() {
  if (!reviewRecords.length) return;
  renderReviewCard(reviewRecords[0], reviewTotal - reviewRecords.length + 1, reviewTotal);
}

async function rateReview(rating) {
  const current = reviewRecords[0];
  if (!current) return;
  setReviewBusy(true);
  try {
    await source.review(current.id, rating);
    reviewRecords.shift();
    if (reviewRecords.length) startReview();
    else {
      hideReviewSession("Review complete. Your next reviews have been scheduled.");
      await openVocabulary();
    }
  } catch (error) {
    showVocabularyError(readableError(error, "That review could not be saved."), false);
  } finally {
    setReviewBusy(false);
  }
}

async function lookupWord({ termZh, contextSentenceZh }) {
  if (!currentArticle) return;
  const article = currentArticle;
  const requestVersion = ++wordRequestVersion;
  setWordHelpBusy(termZh, true);
  try {
    const word = await source.lookupWord({ article, termZh, contextSentenceZh, learnerLevel: getLearnerLevel() });
    if (requestVersion !== wordRequestVersion || article !== currentArticle) return;
    renderWordHelp(word);
  } catch (error) {
    if (requestVersion !== wordRequestVersion) return;
    showWordHelpError(readableError(error, "That word could not be explained. Please try again."));
  }
}

async function removeVocabulary(id) {
  setVocabularyRemoveBusy(id, true);
  try {
    const result = await source.remove(id);
    setVocabularyCount(result.records.length);
    markSavedTerms(result.records);
    if (result.records.length) renderVocabulary(result.records);
    else showVocabularyEmpty("No saved terms yet. Open an article and save a term from its language guide.");
  } catch (error) {
    showVocabularyError(readableError(error, "That saved term could not be removed. Your other terms were not changed."), false);
  } finally {
    setVocabularyRemoveBusy(id, false);
  }
}

async function refreshVocabularyCount() {
  try {
    setVocabularyCount((await source.list()).length);
  } catch {
    setVocabularyCount(0);
  }
}

async function explainSentence(sentenceZh) {
  if (!currentArticle) return;
  showSentenceHelpError("");
  if (!sentenceZh) {
    showSentenceHelpError("Select a sentence from the article first, then try again.");
    return;
  }
  if (sentenceZh.length > config.maximumSentenceCharacters) {
    showSentenceHelpError("That selection is too long. Select one sentence of up to 500 characters.");
    return;
  }

  const article = currentArticle;
  const requestVersion = ++sentenceRequestVersion;
  setSentenceHelpBusy(true);
  try {
    const explanation = await source.explain({
      article,
      sentenceZh,
      learnerLevel: getLearnerLevel(),
    });
    if (requestVersion !== sentenceRequestVersion || article !== currentArticle) return;
    renderSentenceHelp(explanation);
  } catch (error) {
    if (requestVersion !== sentenceRequestVersion) return;
    showSentenceHelpError(readableError(error, "That sentence could not be explained. Select article text and try again."));
  } finally {
    if (requestVersion === sentenceRequestVersion) setSentenceHelpBusy(false);
  }
}

function closeReader() {
  articleRequestVersion += 1;
  analysisRequestVersion += 1;
  sentenceRequestVersion += 1;
  wordRequestVersion += 1;
  currentArticle = null;
  clearReader();
  setAnalysisBusy(false);
  setSentenceHelpBusy(false);
}

function goHome() {
  closeReader();
  hideVocabularyView();
}

onLoadRequested(loadReading);
onPreviewStateChanged(loadReading);
onArticleSelected(openArticle);
onAnalysisRequested(prepareAnalysis);
onTermSaveRequested(saveVocabularyTerm);
onKnownTermRequested(markTermKnown);
onSentenceHelpRequested(explainSentence);
onWordHelpRequested(lookupWord);
onReaderBack(closeReader);
onHomeRequested(goHome);
onVocabularyRequested(openVocabulary);
onVocabularyBack(hideVocabularyView);
onVocabularyRemoveRequested(removeVocabulary);
onVocabularyKnownRequested(markVocabularyKnown);
onKnownWordRestoreRequested(restoreKnownWord);
onReviewStart(startReview);
onReviewReveal(revealReviewAnswer);
onReviewRated(rateReview);
onReviewExit(() => hideReviewSession());
setPreviewControlsVisible(config.featureFlags.showPreviewStates);
refreshVocabularyCount();
loadReading();
