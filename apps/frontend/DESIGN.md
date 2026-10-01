---
name: Profesionalni Upravnik
description: A calm, warm, building-scoped space for residents and their upravnik.
colors:
  stairwell-pine: "oklch(52.0% 0.090 185)"
  stairwell-pine-deep: "oklch(44.0% 0.078 185)"
  stairwell-pine-pressed: "oklch(36.0% 0.062 185)"
  stairwell-pine-mist: "oklch(97.5% 0.012 185)"
  stairwell-pine-mist-hover: "oklch(94.5% 0.025 185)"
  stairwell-pine-edge: "oklch(89.0% 0.045 185)"
  focus-pine: "oklch(60.5% 0.094 185)"
  plaster-white: "oklch(100% 0 75)"
  plaster-ground: "oklch(98.6% 0.003 75)"
  plaster-sunken: "oklch(96.6% 0.004 75)"
  plaster-line: "oklch(91.0% 0.006 75)"
  plaster-line-strong: "oklch(84.5% 0.007 75)"
  ink: "oklch(20.5% 0.005 75)"
  ink-secondary: "oklch(46.5% 0.008 75)"
  ink-muted: "oklch(54.0% 0.008 75)"
  ink-disabled: "oklch(71.0% 0.008 75)"
  forum-amber: "oklch(45.0% 0.090 48)"
  forum-amber-wash: "oklch(97.5% 0.020 75)"
  forum-amber-edge: "oklch(88.0% 0.072 70)"
  chat-sky: "oklch(48.0% 0.095 243)"
  chat-sky-wash: "oklch(94.0% 0.030 235)"
  chat-sky-edge: "oklch(88.0% 0.055 235)"
  docs-violet: "oklch(46.0% 0.095 302)"
  docs-violet-wash: "oklch(93.5% 0.028 300)"
  docs-violet-edge: "oklch(87.5% 0.050 300)"
  success: "oklch(62.0% 0.120 150)"
  success-wash: "oklch(93.5% 0.045 150)"
  success-text: "oklch(48.0% 0.105 152)"
  warning: "oklch(74.0% 0.142 62)"
  warning-wash: "oklch(93.5% 0.042 73)"
  warning-text: "oklch(55.0% 0.112 50)"
  danger: "oklch(58.0% 0.185 25)"
  danger-wash: "oklch(94.0% 0.030 25)"
  danger-text: "oklch(48.0% 0.170 25)"
  info: "oklch(60.0% 0.105 240)"
  category-moss: "oklch(46.0% 0.090 125)"
  category-moss-wash: "oklch(95.0% 0.030 125)"
  category-moss-edge: "oklch(88.0% 0.050 125)"
  category-rose: "oklch(46.0% 0.090 5)"
  category-rose-wash: "oklch(95.0% 0.030 5)"
  category-rose-edge: "oklch(88.0% 0.050 5)"
  category-indigo: "oklch(46.0% 0.090 270)"
  category-indigo-wash: "oklch(95.0% 0.030 270)"
  category-indigo-edge: "oklch(88.0% 0.050 270)"
  category-plum: "oklch(46.0% 0.090 335)"
  category-plum-wash: "oklch(95.0% 0.030 335)"
  category-plum-edge: "oklch(88.0% 0.050 335)"
typography:
  headline:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: "2rem"
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  nav:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: "1rem"
  label:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.06em"
  meta-mono:
    fontFamily: "JetBrains Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "1rem"
rounded:
  xs: "6px"
  sm: "10px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "28px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.stairwell-pine}"
    textColor: "{colors.plaster-white}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.stairwell-pine-deep}"
  button-outline:
    backgroundColor: "{colors.plaster-ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
  button-outline-hover:
    backgroundColor: "{colors.plaster-sunken}"
  button-ghost-hover:
    backgroundColor: "{colors.plaster-sunken}"
    textColor: "{colors.ink}"
  button-destructive:
    backgroundColor: "{colors.danger-wash}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    height: "36px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
    height: "36px"
  card:
    backgroundColor: "{colors.plaster-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "24px"
  feed-card:
    backgroundColor: "{colors.plaster-white}"
    rounded: "{rounded.xl}"
    padding: "16px"
  feed-card-pinned:
    backgroundColor: "{colors.stairwell-pine-mist}"
  chip-board:
    backgroundColor: "{colors.stairwell-pine-mist}"
    textColor: "{colors.stairwell-pine-deep}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "0 8px"
    height: "20px"
  chip-forum:
    backgroundColor: "{colors.forum-amber-wash}"
    textColor: "{colors.forum-amber}"
    rounded: "{rounded.full}"
    padding: "0 8px"
    height: "20px"
  chip-chat:
    backgroundColor: "{colors.chat-sky-wash}"
    textColor: "{colors.chat-sky}"
    rounded: "{rounded.full}"
    padding: "0 8px"
    height: "20px"
  chip-docs:
    backgroundColor: "{colors.docs-violet-wash}"
    textColor: "{colors.docs-violet}"
    rounded: "{rounded.full}"
    padding: "0 8px"
    height: "20px"
  chip-category-maintenance:
    backgroundColor: "{colors.category-moss-wash}"
    textColor: "{colors.category-moss}"
    rounded: "{rounded.full}"
    padding: "0 8px"
    height: "20px"
  chip-status-open:
    backgroundColor: "{colors.success-wash}"
    textColor: "{colors.success-text}"
    rounded: "{rounded.full}"
    padding: "0 8px"
    height: "20px"
  nav-item:
    textColor: "{colors.ink-secondary}"
    typography: "{typography.nav}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  nav-item-hover:
    backgroundColor: "{colors.plaster-sunken}"
    textColor: "{colors.ink}"
  nav-item-active:
    backgroundColor: "{colors.stairwell-pine-mist}"
    textColor: "{colors.stairwell-pine-deep}"
  count-badge:
    backgroundColor: "{colors.stairwell-pine}"
    textColor: "{colors.plaster-white}"
    rounded: "{rounded.full}"
    padding: "0 6px"
    height: "20px"
  sidebar-panel:
    backgroundColor: "{colors.plaster-white}"
    rounded: "{rounded.lg}"
    padding: "12px"
    width: "240px"
---

# Design System: Profesionalni Upravnik

## Overview

**Creative North Star: "The Well-Kept Building"**

The interface should feel like a clean, well-lit entrance hall in a building that someone looks after. Everything has its place, nothing shouts, and you can tell at a glance that the building is cared for. The ground is warm plaster: off-whites and greys tinted toward hue 75, never cold blue-grey. A single muted Stairwell Pine marks where you are and what you can act on. The mood is calm, warm and trustworthy. Residents should feel reassured that management is present, and upravnici should feel the building is in order.

Content sits in soft layers. The plaster ground is the floor. White panels and cards rest on it with a hairline edge and a warm, low shadow. Dialogs and sheets float above on deeper shadows of the same tint. Corners are soft throughout (12–20px), which reads as approachable rather than playful. Each kind of content has its own colour (announcements pine, forum amber, chat sky, documents violet), so residents can scan a mixed feed and know what each item is before reading it.

Density is moderate. The resident feed breathes on a phone with 16px card padding and 12px gaps between cards. The upravnik's desktop workspace fits a 240px sidebar, a fluid column and a 280px side panel inside a 1366px frame. Type does the work of hierarchy. Decoration does not.

**Key Characteristics:**
- Warm plaster neutrals (hue 75) under one muted pine accent.
- Soft layers: ground → panel/card → overlay, with warm-tinted two-layer shadows.
- One colour per content type, applied as a pale wash, a darker text tone and a matching edge.
- Hanken Grotesk for all reading and UI text; JetBrains Mono only for timestamps and counts.
- Soft corners: 12px for controls, 16px for panels, 20px for cards, pills for chips and counts.
- Serbian UI copy. Labels are short nouns ("Oglasna tabla", "Zahtevi", "Dokumenta").

## Colors

A restrained warm palette. Plaster Stone carries almost every surface and text tone, Stairwell Pine carries brand and action, four content-type hues carry meaning, and four quieter category hues label forum and ticket categories.

All values are OKLCH and that is the canonical format. Ramps live in `app/globals.css` as `--pine-*`, `--stone-*`, `--amber-*`, `--sky-*`, `--violet-*`, `--green-*` and `--red-*`, and category trios as `--cat-*`. Components should consume the semantic aliases (`--brand`, `--surface`, `--text`, `--type-*`, `--success`, and so on), not the raw ramp steps. Chip labels, classes and icons come from `lib/chips.ts`, rendered by `components/ChipBadge.tsx`.

### Primary
- **Stairwell Pine** (`--brand`, pine-600): the brand mark, primary buttons, count badges, unread dots, active icons. It means "this is yours / act here". Stairwell Pine Deep (`--brand-hover`, pine-700) is for active nav text, the announcement content type and pressed states. Stairwell Pine Pressed (pine-800) is for the active state.
- **Stairwell Pine Mist** (`--brand-subtle`, pine-50): active nav background, pinned announcement cards, avatar fallback, announcement chips. Pine Mist Hover (pine-100) and Pine Edge (pine-200) are its hover state and border.
- **Focus Pine** (`--ring-focus`, pine-500): the focus ring on every interactive element, used at 50% alpha as a 3px ring.

### Secondary
- **Forum Amber** (`--type-forum`, amber-800 text on amber-50 wash, amber-200 edge): forum threads wherever they appear. The mid-ramp amber-500 doubles as `--warning`.

### Tertiary
- **Chat Sky** (`--type-chat`, sky-700 on sky-100, sky-200 edge): chat activity. sky-500 doubles as `--info`.
- **Docs Violet** (`--type-docs`, violet-700 on violet-100, violet-200 edge): documents.

### Neutral
- **Plaster Ground** (`--bg`, stone-50): the page floor behind everything.
- **Plaster White** (`--surface`, stone-0): cards, panels, dialogs, sheets, the sidebar and right panel.
- **Plaster Well** (`--surface-well`, stone-100 in light, L12.5 in dark): the recessed main column that holds the cards. In dark it sits below the ground (L15) so it still reads as a well, not a raised panel.
- **Plaster Sunken** (`--surface-sunken`, stone-100): hover fill, secondary buttons, the resident's "Zgrada" building pill, muted chips.
- **Plaster Line** (`--border`, stone-200): hairline borders and dividers. **Plaster Line Strong** (stone-300) is for emphasised edges.
- **Ink** (`--text`, stone-900): headings and body text. **Ink Secondary** (stone-600): supporting text, inactive nav. **Ink Muted** (stone-500, 54% L so it holds 4.5:1 on Plaster Sunken): eyebrow labels, icons at rest, metadata. **Ink Disabled** (stone-400).

### Status
- **Success** (green-500, wash green-100, text green-700): open status chips, active states, "online" dots.
- **Danger** (red-500, wash red-100, text red-700): destructive actions, errors, logout.

### Category hues
Forum and ticket categories get their own trio (wash L95 C0.03, edge L88 C0.05, text L46 C0.09), set in the hue gaps between pine, amber, sky, violet, green and red:
- **Moss** (`--cat-maint-*`, hue 125): Održavanje, with a wrench icon.
- **Rose** (`--cat-complaint-*`, hue 5): Žalba, with a warning-triangle icon.
- **Indigo** (`--cat-ask-*`, hue 270): Pitanje (threads, help icon) and Zahtev (tickets, inbox icon). The two never share a list, and both mean "asking".
- **Plum** (`--cat-payment-*`, hue 335): Plaćanje, with a wallet icon.
- **Opšte** stays a neutral outline chip with no icon. Document categories (Ugovor, Izveštaj, Odluka, Ostalo) are plain muted text.

### Dark theme
The `.dark` class (next-themes, "Sistem / Svetla / Tamna" in the account menu and mobile sheet) re-points the ramps rather than the components. Stone inverts around the surface: stone-50 (ground) becomes L15, stone-0 (surface) L19, stone-100 (sunken/hover) L23, stone-200 (line) L28, stone-300 (strong line) L36, and ink runs stone-500 L66 → stone-900 L94. Chromatic ramps flip the same way: 50/100 become deep low-chroma washes (L21.5–27; pine-50 stays closest to the surface so pinned cards and active nav read as a tint, not a block), 200 a dark edge (L33–35), and 700/800 light text (L76–85). Fill steps stay vivid: pine-600 lifts to L68, so `--on-brand` turns dark (pine L18) and Stairwell Pine still reads as "act here". Category trios become wash L26, edge L35, text L82. Every raw `stone-*`/`pine-*` utility therefore keeps its meaning in both themes. Every text/wash pair clears 4.5:1 in both.

### Named Rules
**The Content-Type Rule.** Every content type keeps its colour everywhere it appears: announcements pine, forum amber, chat sky, documents violet. A type colour is always a trio of wash background, darker text and matching edge, never a solid fill. No other element may borrow these hues for decoration. The one exception is the Loader, where all four appear together to stand for the whole building loading.

**The Category Hue Rule.** Category chips use only the `--cat-*` trios, never a content-type or status hue, and always carry their icon so colour is never the only signal.

**The Warm Plaster Rule.** Neutrals are tinted toward hue 75. Don't introduce cool greys (Tailwind `gray`, `slate`, `zinc`) or pure `#000` and `#fff` outside the stone ramp.

**The One Pine Rule.** Stairwell Pine is the only colour that means "act here". Status uses the status tokens, and content types use their own hues.

## Typography

**Body Font:** Hanken Grotesk (with ui-sans-serif, system-ui, Segoe UI, Roboto), weights 400–800 plus italic.
**Mono Font:** JetBrains Mono (with ui-monospace, SF Mono, Menlo), weights 400–600.

**Character:** a warm, slightly humanist grotesk that stays friendly at small sizes and holds up at semibold weights for titles. JetBrains Mono is a quiet technical counterpoint, used only where numbers need to line up and scan: timestamps, reply counts and stats. Both fonts load with the `latin` subset, which covers Serbian Latin diacritics (č, ć, š, ž, đ).

### Hierarchy
- **Headline** (600, 1.5rem / 2rem, −0.025em): page titles and the resident's greeting. One per page.
- **Title** (600, 1rem, 1.375): card and thread titles, dialog titles.
- **Body** (400, 1rem, 1.5): feed previews, thread bodies, form errors, empty states. Previews clamp to two lines.
- **Body Small** (400–500, 0.875rem): button labels, dense UI text, card descriptions.
- **Nav** (500, 13px; 600 when active): sidebar navigation.
- **Caption** (500, 0.75rem): chip text, author names, card footers, bottom-nav labels.
- **Label** (600, 11px, 0.06em, uppercase): section eyebrows such as "Zgrade", "Moji zahtevi" and the "Zgrada" pill.
- **Meta Mono** (400, 0.75rem): timestamps and counts in JetBrains Mono.

### Named Rules
**The Mono-for-Numbers Rule.** JetBrains Mono appears only on timestamps, counts and stats. It never sets words or headings.

**The Single Headline Rule.** Each page has exactly one 1.5rem semibold headline, and below that hierarchy comes from weight and colour rather than more sizes. Don't add display sizes to app screens.

## Layout

- **Frame:** the app shell is centred and caps at 1366px. Three columns: a 240px sidebar, a fluid main column and a 280px right panel at ≥1280px, separated by a 24px column gap, with a 12px gutter at the outer edges and top and bottom. From 768px each column is a full-height framed pane with the same 16px radius and hairline: the sidebar and right panel are raised Plaster White panels, and the main column is a recessed Plaster Well with no shadow. The cards scroll inside the well, which clips them at its rounded edge. Each pane scrolls on its own, with hidden scrollbars. Below 768px the main column is unframed.
- **Responsive:** below 768px the sidebar disappears and a fixed bottom nav takes over: five destinations plus "Nalog", which opens a bottom sheet with the account menu, the resident's recent requests, the Tema switch and logout. The main column then adds 64px of bottom padding to clear the nav. From 768px the sidebar appears. From 1280px the right panel appears (shortcuts plus "Moji zahtevi").
- **Rhythm:** 4px base grid. Main column gutters are 16px (20px from 768px). Pages pad only the bottom (24px), because the sticky page header caps the top of the column and sits 24px above the content. Feed cards are 12px apart, card padding is 16px for feed and compact cards and 24px for standard cards, and nav items are 4px apart.
- **Login:** a single 384px card centred on Plaster Ground.

## Elevation & Depth

The system is **softly layered**: three planes, each separated by a warm, low-alpha, two-layer shadow tinted with the stone hue (oklch 20.5% 0.005 75), never neutral black in light.

1. **Ground:** Plaster Ground, no shadow.
2. **Resting panels and cards:** Plaster White with a 1px hairline (stone-200 border, or a 10% ink ring on cards) plus `shadow-xs`/`shadow-sm`. The sidebar and right panel rest at `shadow-sm`. The main column is the exception: a recessed Plaster Well with a hairline and no shadow, so the cards inside it keep their lift.
3. **Overlays:** sheets use `shadow-lg` and dialogs `shadow-xl`, over a 10% black backdrop (50% in dark) with a light blur.

In dark, depth comes mostly from surface lightness (ground L15 → surface L19 → sunken L23) plus the hairlines; the `--elev-*` values switch to black at 30–50% alpha because a warm tint disappears on a dark ground.

Interactive cards respond to hover by rising 2px and deepening to `shadow-md` over 150ms.

### Shadow Vocabulary
- **xs** (`0 1px 2px oklch(20.5% 0.005 75 / 0.06)`): cards and outline buttons at rest.
- **sm** (`0 1px 2px … / 0.05, 0 2px 6px … / 0.06`): the sidebar, the right panel and other resting panels.
- **md** (`0 2px 4px … / 0.05, 0 6px 16px … / 0.08`): the hover state of clickable cards.
- **lg** (`0 4px 8px … / 0.05, 0 12px 32px … / 0.10`): sheets and popovers.
- **xl** (`0 8px 16px … / 0.06, 0 20px 48px … / 0.12`): dialogs and top-most overlays.

### Named Rules
**The Warm Shadow Rule.** In light, every shadow uses the stone tint at 12% alpha or less, and every shadow has two layers except `xs`. Shadows are defined once as `--elev-*` and themed there, never per component. Never use Tailwind's default black shadows or coloured glows.

**The Lift Means Click Rule.** Only a card you can click rises on hover. Static containers keep their resting shadow.

## Shapes

Soft, consistent rounding that steps up with container size: 6px (xs) for tiny insets, 10–12px for buttons, inputs and nav items, 16px for the sidebar panel and large containers, 20px for cards and dialogs, 28px for the top corners of a bottom sheet, and full pills for chips, count badges, avatars and status dots. Borders are always 1px hairlines and are never thicker for emphasis. The brand mark is a 12px-radius pine tile holding a line-drawn building in plaster white.

## Components

### Buttons
Quiet and confident: compact and solid, with no gradients.
- **Shape:** gently rounded (12px). Heights are 36px by default, 32px small, 24px extra-small and 40px large. Labels are 14px medium. Icons are 16px.
- **Primary:** Stairwell Pine fill, `--on-brand` text (Plaster White in light, deep pine in dark).
- **Hover / Focus / Active:** hover deepens to `--brand-hover` (Pine Deep) and press to `--brand-active` (Pine Pressed). In dark both step lighter instead. Focus shows a 3px ring of Focus Pine at 50%. Active nudges the button down 1px. Disabled sits at 50% opacity.
- **Outline:** Plaster Ground fill, hairline border, `shadow-xs`; Plaster Sunken on hover.
- **Secondary / Ghost:** Plaster Sunken fill, or transparent until hover.
- **Destructive:** a soft 10% danger wash with danger text, deepening to 20% on hover. It is never a solid red block.

### Chips (content-type, category and status)
- **Style:** 20px pills, 12px medium text, 8px horizontal padding, using a trio of wash, text and edge.
- **Content type:** the content-type trio (feed cards).
- **Category:** the category trio plus its 12px icon, via `<ChipBadge chip={threadCategory[c]} />` or `ticketCategory`.
- **Status:** open uses the success trio (green-100 wash, green-700 text), closed is a stone-100 wash with stone-500 text. In the compact ticket lists (right panel, mobile sheet), the category name sits beside a status pill as plain muted 10px text.

### Cards / Containers
- **Corner Style:** 20px.
- **Background:** Plaster White. A pinned announcement switches to Stairwell Pine Mist with a pine-200 edge.
- **Shadow Strategy:** `shadow-xs` at rest, `shadow-md` plus a 2px rise on hover when clickable (see Elevation & Depth).
- **Border:** 10% ink ring or 1px Plaster Line.
- **Internal Padding:** 24px standard, 16px compact and feed.

### Feed Card (signature)
The resident home feed is the heart of the product, and each card answers "what is this, when was it, and is it worth opening?" The header has a type chip on the left and a mono timestamp on the right. Then come a semibold 1rem title, a two-line 1rem body preview in Ink Secondary, and a caption footer with the author and mono counts with 16px icons. Pinned announcements sit above the feed under a small pine "pin" eyebrow.

### Inputs / Fields
- **Style:** 36px tall, 12px radius, 10px horizontal padding, transparent fill, 1px border, `shadow-xs`. Text is 16px on mobile (which prevents iOS zoom) and 14px from 768px.
- **Focus:** the border shifts to Focus Pine with a 3px ring at 50%.
- **Border:** `--input` maps to Plaster Line Strong (stone-300), so the field's edge reads on white. In dark the field also takes a 30% `--input` fill.
- **Error / Disabled:** a danger border with a 20% danger ring. Disabled sits at 50% opacity.

### Page Header
Every main-column page opens with `<PageHeader>`, a sticky Plaster White cap on the Plaster Well. It runs edge to edge, with a hairline bottom border and the column's own gutters, and it carries the page's single h1 (the 24px semibold headline, clamped to two lines).
- **Index pages:** a 40px tile with the 20px section icon, filled with the content-type trio (board pine, forum amber, chat sky, docs violet) or neutral Plaster Sunken for everything else. The description sits under the title as 14px muted text.
- **Detail pages:** no tile. A 13px muted back link (a 14px arrow plus the parent's name) sits above the title. While loading, a skeleton replaces the title.
- **Actions:** the primary call to action (Nova tema, Novi zahtev, Zatvori zahtev…) sits in a right-aligned slot, so it stays in reach while the content scrolls.
- **Stuck state:** once the column scrolls (`[data-page-scroll]` with scrollTop > 0), the header adds `shadow-sm` over 150ms. At rest it is flat.

### Navigation
- **Sidebar (≥768px):** a floating Plaster White panel (16px radius, hairline border, `shadow-sm`, 12px padding) with the brand lockup at the top. Below it, residents get a Plaster Sunken "Zgrada" pill with building and unit. Nav items are 40px tall with 12px radius, 13px medium text and 18px icons. At rest the text is Ink Secondary with Ink Muted icons. Hover fills with Plaster Sunken. Active is a Pine Mist fill, Pine Deep 600-weight text and a pine icon. Unread counts are 20px pills, pine when active and stone-200 otherwise. Section eyebrows use the Label style. The upravnik's buildings nest under their complex and expand into an indented sub-nav with a hairline left rule. Transitions run for 140ms.
- **Bottom nav (<768px):** fixed and full width on Plaster Ground with a top hairline. Each item stacks a 20px icon over a 12px label. Active items are Stairwell Pine and inactive ones Ink Secondary. Unread counts are 16px pine pills on the icon, capped at "9+". The last slot, "Nalog", opens the account sheet, which ends with a three-way Sistem / Svetla / Tamna segmented control above Odjava.
- **Account menu (≥1280px):** the user row at the top of the right panel (a flat row with a hover fill, divided from the shortcuts below by a hairline) opens a dropdown with a single "Tema" row above Odjava: a SunMoon icon and label on the left, a compact icon-only segmented radio (Monitor / Sun / Moon, each with an `aria-label` and tooltip) on the right. Same visual as the mobile segmented control: `bg-muted` track, checked segment on `bg-card` with `shadow-xs`.

### Brand Lockup
The pine building tile (34px) sits beside a two-line wordmark: "PROFESIONALNI" as an 11px uppercase eyebrow in Ink Muted, and "Upravnik" in 17px bold with −0.02em tracking in Ink.

### Loader
`<Loader />` (`components/ui/loader.tsx`, styles in `globals.css`) draws four rounded bars, one in each content-type hue (pine, violet, sky and amber at the 500 step and 80% alpha). They slide apart and weave into a "#" every 2s, rotated 165°. It is decorative, so the wrapper carries `role="status"` and the text.
- **When to use it:** only for waits that have no layout to hold yet: the app-boot auth check (40px, with a 12px muted "Učitavanje…" below it, wrapped in `.loader-reveal` so it fades in after 400ms and fast loads never flash) and pending primary buttons (16px, `tone="current"`, beside the pending label). When the layout is known, page content uses `Skeleton`.
- **Reduced motion:** the bars hold still in the woven "#".

## Do's and Don'ts

### Do:
- **Do** colour every new surface through semantic aliases (`--surface`, `--text`, `--border`, `--brand*`, `--type-*`, status tokens) or the system ramps. Both are re-pointed by `.dark`, while Tailwind's default palettes and literal colours are not.
- **Do** check new pages in both themes.
- **Do** use the content-type trio (wash, text, edge) whenever announcements, forum, chat or documents appear, including in new places such as notifications and search results.
- **Do** set timestamps and counts in JetBrains Mono at 12px.
- **Do** use stone-tinted two-layer shadows from the shared scale (`shadow-xs` … `shadow-xl`). Rest at xs/sm, rise to md on hover, and float overlays at lg/xl.
- **Do** keep page titles at one 1.5rem semibold headline with −0.025em tracking.
- **Do** keep controls at 12px radius, cards and dialogs at 20px, and chips and counts as full pills.

### Don't:
- **Don't** use Tailwind's default `emerald`, `blue`, `gray` or `slate` palettes, or any step a ramp doesn't define (such as `red-50`). They don't theme.
- **Don't** colour announcements purple. Announcements are Stairwell Pine.
- **Don't** hard-code `text-white` or `#fff` on pine. Use `text-primary-foreground` / `--on-brand`, which turns dark in the dark theme.
- **Don't** copy chip maps into pages. Add to `lib/chips.ts`.
- **Don't** fill a content-type colour as a solid block, and don't borrow type hues for decoration.
- **Don't** make a static container rise on hover, or use neutral black (in light) or coloured shadows.
- **Don't** introduce extra display sizes, condensed fonts or mono text for words on app screens.
