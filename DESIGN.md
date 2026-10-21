---
name: DEVDOC
description: The team's Markdown knowledge base, built as frosted glass over vertical bands of tinted light.
colors:
  peretti-teal: "#1f6f6d"
  peretti-teal-deep: "#175957"
  teal-mist-ink: "#f3fbfa"
  cathedral-blue: "#6f93c4"
  sky-counterlight: "#7fb4d6"
  sand-counterlight: "#efe3c2"
  green-grey-ground: "#edf0ec"
  green-grey-ground-deep: "#e1e7e3"
  navy-ink: "#14284a"
  navy-ink-2: "#384a67"
  navy-ink-3: "#56667f"
  glass: "rgba(250, 252, 250, 0.6)"
  glass-strong: "rgba(251, 252, 251, 0.86)"
  glass-hover: "rgba(255, 255, 255, 0.78)"
  luminous-edge: "rgba(255, 255, 255, 0.82)"
  line: "rgba(20, 40, 74, 0.1)"
  line-strong: "rgba(20, 40, 74, 0.2)"
  ember-danger: "#a33a27"
  leaf-ok: "#2b7350"
  code-night: "#0f1d33"
  code-ink: "#dbe6f2"
  night-ground: "#08111f"
  night-ground-deep: "#050b15"
  night-ink: "#e6edf5"
  night-ink-2: "#b4c3d6"
  night-ink-3: "#8a9bb3"
  night-glass: "rgba(16, 30, 52, 0.55)"
  night-edge: "rgba(170, 210, 240, 0.13)"
  night-teal: "#5cbfb9"
  night-teal-bright: "#7ad1cb"
  night-teal-ink: "#04201f"
  night-ember: "#ef8a73"
  night-leaf: "#7fd1a3"
  night-code: "#060d19"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Segoe UI, sans-serif"
    fontSize: "clamp(34px, 4.2vw, 52px)"
    fontWeight: 650
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Bricolage Grotesque, Segoe UI, sans-serif"
    fontSize: "25px"
    fontWeight: 620
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Bricolage Grotesque, Segoe UI, sans-serif"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  wordmark:
    fontFamily: "Bricolage Grotesque, Segoe UI, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Albert Sans, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  reading:
    fontFamily: "Albert Sans, Segoe UI, sans-serif"
    fontSize: "16.5px"
    fontWeight: 400
    lineHeight: 1.72
  row-title:
    fontFamily: "Albert Sans, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.55
  label:
    fontFamily: "Albert Sans, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
  code:
    fontFamily: "Spline Sans Mono, ui-monospace, monospace"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  pane-mark: "10px"
  control-sm: "12px"
  control: "14px"
  row: "18px"
  tall: "20px"
  panel: "26px"
  pill: "999px"
spacing:
  hairline: "6px"
  tight: "8px"
  sm: "12px"
  md: "16px"
  gutter: "20px"
  lg: "24px"
  section: "28px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.peretti-teal}"
    textColor: "{colors.teal-mist-ink}"
    typography: "{typography.row-title}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.peretti-teal-deep}"
    textColor: "{colors.teal-mist-ink}"
  button-primary-tall:
    backgroundColor: "{colors.peretti-teal}"
    textColor: "{colors.teal-mist-ink}"
    rounded: "{rounded.tall}"
    padding: "0 22px"
    height: "56px"
  button-glass:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.navy-ink}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "44px"
  button-glass-hover:
    backgroundColor: "{colors.glass-hover}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.navy-ink-2}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "44px"
  button-small:
    rounded: "{rounded.control-sm}"
    padding: "0 12px"
    height: "36px"
  icon-button:
    textColor: "{colors.navy-ink-2}"
    rounded: "{rounded.control-sm}"
    size: "40px"
  field:
    backgroundColor: "{colors.glass-strong}"
    textColor: "{colors.navy-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
    height: "44px"
  search-trigger:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.navy-ink-3}"
    rounded: "{rounded.tall}"
    padding: "0 18px 0 20px"
    height: "56px"
  pill:
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 10px"
    height: "26px"
  nav-link:
    textColor: "{colors.navy-ink-2}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
  nav-link-active:
    backgroundColor: "{colors.navy-ink}"
    textColor: "{colors.green-grey-ground}"
  tab-active:
    backgroundColor: "{colors.navy-ink}"
    textColor: "{colors.green-grey-ground}"
    rounded: "13px"
    padding: "9px 16px"
  panel-glass:
    backgroundColor: "{colors.glass}"
    rounded: "{rounded.panel}"
    padding: "24px"
  doc-row:
    rounded: "{rounded.row}"
    padding: "14px 16px"
  code-block:
    backgroundColor: "{colors.code-night}"
    textColor: "{colors.code-ink}"
    typography: "{typography.code}"
    rounded: "{rounded.row}"
    padding: "16px 18px 18px"
---

# Design System: DEVDOC

## Overview

**Creative North Star: "Vitral de Brasília"**

DEVDOC is light filtered through tinted glass, after Marianne Peretti's windows in the Brasília cathedral. Every surface is frosted glass floating over a fixed field of slow vertical bands of blue, green, white and sand light. The light is the system's identity: a registered color property (`--op`, default Cathedral Blue) feeds the bands, and opening an operation, a department listing, a document or the editor crossfades the bands to that operation's tone over 1.2s. Same building, different light.

The interface itself stays calm and dense enough for daily work by an internal team: a glass rail on the left, a sticky glass search bar with the teal primary action, a large Bricolage greeting, and document rows whose furniture (category pane, title, pills, summary, date) never moves. Navy ink on a green-grey ground in light mode; in dark mode it is the cathedral at night, a deep navy ground with the bands glowing through. Product UI copy is Brazilian Portuguese (pt-BR); this document is in English.

The owner's binding constraints shape the world: glassmorphism, both themes first-class, an off-white ground that is easy on the eyes, rounded corners, non-generic color and type, no eyebrow labels, generous spacing.

**Key Characteristics:**
- Frosted glass panels (22px blur, 150% saturate, 1px luminous edge) over a fixed band field.
- One registered light color per context; only the light, swatches and tags take the operation tone.
- A single teal action color, independent of the operation tone.
- Navy ink fills mark "you are here" (active nav, active tab, pressed icon button).
- Soft, deep, navy-tinted shadows; big radii (26px panels, 14px controls, pill tags).
- Code lives in deep night-blue blocks in both themes.

## Colors

A cool, green-grey and navy palette lit by tinted bands, with one teal voice for action.

### Primary
- **Peretti Teal** (peretti-teal; night: night-teal): the only action color. Primary buttons, links, focus outlines, caret, input focus border, selected menu and palette items (as a 12% soft fill), checked choices, task checkboxes, dropzone hover. Hover deepens to peretti-teal-deep (night: brightens to night-teal-bright). Text on teal is teal-mist-ink (night: night-teal-ink).

### Secondary
- **Cathedral Blue** (cathedral-blue): the default value of the vitral light, `--op`. It tints the bands, the wordmark's first bar, selection highlight (35%) and inline code background (13%). Any context with an operation or department replaces it with that entity's tone.
- **Vitral tones** (data, not CSS tokens): operations, categories and departments each carry a stored color chosen from the admin palette #2E8C8A, #4F8FC0, #3F8F5E, #5B5FC7, #B08A3E, #24467A, #8A5CC2, #C0533A, #2F6F8F, #7A8B3C. A tone is consumed only through a local `--c` variable: the rail swatch, the category pane, pill tint, pill dot, bar track and fill, avatar fill, and the light itself.

### Tertiary
- **Sky Counterlight** (sky-counterlight): the second band in the field, always present regardless of operation, the wordmark's middle bar, and blockquote fill (16%).
- **Sand Counterlight** (sand-counterlight): the warm band in the field and the notice fill (45% in light, a 9% wash at night).

### Neutral
- **Green-Grey Ground** (green-grey-ground; night: night-ground): page ground, painted on `html` so the band field can sit beneath a transparent body. Also the text color on navy-ink fills. Never cream.
- **Ground Deep** (green-grey-ground-deep; night: night-ground-deep): the radial pool at the bottom of the band field.
- **Navy Ink** (navy-ink; night: night-ink): primary text and the active-state fill.
- **Navy Ink 2 / 3** (navy-ink-2, navy-ink-3; night equivalents): secondary text (summaries, ledes, nav at rest) and tertiary text (meta, counts, placeholders, group labels).
- **Glass, Glass Strong, Glass Hover, Luminous Edge** (glass, glass-strong, glass-hover, luminous-edge; night-glass, night-edge at night): the panel material, the popover material, the universal hover fill, and the 1px panel edge.
- **Line / Line Strong** (line, line-strong): row separators and table rules / field borders, toolbar separators, outline pills, dashed dropzone.
- **Code Night / Code Ink** (code-night, code-ink; night-code): code block ground and text in both themes.
- **Ember** (ember-danger; night-ember) and **Leaf** (leaf-ok; night-leaf): destructive actions and errors on a 10% ember wash; success.

### Named Rules
**The Light Is Not the Button Rule.** The operation tone colors light, swatches, panes, pills and bars. It never colors an action, a link or a focus ring; those are always Peretti Teal, in every operation.

**The One Light Rule.** Exactly one context tone drives `--op` at a time. Change it by setting `--op` on the body so the registered property crossfades (1.2s, cubic-bezier(0.16, 1, 0.3, 1)); never swap band gradients directly.

**The Navy Fill Rule.** "You are here" is a solid navy-ink fill with ground-colored text (active nav link, active tab, pressed icon button, active admin entry). Teal is for doing, navy is for being.

## Typography

**Display Font:** Bricolage Grotesque (with Segoe UI, sans-serif)
**Body Font:** Albert Sans (with Segoe UI, sans-serif)
**Label/Mono Font:** Spline Sans Mono (with ui-monospace, monospace)

**Character:** A tight, slightly quirky grotesque at large sizes over a clean, open humanist sans for everything you read and click. Mono appears only where code or keys appear.

### Hierarchy
- **Display** (650, clamp(34px, 4.2vw, 52px), 1.02, -0.035em, balanced wrap): page headings such as the greeting, "Documentos de Web", "Administração". Document titles in the reader use the same face at clamp(32px, 4vw, 48px); the editor title field at clamp(32px, 4vw, 46px).
- **Headline** (620, 25px, 1.2, -0.02em): H2 inside documents; prose H1 is 32px/650 and H3 is 19.5px/620, all in Bricolage.
- **Title** (600, 21px, 1.2, -0.015em): panel headings ("Continue de onde parou", "Por categoria").
- **Wordmark** (700, 26px, -0.035em): the lowercase "devdoc" beside its three-bar mark.
- **Body** (400, 15px, 1.55): all UI text. Ledes are 16px in navy-ink-2, capped at 62ch.
- **Reading** (400, 16.5px, 1.72, max 72ch): rendered document prose.
- **Row title** (600, 16px): document row titles; summaries 14px navy-ink-2 (13.5px in dense rows).
- **Label** (600, 13–14px, sentence case): form labels (14px), rail group toggles and palette group headings (13px, navy-ink-3). Meta and counts are 13px at 400–500 with tabular numerals.
- **Code** (Spline Sans Mono 13.5px, 1.65): code blocks; 14px/1.7 in the raw Markdown editor; 0.86em inline; 12px in keyboard hints; 12.5px in code-block heads.

### Named Rules
**The Mono Is For Machines Rule.** Spline Sans Mono appears only in code blocks, inline code, prompt variables, keyboard hints and the raw editor. Never for labels, numbers or decoration.

**The Sentence Case Rule.** Labels and group headings are sentence case at 13–14px semibold in muted ink, sitting directly above the thing they name. No uppercase tracked labels above headings.

## Layout

Two-column app shell on desktop: a 272px glass rail and a fluid workspace, 24px gap, 20px outer padding, minimum full dynamic viewport height. The rail is sticky (top 20px, height 100dvh minus 40px) with its own scroll; operations and departments are collapsible groups. The workspace stacks with a 28px rhythm and holds a sticky topbar (top 20px): the wide search trigger (56px tall) and the tall primary button. A frosted strip behind the topbar (ground at 90%, 22px blur, fading mask) dissolves content scrolling under it.

Content grids: dashboard is main column plus a 340px side column; the reader is main plus a 320px aside (sticky at top 96px above 1180px); history is a 300px list plus main. All collapse to one column at 1180px or below. At 960px or below the rail becomes an off-canvas drawer (max 300px, slides in over 0.35s, solid ground, scrim) opened from a glass menu button, the shell padding drops to 12px 16px, and the search trigger shrinks to 48px. At 640px or below document rows drop their meta column under the title and summaries wrap to two lines.

Spacing rhythm is 6, 8, 12, 16, 20, 24, 28, 40px. Panels pad 24px; flush list panels pad 20px 10px 10px so rows reach close to the glass edge.

## Elevation & Depth

Depth comes from material, not stacking: glass panels blur and saturate the light behind them, catch a 1px luminous top edge, and float on a soft, deep, navy-tinted shadow. Popovers (menus, the command palette, toasts, the mobile drawer, the editor toolbar) use the stronger glass and a longer drop. In dark mode the inset highlight nearly disappears and shadows go to pure black.

### Shadow Vocabulary
- **Glass rest** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.7), 0 18px 40px -24px rgba(20,40,74,0.38), 0 2px 8px -4px rgba(20,40,74,0.08)`): every glass panel, document images.
- **Glass pop** (`box-shadow: 0 30px 70px -30px rgba(20,40,74,0.5), 0 6px 18px -8px rgba(20,40,74,0.18)`): dialogs, menus, palette, drawer, editor toolbar.
- **Teal glow** (`box-shadow: 0 10px 24px -14px color-mix(in oklab, var(--action) 80%, transparent)`): primary button only.
- **Pane glow** (`box-shadow: inset 0 0 0 1px rgba(255,255,255,0.28), 0 6px 14px -8px var(--c)`): category panes, glowing in their own tone.
- **Code well** (`box-shadow: inset 0 0 0 1px rgba(160,200,240,0.12), 0 18px 34px -24px rgba(5,11,21,0.7)`): code blocks.

### Named Rules
**The Opaque Over Text Rule.** Glass is for surfaces over the light. Anything that sits over moving text (the sticky topbar, the editor toolbar, the mobile drawer) goes near-solid: ground at 90–99%, so nothing ghosts through.

**The Soft Drop Rule.** Shadows are large, negative-spread and navy-tinted. No hard offset shadows.

## Shapes

Generous, layered rounding that tightens as elements get smaller: panels and dropzones 26px, tall search and tall button 20px, document rows, code blocks, toolbars and tab rails 18px, notices and blockquotes 16px, controls and fields 14px, small buttons, icon buttons, palette items and bar rows 12px, category panes and menu items 10px, inline code 6px, pills fully round, avatars circular. The signature silhouette is the vertical pane: tall rounded rectangles (rail swatches 9×22px, category panes 34×42px with a top-left highlight gradient, the three staggered bars of the wordmark) echoing stained-glass panes. Borders are 1px and translucent; there are no heavy outlines.

## Components

### Buttons
Confident and quiet at once: one solid teal, everything else glass or bare.
- **Shape:** gently rounded (14px); tall variant 20px, small 12px.
- **Primary:** Peretti Teal fill, mist text, 600 weight, 44px min height, 18px side padding, teal glow below. Tall variant (56px, 22px padding) is the topbar's "Novo documento".
- **Hover / Focus / Active:** hover deepens teal (0.18s); focus-visible is a 2px teal outline at 2px offset; active nudges down 1px. Disabled at 50% opacity.
- **Glass:** glass fill with luminous edge and its own 16px blur; hover to glass-hover.
- **Quiet:** transparent, navy-ink-2 text; hover to glass-hover and full ink.
- **Danger:** ember text on a 10% ember wash, 18% on hover.
- **Icon button:** 40px square, 12px radius, navy-ink-2; pressed state is the navy fill.

### Chips
- **Style:** pills are 26px tall, fully rounded, 13px/500. Tinted pills take their tone at 14% fill with text mixed 62% tone into ink. Operation pills add a small 7px rounded-square dot in the full tone. Outline pills (drafts, tags as `#tag`, departments) are transparent with a line-strong border.
- **State:** dense rows shrink pills to 22px, 12.5px.

### Cards / Containers
- **Corner Style:** 26px.
- **Background:** glass (60% in light, 55% navy at night) with 22px blur and 150% saturate.
- **Shadow Strategy:** Glass rest; popovers use Glass pop.
- **Border:** 1px luminous edge.
- **Internal Padding:** 24px; flush list panels 20px 10px 10px with a 14px inset head.

### Inputs / Fields
- **Style:** 44px min height, 14px radius, 1px line-strong border, glass-strong at 70%, placeholders in navy-ink-3. Selects use a custom chevron. Chip inputs and multi-pickers share the same shell.
- **Focus:** border turns teal plus a 3px soft teal ring.
- **Error / Disabled:** errors are 14px ember text; disabled controls drop to 40–60% opacity.

### Navigation
- **Style:** rail links are 15px/500 navy-ink-2 with an 18px line icon, 7px 12px padding, 14px radius, counts right-aligned in tabular navy-ink-3. Operation and department entries lead with their vertical tone swatch.
- **States:** hover is glass-hover with full ink; current page is the navy fill with ground text. Group toggles are 13px/600 sentence case with a rotating chevron.
- **Tabs:** a glass rail (18px radius, 5px padding) of 14px/600 tabs; active tab is the navy fill.
- **Mobile:** the rail becomes a solid-ground drawer behind a glass menu button.

### Document Row (signature)
Fixed furniture, always in the same place: a tone-glowing category pane with a line icon, then title (16px/600, ellipsis), summary, and pills, then right-aligned author and relative date. 14px 16px padding, 18px radius, hover to glass-hover, rows separated by a 1px line that disappears around the hovered row. The dense variant (panels) puts pills and summary on one line under the title.

### Category Bars
Counts as clickable rows: label and tabular count over an 8px track at 12% tone with a full-tone fill (min 4px), 12px radius hover. Each row opens the list already filtered.

### Code Block
Night-blue well in both themes, 18px radius; a mono head with language select and copy button; a custom cool highlight palette (keywords soft blue, strings mint, numbers amber, titles cyan, attributes lilac, types rose, comments italic slate).

### Choice Cards
Selectable options rendered as cards: 12px 14px padding, 14px radius, 1px line border, glass-hover on hover, checked state is a teal border on the soft teal fill. The new-document chooser is a 28px-padded glass-pop dialog whose grid (min 230px columns, 10px gap) holds one choice card per category, each led by its tone pane.

### Notices
Inline status strips: 14px 16px padding, 16px radius, 14px text with an 18px leading line icon, on a sand wash (45% in light, 9% at night) or the ember wash for problems. The reader's review notice uses one, with a small primary button for the action.

### Command Palette
A 680px glass-pop dialog dropped 12vh from the top over a 28% navy scrim with 4px blur; 18px input, grouped results with 12px-radius items, selection as the soft teal fill.

## Do's and Don'ts

### Do:
- **Do** put every surface on glass over the band field, and paint the ground on `html` so the fixed band layer shows through a transparent body.
- **Do** tint context by setting `--op` on the body; let the registered property crossfade over 1.2s with cubic-bezier(0.16, 1, 0.3, 1).
- **Do** feed entity tones through a local `--c` and derive tints with `color-mix(in oklab, ...)` (14% pill fill, 12% bar track, 62% text mix).
- **Do** use Peretti Teal for every action, link and focus ring, and the navy fill for every current-location state.
- **Do** make surfaces that sit over scrolling text near-opaque (ground at 90–99%).
- **Do** keep document rows' furniture in fixed positions: pane, title, summary, pills, meta.
- **Do** design both themes together; dark is the cathedral at night (night-ground with bands at 54% strength), not an inverted light theme.
- **Do** honor reduced motion: all transitions and animations collapse to near zero.

### Don't:
- **Don't** color buttons, links or focus states with an operation tone.
- **Don't** use a cream or warm-white ground; the ground is green-grey.
- **Don't** use hard offset shadows or heavy borders; depth is blur, edge and soft drop.
- **Don't** add uppercase tracked eyebrow labels above headings.
- **Don't** use Spline Sans Mono outside code, prompt variables and keyboard hints.
- **Don't** add a gray sidebar on a white page with a single blue accent; that is the Notion and Confluence look this world refuses.
- **Don't** leave translucent glass over moving text where it ghosts.
