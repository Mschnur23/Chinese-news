# **students have created their own md files. This is a checker that ensures that the md files are great for the project that they are building only use the feature of these guidelines that are specific to the project type of the student.**

# 

# **00 — Universal Foundation Prompt**

**Use this before Phase 1, whatever your category and whatever your own spec files say.**

Students write their own `01`–`05` specification files with Claude or Codex. Those files describe *what to build*. This file describes *what must never break while you build it*. Run it once, in a brand-new empty folder, before any feature work begins.

Why it exists: the usual failure in a lock-step build is not a bug. It is Phase 2 quietly rewriting something Phase 1 had working. This prompt creates named seams for every later phase to plug into, and a written contract Codex must re-read before it is allowed to touch them.

**How to use it**

1. Create an empty folder and open it in Codex.  
2. Put your own spec files (`01…`, `02…`) in the folder too, if you have them.  
3. Paste everything between the two rulers below, replacing the two bracketed lines at the top.  
4. Do not continue until the acceptance list at the end passes.  
5. At the start of **every** later phase, paste the short guard prompt at the bottom of this file.

---

## **PROMPT — copy from here**

PROJECT NAME: \[your project name\]  
CATEGORY: \[1 \= curated data | 2 \= web retrieval | 3 \= AI interpretation | 4 \= accounts \+ live APIs\]

You are setting up the foundation for a student workshop project. This is a scaffold task,  
not a feature task. Build no product features in this step.

\=== 0\. BEFORE YOU WRITE ANYTHING \===

Read every .md specification file already present in this folder. Then tell me, in five lines  
or fewer:  
  \- the project name and what it does in one sentence;  
  \- the category number above;  
  \- the files you are about to create;  
  \- anything in my specs that contradicts the rules below.  
Then wait for me to say continue. Do not create files yet.

\=== 1\. STACK — FIXED, NOT A SUGGESTION \===

HTML, CSS and plain browser JavaScript (ES modules). Serverless API routes only if my category  
needs them. Git and GitHub. Vercel.

Do not install a frontend framework. Do not install a CSS framework. Do not install a bundler,  
a linter, a test runner, a UI library or a state library. In this step, install nothing at all.  
If you believe something is genuinely required later, stop and explain why instead of adding it.

\=== 2\. CREATE EXACTLY THIS STRUCTURE \===

  index.html          markup and nothing else  
  style.css           all styling, using CSS custom properties for colour and spacing  
  app.js              wiring only: reads input, calls source, calls ui. No rendering, no fetching.  
  ui.js               every visible state lives here and nowhere else  
  source.js           THE ONLY PLACE DATA ENTERS THE APP  
  config.js           every tunable value in the project  
  data/sample.json    a small hand-written sample in the final shape  
  CONTRACTS.md        the names and shapes that must not change  
  CHECKS.md           the regression checklist  
  README.md           what this is, how to run it, how to deploy it  
  .gitignore          must contain .env, .env.local, node\_modules, .DS\_Store

Create .gitignore FIRST, before any other file, and put the env entries in it immediately —  
before there is any key to leak.

\=== 3\. ui.js — EVERY STATE EXISTS FROM DAY ONE \===

Export these functions, with these exact names, and implement all of them now:

  setBusy(isBusy)          disables the action control and shows a working indicator  
  setStatus(message)       a plain sentence above the results; empty string clears it  
  showError(message)       a readable sentence; never a stack trace, never a raw response  
  showEmpty(message)       shown when a request succeeds but produces nothing  
  renderList(items)        renders the result area from an array  
  clearResults()           empties the result area

Rule: app.js must never touch innerHTML, textContent, classList or the DOM directly.  
It calls these six functions only. This is what stops later phases from breaking the layout.

Every one of these must be reachable and visible today, using sample data or a hard-coded string.  
A state that has never been seen on screen does not work, it has merely not been tested.

\=== 4\. source.js — THE SINGLE SWAP POINT \===

Export an object named \`source\` with these methods, all async, all returning plain JavaScript  
objects or arrays in the shape written in CONTRACTS.md:

  source.load(params)      returns the main result for the product  
  source.detail(id)        returns one item in more depth, or throws if not applicable  
  source.save(record)      persists something, or throws if not applicable  
  source.list()            returns what was persisted, or returns \[\]

Implement all four NOW against data/sample.json and localStorage only. No network, no key,  
no backend, no model, whatever my category is.

These four method names are permanent. When a later phase connects the real thing — a feed,  
a scraper, a model, a database — it changes the INSIDE of these methods and nothing else.  
app.js and ui.js must not change when that swap happens.

If my category does not need one of the methods, still export it, and make it throw a clear  
"not used in this project" error rather than deleting it.

\=== 5\. config.js — ONE PLACE FOR EVERY TUNABLE \===

Export a single frozen object holding every value a human might want to change: source URLs,  
result limits, excerpt lengths, timeouts, the sample data path, feature flags for later phases.  
No magic number and no URL may appear anywhere else in the codebase.

\=== 6\. CONTRACTS.md — WRITE THIS FILE, THEN OBEY IT \===

Write a short file recording, for this project specifically:

  \- the exact shape of one item, with every key listed and its type, and a stated rule that a  
    missing value is "" or null or \[\] and that keys are NEVER omitted;  
  \- the id attributes in index.html that JavaScript depends on;  
  \- the six ui.js function names;  
  \- the four source.js method names;  
  \- a heading "DO NOT CHANGE WITHOUT ASKING" listing all of the above.

\=== 7\. CHECKS.md — THE REGRESSION LIST \===

Write a numbered checklist that can be run by hand in under three minutes, covering:

  1\. the page loads with no console errors;  
  2\. the main action produces a result;  
  3\. the empty state appears when there is nothing to show;  
  4\. the error state appears when something fails;  
  5\. the busy state appears while working and clears afterwards;  
  6\. the layout is usable at 375px wide;  
  7\. no secret appears in any file Git tracks.

Add one line to it at the end of every future phase. Never remove a line.

\=== 8\. index.html AND style.css \===

index.html: a header with the project name, one area for controls, one status line, one results  
container. Real ids matching CONTRACTS.md. Nothing else.

style.css: define custom properties for colours, spacing and radius at :root. Style the header,  
controls, buttons including a disabled state, the status line, an error variant, and a result  
card. Include one mobile breakpoint. Keep it under roughly 120 lines. No animation.

\=== 9\. PROVE IT WORKS, THEN CHECKPOINT \===

Wire app.js so the main control calls source.load(), passes the result to ui.renderList(), and  
uses setBusy, setStatus, showEmpty and showError around it.

Then:  
  \- run the site locally and give me the URL;  
  \- walk CHECKS.md yourself and report each line as pass or fail;  
  \- force an error on purpose and show me that showError renders a readable sentence;  
  \- create a Git checkpoint named "Phase 0 \- foundation";  
  \- push it to GitHub, deploy to Vercel, and give me the public URL.

\=== 10\. RULES FOR EVERY PHASE AFTER THIS ONE \===

Write these into README.md so they survive a new conversation:

  1\. Read CONTRACTS.md before changing any file. Do not change anything under  
     "DO NOT CHANGE WITHOUT ASKING" without stopping to ask first.  
  2\. Work additively. Extend the inside of existing functions rather than replacing them,  
     renaming them, or reorganising the file layout.  
  3\. One phase at a time. Do not implement anything from a later phase, even if it is easy.  
  4\. Every new value that a human might tune goes in config.js.  
  5\. Every new way of getting data goes inside a source.js method. Nothing else fetches.  
  6\. Every new visible state goes through a ui.js function. Nothing else writes to the DOM.  
  7\. Secrets are read server-side from environment variables only. Never in a browser file,  
     never in a commit, never in a log line, never in a JSON response.  
  8\. Before committing, run CHECKS.md in full and report the results.  
  9\. If something breaks: reproduce one symptom, change one thing, retest. Do not redesign.  
 10\. At the end of a phase, report files changed, dependencies added, checks passed and anything  
     unresolved. Then stop and wait.

\=== 11\. DO NOT DO IN THIS STEP \===

No features from my specs. No packages. No API routes. No API keys. No database. No login.  
No model calls. No scraping. No feeds. No real data of any kind.

This step is finished when an empty, well-shaped, deployed project exists and every visible  
state has been seen at least once.

## **PROMPT — copy to here**

---

## **The guard prompt — paste at the start of every later phase**

Before you change anything:  
  1\. Read CONTRACTS.md and CHECKS.md.  
  2\. Tell me which phase I am asking for and list the smallest set of files you expect to change.  
  3\. Tell me whether anything I have asked for would change something listed under  
     "DO NOT CHANGE WITHOUT ASKING", and if so, stop and explain instead of proceeding.

Then implement only that phase, additively. New data access goes inside an existing source.js  
method. New visible states go through an existing ui.js function. New tunables go in config.js.

When finished: run CHECKS.md in full, report every line as pass or fail, add any new checks,  
tell me the files changed and dependencies added, and stop. Do not continue to the next phase.

---

## **Why this holds together across all four categories**

| Later phase | What changes | What stays untouched |
| ----- | ----- | ----- |
| Load a live feed | inside `source.load()` | `app.js`, `ui.js`, `index.html` |
| Read one web page | inside `source.detail()` | everything else |
| Call a model | inside `source.load()` | the renderer, which already handles missing fields |
| Add a database | inside `source.save()` and `source.list()` | the entire interface |
| Add sign-in | a gate around `app.js` startup | the product logic underneath |

The seams are the point. A student who has `source.js` and `ui.js` in place can connect almost anything in Phase 2 without editing a single line of the product they spent Phase 1 building. A student who fetches directly inside a click handler will be rewriting that handler every phase, and something that used to work will break each time.

