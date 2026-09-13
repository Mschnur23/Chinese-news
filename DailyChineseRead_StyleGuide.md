# Daily Chinese Read — Visual Style Guide

## Overall Visual Direction

- Clean, premium, mobile-first news-reader aesthetic.
- Predominantly white or very light warm-gray background.
- Strong black Chinese headlines.
- Muted gray metadata.
- One restrained electric-blue accent.
- Rounded article cards with subtle borders and shadows.
- Generous whitespace.
- Should feel closer to Apple News or a modern editorial reading app than a SaaS dashboard.
- Avoid gradients, neon, glassmorphism, giant AI icons, chat bubbles, or obvious “AI-generated” visual tropes.

## Color System

Use CSS custom properties so the visual system stays consistent and easy to tune.

```css
:root {
  --bg: #F7F8FA;
  --surface: #FFFFFF;
  --text-primary: #111318;
  --text-secondary: #727986;
  --border: #E8EAF0;

  --accent: #1769FF;
  --accent-soft: #EEF4FF;

  --tag-bg: #F2F4F7;
  --saved: #17A673;
  --error: #D94A4A;
}
```

## Typography

Use system fonts only. Do not add a font dependency.

### Primary Sans-Serif Stack

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "PingFang SC",
  "Hiragino Sans GB",
  "Microsoft YaHei",
  sans-serif;
```

### Optional Editorial Serif for Product Name

```css
font-family: Georgia, "Times New Roman", serif;
```

Recommended use:

- Product name: serif/editorial style.
- Navigation, cards, metadata, controls: sans-serif.
- Chinese article body: sans-serif with high readability.

### Reading Typography

- Mobile article text: roughly 18–20px.
- Desktop article text: roughly 20–22px.
- Line height: around 1.8.
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

Show a small light-blue card near the top.

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

- Highlight up to roughly 18 useful or likely difficult words/phrases.
- Include some moderately common vocabulary that may still create reading friction.
- Definitions can be slightly more explicit.
- Include useful idioms, business terms, policy terms, and grammar-heavy phrases where appropriate.

### Advanced

- Highlight up to roughly 10 genuinely difficult or especially useful words/phrases.
- Skip vocabulary an advanced learner would normally be expected to know.
- Focus on idiomatic, formal, policy, business, literary, or context-specific usage.
- Keep definitions shorter and more contextual.

General rule:

> Highlight enough vocabulary to reduce reading friction, but not so much that the article stops feeling like normal Chinese.

Phrases may count as single vocabulary items. Prefer useful phrases over splitting them into less meaningful individual words.

## In-Article Vocabulary Highlighting

Highlighted vocabulary should be subtle.

Recommended treatment:

- Very pale blue background.
- Slightly darker blue text.
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
- Blue save action.
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

- [ ] Home screen follows the clean white/blue editorial visual direction.
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

- clean white background,
- restrained electric-blue accent,
- editorial typography,
- compact article cards,
- subtle category pills,
- generous whitespace,
- polished vocabulary popovers.

Do not redesign the information architecture or add new product features during visual polish. This phase should improve presentation, readability, responsiveness, and interaction quality only.
