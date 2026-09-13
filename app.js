import { config } from "./config.js";
import { source } from "./source.js";
import {
  clearResults,
  clearReader,
  getPreviewState,
  onArticleSelected,
  onLoadRequested,
  onPreviewStateChanged,
  onReaderBack,
  renderArticle,
  renderList,
  setArticleBusy,
  setBusy,
  setPreviewControlsVisible,
  setStatus,
  showArticleError,
  showEmpty,
  showError,
  showNotice,
} from "./ui.js";

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
  setArticleBusy(true);
  showArticleError("");
  try {
    const article = await source.detail(id);
    renderArticle(article);
  } catch (error) {
    showArticleError(error.message || "This article could not be prepared. Choose another article or try again.");
  } finally {
    setArticleBusy(false);
  }
}

onLoadRequested(loadReading);
onPreviewStateChanged(loadReading);
onArticleSelected(openArticle);
onReaderBack(clearReader);
setPreviewControlsVisible(config.featureFlags.showPreviewStates);
loadReading();
