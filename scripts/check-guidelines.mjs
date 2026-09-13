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
  "config.js",
  "data/sample.json",
  "CONTRACTS.md",
  "CHECKS.md",
  "README.md",
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
["load", "detail", "save", "list"].forEach((name) => {
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

const sample = JSON.parse(await text("data/sample.json"));
check(Array.isArray(sample.articleSummaries) && sample.articleSummaries.length >= 3 && sample.articleSummaries.length <= 5, "Sample data must contain 3–5 article summaries");
const summaryKeys = ["id", "titleZh", "sourceId", "sourceName", "canonicalUrl", "publishedAt", "topic", "description", "whyItMatters", "whyItFits", "difficulty", "readingMinutes"];
for (const [index, item] of (sample.articleSummaries || []).entries()) {
  summaryKeys.forEach((key) => check(Object.hasOwn(item, key), `Sample article summary ${index + 1} omits ${key}`));
}

const secretCandidates = [...availableFiles].filter((path) => /\.(?:js|json|md|html|css)$/.test(path));
for (const path of secretCandidates) {
  check(!/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/.test(await text(path)), `${path} appears to contain a hard-coded OpenAI API key`);
}

if (failures.length) {
  console.error(`Technical guideline checks failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Technical guideline checks passed (${passed}).`);
}
