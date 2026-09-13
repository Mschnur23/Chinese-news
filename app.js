import { config } from "./config.js";
import { source } from "./source.js";
import {
  clearResults,
  clearReader,
  clearAnalysis,
  getLearnerLevel,
  getPreviewState,
  onArticleSelected,
  onAnalysisRequested,
  onSentenceHelpRequested,
  onLoadRequested,
  onPreviewStateChanged,
  onReaderBack,
  renderArticle,
  renderAnalysis,
  renderSentenceHelp,
  renderList,
  setArticleBusy,
  setAnalysisBusy,
  setBusy,
  setSentenceHelpBusy,
  setPreviewControlsVisible,
  setStatus,
  showArticleError,
  showAnalysisError,
  showEmpty,
  showError,
  showNotice,
  showSentenceHelpError,
} from "./ui.js";

let currentArticle = null;
let articleRequestVersion = 0;
let analysisRequestVersion = 0;
let sentenceRequestVersion = 0;

const previewMessages = Object.freeze({
  empty: "No suitable public articles were found. Try again later.",
  error: "We couldn’t prepare today’s reading. Please try again.",
});

async function loadReading() {
  const previewState = config.mode === "sample" ? getPreviewState() : "success";
  setBusy(true);
  setStatus("Preparing a small set of native Chinese articles…");
  clearResults();
  showNotice("");

  try {
    if (previewState === "error") throw new Error("PREVIEW_ERROR");
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
    showError(error.message || previewMessages.error);
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
    showArticleError(error.message || "This article could not be prepared. Choose another article or try again.");
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
    const analysis = await source.analyze(article, getLearnerLevel());
    if (requestVersion !== analysisRequestVersion || article !== currentArticle) return;
    renderAnalysis(article, analysis);
  } catch (error) {
    if (requestVersion !== analysisRequestVersion) return;
    showAnalysisError(error.message || "The language guide could not be prepared. The original article is still available below.");
  } finally {
    if (requestVersion === analysisRequestVersion) setAnalysisBusy(false);
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
    showSentenceHelpError(error.message || "That sentence could not be explained. Select article text and try again.");
  } finally {
    if (requestVersion === sentenceRequestVersion) setSentenceHelpBusy(false);
  }
}

function closeReader() {
  articleRequestVersion += 1;
  analysisRequestVersion += 1;
  sentenceRequestVersion += 1;
  currentArticle = null;
  clearReader();
  setAnalysisBusy(false);
  setSentenceHelpBusy(false);
}

onLoadRequested(loadReading);
onPreviewStateChanged(loadReading);
onArticleSelected(openArticle);
onAnalysisRequested(prepareAnalysis);
onSentenceHelpRequested(explainSentence);
onReaderBack(closeReader);
setPreviewControlsVisible(config.featureFlags.showPreviewStates);
loadReading();
