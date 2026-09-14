import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const failures = [];
let passed = 0;

async function text(path) {
  return readFile(join(root, path), "utf8");
}

function check(condition, message) {
  if (condition) {
    passed += 1;
  } else {
    failures.push(message);
  }
}

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if ([".git", "node_modules", ".vercel"].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(path));
    else files.push(path);
  }
  return files;
}

const requiredFiles = [
  "index.html",
  "style.css",
  "app.js",
  "ui.js",
  "source.js",
  "api/word.js",
  "api/import.js",
  "api/related.js",
  "api/_shared/related.js",
  "api/_shared/import.js",
  "api/_shared/import-adapters/firecrawl.js",
  "config.js",
  "data/sample.json",
  "CONTRACTS.md",
  "CHECKS.md",
  "README.md",
  "Phase4_CustomArticleImport.md",
  "Phase5_RelatedReadingAndSavedArticles.md",
  ".env.example",
  ".gitignore",
];

const availableFiles = new Set((await filesBelow(root)).map((path) => relative(root, path)));
requiredFiles.forEach((path) => check(availableFiles.has(path), `Missing required file: ${path}`));

const gitignore = await text(".gitignore");
[".env", ".env.local", "node_modules/", ".DS_Store"].forEach((entry) => {
  check(gitignore.split(/\r?\n/).includes(entry), `.gitignore must contain ${entry}`);
});

const app = await text("app.js");
check(!/\b(?:document|localStorage)\b|\bfetch\s*\(|\.(?:innerHTML|textContent|classList)\b/.test(app), "app.js bypasses the ui.js or source.js boundary");

const browserModules = ["app.js", "config.js", "source.js", "ui.js"];
for (const path of browserModules.filter((item) => item !== "ui.js")) {
  const contents = await text(path);
  check(!/\bdocument\b|\bquerySelector\b|\bcreateElement\b|\.(?:innerHTML|textContent|classList)\b/.test(contents), `${path} accesses the DOM outside ui.js`);
}
for (const path of browserModules.filter((item) => item !== "source.js")) {
  const contents = await text(path);
  check(!/\bfetch\s*\(|\blocalStorage\b/.test(contents), `${path} accesses browser data outside source.js`);
}

const ui = await text("ui.js");
["setBusy", "setStatus", "showError", "showEmpty", "renderList", "clearResults"].forEach((name) => {
  check(new RegExp(`export\\s+function\\s+${name}\\s*\\(`).test(ui), `ui.js must export ${name}()`);
});

const source = await text("source.js");
["related", "importArticle", "load", "detail", "analyze", "explain", "lookupWord", "save", "list", "remove", "saveArticle", "listArticles", "removeArticle", "reviewQueue", "librarySnapshot", "review", "listKnown", "markKnown", "unmarkKnown"].forEach((name) => {
  check(new RegExp(`async\\s+${name}\\s*\\(`).test(source), `source must expose async ${name}()`);
});

const config = await text("config.js");
const serverConfig = await text("api/_shared/server-config.js");
check(/Object\.freeze\s*\(\s*\{/.test(config), "config.js must export a frozen configuration object");
check(/Object\.freeze\s*\(\s*\{/.test(serverConfig), "server-config.js must export a frozen configuration object");

const externalUrlPattern = /["'`]https?:\/\//;
const javascriptFiles = [...availableFiles].filter((path) => path.endsWith(".js"));
for (const path of javascriptFiles.filter((item) => !["config.js", "api/_shared/server-config.js"].includes(item))) {
  check(!externalUrlPattern.test(await text(path)), `${path} contains an external URL outside a configuration module`);
}

const contracts = await text("CONTRACTS.md");
check(contracts.includes("## DO NOT CHANGE WITHOUT ASKING"), "CONTRACTS.md is missing its protected-contract heading");
const checklist = await text("CHECKS.md");
const checklistNumbers = [...checklist.matchAll(/^(\d+)\./gm)].map((match) => Number(match[1]));
check(
  checklistNumbers.every((number, index) => number === index + 1),
  "CHECKS.md numbering must be consecutive and contain no duplicates",
);
const html = await text("index.html");
const requiredIds = [
  "load-reading",
  "preview-state",
  "status-message",
  "notice",
  "article-list",
  "result-count",
];
requiredIds.forEach((id) => check(new RegExp(`id=["']${id}["']`).test(html), `index.html is missing protected DOM id: ${id}`));
[
  "open-vocabulary",
  "vocabulary-count",
  "vocabulary-save-status",
  "vocabulary",
  "vocabulary-back",
  "vocabulary-status",
  "vocabulary-notice",
  "vocabulary-list",
  "mobile-home",
  "mobile-vocabulary",
  "home-intro",
  "reading-controls",
  "analysis-term-count",
  "word-help",
  "word-help-term",
  "word-help-pinyin",
  "word-help-meaning",
  "review-summary",
  "review-due-count",
  "review-start",
  "review-session",
  "review-reveal",
  "review-answer",
  "known-words",
  "known-words-list",
].forEach((id) => check(new RegExp(`id=["']${id}["']`).test(html), `index.html is missing Phase 3 DOM id: ${id}`));
[
  "open-import",
  "import-view",
  "import-back",
  "import-tab-url",
  "import-tab-text",
  "import-form",
  "import-url-panel",
  "import-url",
  "import-text-panel",
  "import-title-input",
  "import-source-input",
  "import-original-url",
  "import-text",
  "import-level",
  "import-submit",
  "import-status",
  "import-error",
  "import-preview",
  "import-preview-content",
  "open-imported-article",
].forEach((id) => check(new RegExp(`id=["']${id}["']`).test(html), `index.html is missing Phase 4 DOM id: ${id}`));
[
  "reader-save", "save-article", "article-save-status", "related-reading", "related-reading-title",
  "related-reading-status", "related-reading-error", "related-reading-list", "related-reading-retry",
  "saved-articles", "saved-articles-title", "saved-articles-status", "saved-articles-notice", "saved-articles-list",
].forEach((id) => check(new RegExp(`id=["']${id}["']`).test(html), `index.html is missing Phase 5 DOM id: ${id}`));

const sample = JSON.parse(await text("data/sample.json"));
check(Array.isArray(sample.relatedReading) && sample.relatedReading.length === 3, "Sample data must contain exactly three related English links");
check(sample.relatedReading.every((item) => item.url.startsWith("https://")), "Sample related-reading links must use HTTPS");
const relatedHelpers = await import(new URL("../api/_shared/related.js", import.meta.url));
const validatedRelated = relatedHelpers.validateRelatedReading(
  { items: sample.relatedReading },
  sample.relatedReading.map((item) => item.url),
);
check(validatedRelated.items.length === 3, "Related-reading validation must accept three cited, allowlisted links");
let uncitedRelatedRejected = false;
try {
  relatedHelpers.validateRelatedReading({ items: sample.relatedReading }, []);
} catch {
  uncitedRelatedRejected = true;
}
check(uncitedRelatedRejected, "Related-reading validation must reject uncited model links");
check(!/bodyText\s*:|paragraphs\s*:/.test(source.match(/function normalizeSavedArticle[\s\S]*?function readSavedArticlesStore/)?.[0] || ""), "Saved article records must not contain article bodies or paragraphs");
check(Array.isArray(sample.articleSummaries) && sample.articleSummaries.length >= 3 && sample.articleSummaries.length <= 5, "Sample data must contain 3–5 article summaries");
const summaryKeys = ["id", "titleZh", "sourceId", "sourceName", "canonicalUrl", "imageUrl", "publishedAt", "topic", "description", "whyItMatters", "whyItFits", "difficulty", "readingMinutes"];
for (const [index, item] of (sample.articleSummaries || []).entries()) {
  summaryKeys.forEach((key) => check(Object.hasOwn(item, key), `Sample article summary ${index + 1} omits ${key}`));
}
check(sample.articleSummaries.every((item) => !item.imageUrl || item.imageUrl.startsWith("https://")), "Sample article images must use HTTPS or an empty string");
check(sample.articleDetails.every((item) => Object.hasOwn(item, "imageUrl") && (!item.imageUrl || item.imageUrl.startsWith("https://"))), "Sample article details must include a safe image URL field");
const htmlHelpers = await import(new URL("../api/_shared/html.js", import.meta.url));
check(htmlHelpers.extractImageUrl('<img data-src="https://images.example.test/lead.jpg">', "https://example.test/") === "https://images.example.test/lead.jpg", "Lead-image extraction must support publisher lazy-loading attributes");
check(htmlHelpers.extractImageUrl('<meta property="og:image" content="https://images.example.test/social.jpg">', "https://example.test/") === "https://images.example.test/social.jpg", "Lead-image extraction must support Open Graph metadata");
check(htmlHelpers.extractImageUrl('<img srcset="https://images.example.test/lead-480.jpg 480w, https://images.example.test/lead-1920.jpg 1920w">', "https://example.test/") === "https://images.example.test/lead-1920.jpg", "Lead-image extraction must prefer the largest responsive image candidate");
check(htmlHelpers.normalizeImageUrl("https://imgpai.thepaper.cn/lead.jpg?x-oss-process=image/resize,w_640") === "https://imgpai.thepaper.cn/lead.jpg", "Publisher thumbnail transforms must be removed to retain original resolution");
check(htmlHelpers.normalizeImageUrl("http://images.example.test/insecure.jpg", "https://example.test/") === "", "Article images must reject non-HTTPS URLs");

const language = await import(new URL("../api/_shared/language.js", import.meta.url));
check(language.validateKnownTerms(["规模化", "规模化"]).length === 1, "Known terms must be normalized and deduplicated before analysis");
check(language.termCountForLearnerLevel("Intermediate") === 20, "Intermediate analysis must request exactly 20 terms");
check(language.termCountForLearnerLevel("Advanced") === 10, "Advanced analysis must request exactly 10 terms");
const intermediateSchema = language.analysisSchemaForTermCount(20);
const advancedSchema = language.analysisSchemaForTermCount(10);
check(intermediateSchema.properties.terms.minItems === 20 && intermediateSchema.properties.terms.maxItems === 20, "Intermediate schema must require exactly 20 terms");
check(advancedSchema.properties.terms.minItems === 10 && advancedSchema.properties.terms.maxItems === 10, "Advanced schema must require exactly 10 terms");
const sampleTermPool = sample.articleAnalysis?.terms || [];
const sampleTerms = sampleTermPool.slice(0, 20);
const sampleArticle = sample.articleDetails?.find((item) => item.id === sample.articleAnalysis?.articleId);
check(sampleTermPool.length >= 25, "Sample analysis must contain replacement terms for known-word filtering");
check(new Set(sampleTermPool.map((term) => term.termZh)).size === sampleTermPool.length, "Sample vocabulary pool terms must be unique");
check(sampleTermPool.every((term) => sampleArticle?.bodyText.includes(term.termZh) && sampleArticle.bodyText.includes(term.exactOccurrence) && sampleArticle.bodyText.includes(term.contextSentenceZh)), "Every sample term must be grounded in the sample article");
const sampleHelpTerms = new Set([...sampleTermPool, ...(sample.wordHelp || [])].map((term) => term.termZh));
const sampleSegments = [...new Set(sampleArticle.paragraphs.flatMap((paragraph) => (
  [...new Intl.Segmenter("zh", { granularity: "word" }).segment(paragraph)]
    .filter((segment) => segment.isWordLike && /[\p{Script=Han}]/u.test(segment.segment))
    .map((segment) => segment.segment)
)))];
check(sampleSegments.every((term) => sampleHelpTerms.has(term)), "Every tappable sample word must have contextual preview help");
const validationArticle = { ...sampleArticle, id: "the-paper:123" };
const validationAnalysis = { ...sample.articleAnalysis, articleId: validationArticle.id, terms: sampleTerms };
check(language.validateAnalysisOutput(validationAnalysis, validationArticle, 20).terms.length === 20, "Intermediate validator must accept exactly 20 grounded terms");
check(language.validateAnalysisOutput({ ...validationAnalysis, terms: sampleTerms.slice(0, 10) }, validationArticle, 10).terms.length === 10, "Advanced validator must accept exactly 10 grounded terms");
const applicationTerm = sampleTerms.find((term) => term.termZh === "应用");
const unsortedByFrequency = [...sampleTerms.filter((term) => term !== applicationTerm), applicationTerm];
const frequencyPrioritized = language.validateAnalysisOutput({ ...validationAnalysis, terms: unsortedByFrequency }, validationArticle, 20);
check(frequencyPrioritized.terms[0].termZh === "应用", "Server validation must order a repeated grounded term ahead of one-occurrence terms");
const sentenceOccurrenceTerms = sampleTerms.map((term, index) => index === 0
  ? { ...term, exactOccurrence: term.contextSentenceZh }
  : term);
const wordOnlyAnalysis = language.validateAnalysisOutput({ ...validationAnalysis, terms: sentenceOccurrenceTerms }, validationArticle, 20);
check(wordOnlyAnalysis.terms.every((term) => term.exactOccurrence === term.termZh), "Server validation must reduce every highlight occurrence to the vocabulary term itself");
const analyzeEndpoint = await text("api/analyze.js");
check(analyzeEndpoint.includes("Return terms in descending occurrence frequency"), "The analysis prompt must instruct the model to order terms by occurrence frequency");
check(analyzeEndpoint.includes("Never select an easy function word merely because it is frequent"), "The analysis prompt must prevent frequency from promoting easy function words");
check(analyzeEndpoint.includes("never a sentence or clause"), "The analysis prompt must prohibit sentence-length vocabulary highlights");
const uiSource = await text("ui.js");
check(uiSource.includes("exactOccurrence: term.termZh"), "The renderer must defensively highlight only the vocabulary term");
let mismatchedTermCountRejected = false;
try {
  language.validateAnalysisOutput({ ...validationAnalysis, terms: sampleTerms.slice(0, 10) }, validationArticle, 20);
} catch {
  mismatchedTermCountRejected = true;
}
check(mismatchedTermCountRejected, "Intermediate validator must reject a response that does not contain 20 terms");
let knownTermRejected = false;
try {
  language.validateAnalysisOutput(validationAnalysis, validationArticle, 20, [sampleTerms[0].termZh]);
} catch {
  knownTermRejected = true;
}
check(knownTermRejected, "Analysis validation must reject a term the user marked as known");
const wordSelection = language.validateWordSelection("企业", sampleArticle.paragraphs[1], validationArticle);
const wordHelp = language.validateWordHelpOutput({ termZh: "企业", pinyin: "qǐyè", meaningEn: "company", contextSentenceZh: sampleArticle.paragraphs[1] }, wordSelection);
check(wordHelp.termZh === "企业" && wordHelp.pinyin === "qǐyè", "Grounded contextual word help must pass validation");

const importHelpers = await import(new URL("../api/_shared/import.js", import.meta.url));
const clutteredNewsPage = `中国新闻网

即时 时政 财经 同心 东西问 国际 社会 理论·评论 中国侨网 大湾区 文娱 体育 教育 法治 健康 生活

# 习近平结束出席金砖国家领导人第十八次会晤回到北京

首页 → 国内新闻

分享到: 微信扫一扫:分享

2026年09月13日 22:04 来源: 中国新闻网

中新社 北京9月13日电 9月13日晚,中国国家主席习近平圆满结束出席金砖国家领导人第十八次会晤回到北京。

中共中央政治局常委、中央办公厅主任蔡奇,中共中央政治局委员、外交部部长王毅等陪同人员同机返回。(完)

【编辑:万纪玮】

国内新闻精选:

台湾书法家:以身为中国人倍感自豪 两岸文化纽带绝不能断`;
const editorialParagraphs = importHelpers.extractEditorialParagraphs(clutteredNewsPage, {
  markdown: true,
  titleZh: "习近平结束出席金砖国家领导人第十八次会晤回到北京-中新网",
});
check(editorialParagraphs.length === 2, "Imported full pages must isolate the continuous article body");
check(!editorialParagraphs.join(" ").includes("即时 时政") && !editorialParagraphs.join(" ").includes("国内新闻精选"), "Imported article text must exclude navigation and recommendation feeds");
check(editorialParagraphs.at(-1).endsWith("同机返回。"), "Imported article cleanup must remove publisher end marks without damaging the sentence");
const importedFromText = importHelpers.normalizePastedArticle({
  titleZh: "人工智能产业观察",
  sourceName: "测试来源",
  canonicalUrl: "",
  text: sample.importedArticle.bodyText,
});
check(/^user-import:[a-f0-9]{16}$/.test(importedFromText.id), "Pasted articles must receive a stable user-import content ID");
check(importedFromText.originType === "text" && importedFromText.canonicalUrl === "", "Pasted articles must support missing optional source links");
check(importedFromText.paragraphs.join("\n\n") === importedFromText.bodyText, "Pasted article paragraph boundaries must match body text");
check(language.validateArticleForLanguage(importedFromText).id === importedFromText.id, "Imported pasted text must pass the existing language-analysis boundary");
let mismatchedImportedIdRejected = false;
try {
  language.validateArticleForLanguage({ ...importedFromText, id: "the-paper:123" });
} catch {
  mismatchedImportedIdRejected = true;
}
check(mismatchedImportedIdRejected, "An imported article must not accept a curated-source ID");
const importedFromUrl = importHelpers.normalizeExtractedArticle("https://example.test/article", {
  markdown: `# 人工智能产业观察\n\n${sample.importedArticle.paragraphs.join("\n\n")}`,
  metadata: { title: "人工智能产业观察", siteName: "测试来源", sourceURL: "https://example.test/article" },
});
check(importedFromUrl.originType === "url" && importedFromUrl.canonicalUrl === "https://example.test/article", "Extracted links must normalize into an imported URL article");
const unsafeImportUrls = ["http://example.test/article", "https://127.0.0.1/article", "https://localhost/article", "https://bit.ly/example", "https://user:password@example.test/article"];
for (const unsafeUrl of unsafeImportUrls) {
  let rejected = false;
  try {
    importHelpers.validateImportUrl(unsafeUrl);
  } catch {
    rejected = true;
  }
  check(rejected, `Unsafe import URL must be rejected: ${unsafeUrl}`);
}
const firecrawlAdapter = await text("api/_shared/import-adapters/firecrawl.js");
check(firecrawlAdapter.includes("process.env.FIRECRAWL_API_KEY"), "Firecrawl credentials must be read only from the server environment");
check(!firecrawlAdapter.includes("console."), "The Firecrawl adapter must not log imported content or provider responses");
const environmentExample = await text(".env.example");
check(environmentExample.split(/\r?\n/).includes("FIRECRAWL_API_KEY="), ".env.example must document the Firecrawl key without a value");

const secretCandidates = [...availableFiles].filter((path) => /\.(?:js|json|md|html|css)$/.test(path));
for (const path of secretCandidates) {
  check(!/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/.test(await text(path)), `${path} appears to contain a hard-coded OpenAI API key`);
  check(!/\bfc-[A-Za-z0-9_-]{20,}\b/.test(await text(path)), `${path} appears to contain a hard-coded Firecrawl API key`);
}

const memory = new Map();
globalThis.location = { search: "" };
globalThis.localStorage = {
  getItem(key) { return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value) { memory.set(key, String(value)); },
  removeItem(key) { memory.delete(key); },
};
globalThis.window = { location: { protocol: "http:" }, setTimeout, clearTimeout };
const { config: checkedConfig } = await import(new URL("../config.js", import.meta.url));
check(checkedConfig.analysisTermCounts.Intermediate === 20, "Browser config must map Intermediate to 20 terms");
check(checkedConfig.analysisTermCounts.Advanced === 10, "Browser config must map Advanced to 10 terms");
const { source: checkedSource } = await import(new URL("../source.js", import.meta.url));
const emptyLibrary = await checkedSource.librarySnapshot();
check(emptyLibrary.records.length === 0 && emptyLibrary.articles.length === 0 && emptyLibrary.errors.length === 0, "Library snapshots must load all browser collections through one boundary");
const firstSave = await checkedSource.save(sample.vocabularyRecord);
const duplicateSave = await checkedSource.save(sample.vocabularyRecord);
check(firstSave.added && firstSave.records.length === 1, "First vocabulary save must create one complete record");
const vocabularyKeys = ["id", "termZh", "pinyin", "meaningEn", "contextSentenceZh", "articleId", "articleTitleZh", "sourceName", "canonicalUrl", "publishedAt", "savedAt", "reviewStage", "reviewDueAt", "lastReviewedAt", "reviewCount", "lapseCount"];
check(vocabularyKeys.every((key) => Object.hasOwn(firstSave.record, key)), "Saved vocabulary records must contain every contracted key");
check(!duplicateSave.added && duplicateSave.records.length === 1, "Duplicate vocabulary save must not create a second record");
check((await checkedSource.reviewQueue()).length === 1, "A newly saved word must be immediately available in the review queue");
const reviewed = await checkedSource.review(firstSave.record.id, "good", "2026-09-13T10:00:00+08:00");
check(reviewed.record.reviewCount === 1 && reviewed.record.reviewStage === 1 && reviewed.record.reviewDueAt === "2026-09-14T02:00:00.000Z", "A Good review must schedule the next review one day later");
const secondRecord = {
  ...sample.vocabularyRecord,
  id: "",
  termZh: "应用",
  pinyin: "yìngyòng",
  meaningEn: "application or deployment",
  contextSentenceZh: "人工智能产业正在从技术探索走向规模化应用。",
};
const secondSave = await checkedSource.save(secondRecord);
const importedVocabulary = await checkedSource.save({
  ...sample.vocabularyRecord,
  id: "",
  termZh: "产业",
  articleId: importedFromText.id,
  articleTitleZh: importedFromText.titleZh,
  sourceName: importedFromText.sourceName,
  canonicalUrl: "",
  publishedAt: null,
});
check(importedVocabulary.record.canonicalUrl === "", "Imported vocabulary must support an absent original link");
const removal = await checkedSource.remove(firstSave.record.id);
check(secondSave.records.length === 2, "A distinct vocabulary record must save alongside the first");
check(removal.removed && removal.records.length === 2, "Removing one vocabulary record must preserve the others");
const knownResult = await checkedSource.markKnown("应用");
check(knownResult.words.length === 1 && knownResult.records.length === 1 && knownResult.records[0].termZh === "产业", "Marking a word known must exclude it and remove only its saved review records");
check((await checkedSource.listKnown())[0].termZh === "应用", "Known words must persist in their versioned browser store");
const restoredKnown = await checkedSource.unmarkKnown("应用");
check(restoredKnown.removed && restoredKnown.words.length === 0, "A known word must be restorable to future language guides");
memory.set(checkedConfig.storageKey, "{malformed");
let invalidStorageRejected = false;
try {
  await checkedSource.list();
} catch {
  invalidStorageRejected = memory.get(checkedConfig.storageKey) === "{malformed";
}
check(invalidStorageRejected, "Malformed vocabulary JSON must be rejected without being overwritten");
const invalidStoredValues = [
  JSON.stringify({ version: 999, records: [] }),
  JSON.stringify({ version: checkedConfig.storageVersion, records: [{}] }),
  JSON.stringify({ version: checkedConfig.storageVersion, records: [firstSave.record, firstSave.record] }),
];
for (const raw of invalidStoredValues) {
  memory.set(checkedConfig.storageKey, raw);
  let rejectedUnchanged = false;
  try {
    await checkedSource.list();
  } catch {
    rejectedUnchanged = memory.get(checkedConfig.storageKey) === raw;
  }
  check(rejectedUnchanged, "Invalid versioned vocabulary storage must be rejected without being overwritten");
}
globalThis.localStorage = {
  getItem() { throw new Error("unavailable"); },
  setItem() { throw new Error("unavailable"); },
};
let unavailableStorageRejected = false;
try {
  await checkedSource.list();
} catch {
  unavailableStorageRejected = true;
}
check(unavailableStorageRejected, "Unavailable browser storage must produce a recoverable error");

if (failures.length) {
  console.error(`Technical guideline checks failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Technical guideline checks passed (${passed}).`);
}
