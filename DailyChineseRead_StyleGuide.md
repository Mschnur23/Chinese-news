# Daily Chinese Read — Visual Style Guide

## Overall Visual Direction

- Sophisticated, mobile-first Chinese editorial publication with a subtle learning layer.
- Warm ivory paper and softly contrasting editorial surfaces.
- Ink-black Chinese headlines set in a Song/Ming-style serif stack.
- Muted umber-gray metadata.
- One restrained rust-red accent, with muted green reserved for success.
- Rounded article cards with subtle borders and shadows.
- Generous whitespace.
- Draw on Noema for atmosphere and expressive English display type, and Initium Media for Chinese hierarchy and long-form rhythm.
- The result should feel like an independent magazine, not a SaaS dashboard or gamified language app.
- Avoid gradients, neon, glassmorphism, giant AI icons, chat bubbles, or obvious “AI-generated” visual tropes.

## Color System

Use CSS custom properties so the visual system stays consistent and easy to tune.

```css
:root {
  --bg: #F2EDE3;
  --surface: #FBF8F0;
  --text-primary: #1B1916;
  --text-secondary: #746E64;
  --border: #D9D1C4;

  --accent: #A53F2B;
  --accent-soft: #F1DFD5;

  --tag-bg: #E8E1D6;
  --saved: #39634F;
  --error: #9F302C;
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

Keep the header simple.

Example:

**Daily Chinese Read**  
*Real stories. Real Chinese. A sharper you.*

Category pills may include:

- For You
- Tech
- Business
- Policy
- Society

Selected pill:

- Electric-blue background.
- White text.

Unselected pill:

- Light-gray or white background.
- Dark text.
- Subtle border.

Do not use a large hero banner.

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

Card styling:

- White surface.
- Roughly 16px corner radius.
- Subtle border.
- Very light shadow only if needed.
- Comfortable internal spacing.
- Avoid unnecessary descriptive copy.

## Article Reader Screen

The article reader should be the most polished part of the app.

Suggested top structure:

```text
←

中国多地加快推动人工智能产业应用落地

澎湃新闻 · 4小时前 · 约6分钟阅读

[AI] [政策] [科技]
```

### English Gist

Show a small warm-tint card near the top.

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

## In-Article Vocabulary Highlighting

Highlighted vocabulary should be subtle.

Unhighlighted Chinese words may use a quiet hover/focus treatment to signal contextual help. Review cards should keep the original Chinese sentence prominent, hide the answer until requested, and present Again, Good, and Easy as clear equal-weight choices.

Recommended treatment:

- Very pale rust-tint background.
- Dark rust text.
- Small radius.
- Optional subtle underline.

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

- White floating card.
- Compact width.
- Subtle border and shadow.
- Rust-red save action.
- No full-screen modal unless required on very small screens.

## Sentence Help

When the user selects a difficult sentence, show a compact helper card rather than replacing the reading view.

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

Optional filters:

- All
- Recently Added
- By Topic

Do not add flashcards or spaced repetition in the MVP.

## Navigation

### Mobile

Use a simple bottom navigation with approximately four destinations:

- Home
- My Words
- Explore / Topics
- Settings

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

- Center the content.
- Feed width: roughly 720–850px maximum.
- Reading column: roughly 680–760px maximum.
- Do not stretch article text across the full screen.

## Visual Behaviors to Avoid

Do not use:

- Purple gradients.
- Neon accents.
- Glassmorphism.
- Excessive shadows.
- Giant hero banners.
- Dashboard metric cards.
- Emoji icons.
- Chat-style AI assistant panels.
- Excessive explanatory text.
- Dark mode as the default design.
- Excessive pill-shaped UI.
- Three-column SaaS layouts.
- Decorative animation.

The design principle should be:

> Editorial reading product first, language-learning tool second, AI product third.

Not:

> AI dashboard with Chinese articles inside it.

## Phase 3 Visual / UX Acceptance Checklist

- [ ] Home screen follows the warm ivory, ink, and rust editorial direction.
- [ ] Article cards use consistent image, headline, metadata, and tag styling.
- [ ] Mobile layout works cleanly at 375px width.
- [ ] Desktop content remains centered and readable.
- [ ] Article typography is calmer and larger than feed typography.
- [ ] Vocabulary highlighting is subtle and consistent.
- [ ] Hover/tap definition cards feel polished and lightweight.
- [ ] Save-word interaction gives clear feedback.
- [ ] Category pills have consistent selected and unselected states.
- [ ] Loading, empty, and error states use the same design language.
- [ ] No frontend framework or CSS framework is added solely for styling.
- [ ] No existing functionality from earlier phases is broken.

## Implementation Guidance for Codex

Use the Daily Chinese Read mockups as the visual reference. Reproduce their visual language rather than inventing a new style.

Prioritize:

- warm ivory paper,
- restrained rust-red accent,
- expressive English display type and Song/Ming Chinese reading type,
- compact article cards,
- subtle category pills,
- generous whitespace,
- polished vocabulary popovers.

Do not redesign the information architecture or add new product features during visual polish. This phase should improve presentation, readability, responsiveness, and interaction quality only.
