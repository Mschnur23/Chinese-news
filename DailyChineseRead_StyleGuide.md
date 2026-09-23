# Daily Chinese Read — Visual Style Guide

## Overall Visual Direction

- Radical-minimalist Chinese editorial publication with a quiet learning layer.
- Pure white canvas, true black typography, gray metadata, and a single restrained vermilion interaction accent.
- Oversized Song/Ming-style Chinese headlines and a strict asymmetric editorial grid.
- Square geometry, hairline rules, hard edges, and abundant unfilled space.
- Reporting images are shown in monochrome to keep the page typographic and cohesive.
- The interface should feel deliberately art-directed and publication-led, never like a SaaS dashboard, card library, or gamified language app.
- Avoid cream and beige palettes, rounded containers, drop shadows, gradients, neon, glassmorphism, decorative blobs, giant AI icons, chat bubbles, and generic “premium editorial” styling.

## Color System

Use CSS custom properties so the visual system stays consistent and easy to tune.

```css
:root {
  --bg: #FFFFFF;
  --surface: #FFFFFF;
  --text-primary: #050505;
  --text-secondary: #686868;
  --border: #CFCFCF;

  --accent: #E2211C;
  --accent-soft: #FFF0EF;

  --tag-bg: #F3F3F1;
  --saved: #14613A;
  --error: #B51F1A;
}
```

## Typography

Use system fonts only. Do not add a font dependency.

### Interface Sans-Serif Stack

```css
font-family:
  "Avenir Next",
  "Helvetica Neue",
  "PingFang SC",
  "Hiragino Sans GB",
  "Microsoft YaHei",
  sans-serif;
```

### English Editorial Display Stack

```css
font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
```

### Chinese Editorial Reading Stack

```css
font-family:
  "Songti SC",
  STSong,
  "Noto Serif CJK SC",
  "Source Han Serif SC",
  SimSun,
  Georgia,
  serif;
```

Recommended use:

- Product name and English display copy: expressive editorial serif.
- Navigation, cards, metadata, controls: sans-serif.
- Chinese headlines, article body, vocabulary terms, and original sentences: Song/Ming-style editorial serif.
- Keep English helper copy visually secondary to the Chinese reading experience.

### Reading Typography

- Mobile article text: roughly 18–20px.
- Desktop article text: roughly 20–22px.
- Line height: around 1.9–2.0 for Chinese long-form reading.
- Generous paragraph spacing.
- Avoid dense text blocks.

## Header

Keep the header flat, typographic, and separated from the page by one black rule.

Example:

**Daily Chinese Read**  
*Real stories. Real Chinese. A sharper you.*

Category pills may include:

- For You
- Tech
- Business
- Policy
- Society

Selected destinations use a short vermilion underline. Do not use navigation pills.

The homepage may use an oversized typographic opening paired with one documentary image. It must not become a generic marketing hero.

## Home / Article Discovery Screen

The discovery feed should be highly scannable.

Each article card should include:

- Thumbnail image.
- Chinese headline.
- Source.
- Publication time.
- 1–3 compact topic tags.
- Optional bookmark icon.
- One short “Why it matters” line where useful.

Suggested card structure:

```text
┌────────────────────────────────────┐
│ [ image ]   Chinese headline       │
│             source · 2小时前       │
│             [AI] [政策] [科技]      │
│                                    │
│             Why it matters →       │
└────────────────────────────────────┘
```

Story styling:

- White surface continuous with the page.
- Square corners and no shadow.
- Hairline dividers and large gray folio numbers.
- A lead story may span the grid; subsequent stories form a strict editorial index.
- Comfortable internal spacing without card-like containers.
- Avoid unnecessary descriptive copy.
- Use the original publisher's lead image when it is available over HTTPS. Never invent an editorial image or show a broken placeholder.

## Article Reader Screen

The article reader should be the most polished part of the app.

When the original article exposes a lead image, show that same image between the article header and reading tools. Preserve its natural editorial character, load it lazily, and hide it cleanly if the publisher blocks delivery.

Suggested top structure:

```text
←

中国多地加快推动人工智能产业应用落地

澎湃新闻 · 4小时前 · 约6分钟阅读

[AI] [政策] [科技]
```

### English Gist

Show a compact, rule-separated block near the end of the reading tools.

Example:

**In brief**  
Chinese local governments are accelerating policies aimed at putting AI into practical industrial use…

Rules:

- Maximum around two sentences.
- Short enough that it does not replace the need to read the Chinese article.

## Vocabulary Preview

Before the article body, show a compact “Words to Know” section.

Example:

`落地` `监管` `推动` `产业链` `试点`

Selecting a word should reveal:

- Chinese word or phrase.
- Pinyin.
- Contextual English meaning.

## Vocabulary Difficulty by Level

The reader level changes how much vocabulary is proactively highlighted.

### Intermediate

- Highlight exactly 20 useful or likely difficult words/phrases.
- Include some moderately common vocabulary that may still create reading friction.
- Definitions can be slightly more explicit.
- Include useful idioms, business terms, policy terms, and grammar-heavy phrases where appropriate.

### Advanced

- Highlight exactly 10 genuinely difficult or especially useful words/phrases.
- Skip vocabulary an advanced learner would normally be expected to know.
- Focus on idiomatic, formal, policy, business, literary, or context-specific usage.
- Keep definitions shorter and more contextual.

General rule:

> Highlight enough vocabulary to reduce reading friction, but not so much that the article stops feeling like normal Chinese.

Phrases may count as single vocabulary items. Prefer useful phrases over splitting them into less meaningful individual words.

Among words that are genuinely difficult or useful for the selected level, prioritize terms that occur more frequently in the article. Use difficulty or contextual usefulness to break frequency ties. Do not select easy function words solely because they are frequent.

Each suggested term also shows an estimated general frequency in modern written Chinese on a 1–100 scale. `100` means extremely common and `1` means highly specialized or rare. Label this as an estimate and keep it visually separate from the term's exact occurrence count inside the current article. Place the score beside the Save action so it helps the reader decide whether the term is broadly useful enough to keep.

Each term should also teach usage rather than translation alone. Show two or three compact, natural collocations containing the exact term, followed by one restrained English note identifying its register or domain. Keep both secondary to the term and definition; they should read like editorial marginalia, not another dashboard metric.

## In-Article Vocabulary Highlighting

Highlighted vocabulary should be subtle.

Unhighlighted Chinese words may use a quiet hover/focus treatment to signal contextual help. Review cards should keep the original Chinese sentence prominent, hide the answer until requested, and present Again, Good, and Easy as clear equal-weight choices.

Recommended treatment:

- Very pale vermilion-tint background.
- Black text with a vermilion underline.
- Square edges.
- Enough contrast to remain visible without resembling a marker pen.

Avoid bright marker-yellow or neon highlighting.

Example:

`人工智能产业正在逐步` **落地** `……`

## Hover / Tap Definition Card

On desktop, hover or click may open the card.

On mobile, tap should open it.

Suggested structure:

```text
┌────────────────────────────┐
│ 落地                       │
│ luò dì                     │
│                            │
│ to be implemented /        │
│ put into practice          │
│                            │
│ + Save to My Words         │
└────────────────────────────┘
```

Style:

- White floating panel with square edges.
- Compact width.
- One black border; shadow only when required to separate it from article text.
- Vermilion save action.
- No full-screen modal unless required on very small screens.

## Sentence Help

When the user selects a difficult sentence, show a compact ruled helper panel rather than replacing the reading view.

Suggested structure:

**Sentence help**

Natural English translation.

**Key structure:**

Short explanation of the most important grammar or phrase pattern.

Keep sentence help concise.

## Vocabulary Page

Title: **My Words**

Recommended fields for each saved item:

- Chinese word or phrase.
- Pinyin.
- Contextual English meaning.
- Original sentence.
- Article/source.
- Date saved.

Example:

```text
人工智能
rén gōng zhì néng
artificial intelligence

From: 澎湃新闻 · Sep 13
──────────────────────────

落地
luò dì
to implement / put into practice

From: 36Kr · Sep 12
```

The saved-word area also contains the existing focused flashcard session and Anki export. Keep both visually secondary to the reading library and use the same square, rule-based system.

## Navigation

### Mobile

Use a simple bottom navigation with two destinations:

- Read
- My Words

Use simple outline icons.

### Desktop

Use either:

- compact top navigation, or
- a narrow left rail.

Do not build a large dashboard shell.

## Responsive Behavior

### Mobile — around 375px

- Single-column layout.
- Article images around 100–120px wide where used beside headlines.
- Category pills may scroll horizontally.
- Hover interactions become tap interactions.
- Definition popovers may become compact bottom sheets if space is limited.

### Desktop

- Center the overall publication grid at up to roughly 1440px.
- Use the wider canvas for asymmetric discovery layouts and generous negative space.
- Keep the actual reading column around 680–760px maximum.
- Do not stretch article text across the full screen.

## Visual Behaviors to Avoid

Do not use:

- Purple gradients.
- Neon accents.
- Glassmorphism.
- Excessive shadows.
- Generic marketing hero banners; an editorial typographic opening is allowed.
- Dashboard metric cards.
- Emoji icons.
- Chat-style AI assistant panels.
- Excessive explanatory text.
- Dark mode as the default design.
- Excessive pill-shaped UI.
- Three-column SaaS card layouts; editorial columns separated by rules are allowed.
- Decorative animation.

The design principle should be:

> Editorial reading product first, language-learning tool second, AI product third.

Not:

> AI dashboard with Chinese articles inside it.

## Phase 3 Visual / UX Acceptance Checklist

- [ ] Home screen follows the stark white, black, and restrained vermilion direction.
- [ ] Article stories use consistent monochrome images, headlines, metadata, folios, and rule styling without rounded card containers.
- [ ] Mobile layout works cleanly at 375px width.
- [ ] Desktop content remains centered and readable.
- [ ] Article typography is calmer and larger than feed typography.
- [ ] Vocabulary highlighting is subtle and consistent.
- [ ] Hover/tap definition cards feel polished and lightweight.
- [ ] Save-word interaction gives clear feedback.
- [ ] Navigation and selected states use consistent short vermilion underlines rather than pills.
- [ ] Loading, empty, and error states use the same design language.
- [ ] No frontend framework or CSS framework is added solely for styling.
- [ ] No existing functionality from earlier phases is broken.

## Implementation Guidance for Codex

Use the Daily Chinese Read mockups as the visual reference. Reproduce their visual language rather than inventing a new style.

Prioritize:

- pure white canvas and true black typography,
- a single restrained vermilion interaction accent,
- expressive English display type and oversized Song/Ming Chinese editorial type,
- square story blocks separated by hairline rules,
- monochrome reporting photography,
- generous whitespace and deliberate asymmetry,
- polished, compact vocabulary popovers.

Do not redesign the information architecture or add new product features during visual polish. This phase should improve presentation, readability, responsiveness, and interaction quality only.
