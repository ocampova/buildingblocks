---
name: Obra
description: Construction expenses by stage, petty cash and partner accounts, where every amount carries the colour of whoever paid it.
colors:
  brand: "#173a6e"
  brand-strong: "#0f2a52"
  brand-soft: "#e3eaf5"
  note-0: "#17704c"
  note-0-soft: "#dcefe6"
  note-1: "#8f5c0a"
  note-1-soft: "#f5e8d2"
  note-2: "#b0302b"
  note-2-soft: "#f6dedc"
  note-3: "#2559a3"
  note-3-soft: "#dde7f6"
  note-4: "#a8460f"
  note-4-soft: "#f6e2d6"
  caja: "#5f4596"
  caja-soft: "#e8e1f3"
  ground: "#f5f4f0"
  surface: "#ffffff"
  sunken: "#ecebe5"
  line: "#dddcd4"
  line-strong: "#c3c2b8"
  ink: "#14201c"
  ink-2: "#4d5550"
  ink-3: "#5f6661"
  danger: "#b42318"
  danger-soft: "#fbe4e1"
  warn: "#8a5800"
  warn-soft: "#fbeccb"
  ok: "#0b6870"
  ok-soft: "#d8eef0"
typography:
  display:
    fontFamily: "Archivo, Geist, ui-sans-serif, sans-serif"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\", \"lnum\""
    fontVariation: "\"wdth\" 118"
  figure:
    fontFamily: "Archivo, Geist, ui-sans-serif, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\", \"lnum\""
    fontVariation: "\"wdth\" 118"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"ss01\", \"cv11\""
  row-amount:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15.5px"
    fontWeight: 600
    lineHeight: 1.375
    fontFeature: "\"tnum\""
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
  meta:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  tab:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11.5px"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  control: "10px"
  card: "14px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  2xl: "32px"
  rail-gutter: "40px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.brand-strong}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.sunken}"
  button-ghost:
    textColor: "{colors.brand}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.brand-soft}"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.danger}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-danger-hover:
    backgroundColor: "{colors.danger-soft}"
  register-fab:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    size: "60px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "48px"
  input-amount:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 14px 0 40px"
    height: "64px"
  payer-chip:
    backgroundColor: "{colors.note-0}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    size: "36px"
  payer-chip-caja:
    backgroundColor: "{colors.caja}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    size: "36px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
  netting-card:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px"
  caja-pill:
    backgroundColor: "{colors.caja-soft}"
    textColor: "{colors.caja}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "36px"
  stage-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  stage-chip-selected:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
  nav-rail-item:
    textColor: "{colors.ink-2}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  nav-rail-item-active:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand-strong}"
  tab-item:
    textColor: "{colors.ink-3}"
    typography: "{typography.tab}"
    height: "60px"
  tab-item-active:
    textColor: "{colors.brand}"
  badge-warn:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
---

# Design System: Obra

## Overview

**Creative North Star: "The Colón Note"**

Money in Obra is always somebody's money. The system borrows the one trick Costa Rican banknotes teach everyone: a note's colour tells you its value before you read the number. Here each source of money (each partner, the petty cash) owns a banknote colour, and that colour follows every colón it put in: the payer chip on an expense row, the segment of the contribution bar, the caja balance pill. Everything else in the interface stays quiet, paper-white and ink, so the source colours are the only colour that means anything.

The ground is a warm paper white built for outdoor sun at a hardware-store counter, with near-black ink and a single deep navy (the blue of the ₡10.000 note) for the shell and the primary action. Density is relaxed and phone-first: large tap targets (44px minimum, 48px for fields, 60px for the tab bar), one row anatomy for expenses at every width, amounts always the heaviest thing on a row. Large figures are set in wide Archivo, firm and engraved-feeling like a printed denomination; all UI text is Geist. The only ornament is a fine guilloche line pattern, and it lives on exactly one card.

It refuses the fintech default: grey cards with one brand accent and anonymous totals. It also refuses to feel like accounting software: no ledgers-as-tables, no column grids of debits and credits; a sentence ("Tu hermano te debe ₡1.000.000") says who owes whom.

**Key Characteristics:**
- Source colours (banknote family) encode only who paid, never status or category.
- One navy brand for structure and the primary action; it belongs to nobody.
- Warm paper ground, white surfaces, hairline borders, soft ambient shadows only where something is raised.
- Tabular figures for every amount; big amounts in wide Archivo.
- One signature: the contribution bar, a horizontal bar split by source colour.
- Guilloche appears only on the netting card.

## Colors

A quiet paper-and-ink neutral world carrying one navy structural colour and a small family of banknote source colours that mean only "who paid".

### Primary
- **Ten-Thousand Navy** (brand): the shell and the primary action. Primary buttons, the raised "Registrar" action, the stage chip once chosen, focus rings, caret, active tab and rail item. Chosen over green so it cannot be read as any partner's colour.
- **Deep Note Navy** (brand-strong): hover and pressed state of navy actions; the headline amount on the netting card; active rail-item text.
- **Navy Wash** (brand-soft): the netting card tint (at about 55% over white), active rail-item background, ghost-button hover, text selection. The netting card is navy-tinted because it belongs to both partners, not to either.

### Secondary
The banknote source family. Each partner is assigned the next free slot in order; white text on each fill reaches at least 5:1. Each has a soft companion used only behind the same source (selected payer choice, tinted context).
- **Colón Green** (note-0 / note-0-soft): first partner.
- **Ochre Note** (note-1 / note-1-soft): second partner.
- **Note Red** (note-2 / note-2-soft), **Note Blue** (note-3 / note-3-soft), **Note Orange** (note-4 / note-4-soft): slots for a third to fifth partner on other projects.

### Tertiary
- **Caja Violet** (caja / caja-soft): the shared petty-cash account. Its chip reads "CC"; its balance pill sits in the top bar; its segment appears in per-stage bars.

### Neutral
- **Sun Paper** (ground): page background everywhere; also the ring that separates the raised register button from the tab bar.
- **White Sheet** (surface): cards, inputs, nav rail, top bar and tab bar (bars at 95% with backdrop blur).
- **Pressed Paper** (sunken): empty track of every bar, hover wash on rows (at 60%), selected neutral choice, neutral badge, disabled fields.
- **Hairline** (line): card borders and row dividers.
- **Firm Line** (line-strong): input and secondary-button borders, dashed empty states, the "Por pagar" (unpaid) segment in stage bars, scrollbar thumb.
- **Ink** (ink): primary text, selected choice border, the fair-share notch on the contribution bar, stage-total bars (at 70%).
- **Ink Two** (ink-2): secondary text, sentence leads, nav items at rest.
- **Ink Three** (ink-3): meta lines, hints, placeholders, inactive tabs.

### Status
- **Overdue Red** (danger / danger-soft): overdue dues, over-budget, destructive buttons, field errors.
- **Due Amber** (warn / warn-soft): amounts still owed ("Debe …"), dates about to fall due, petty cash under its minimum (the caja pill and card switch from violet to amber).

### Named Rules
**The Whose Money Rule.** Status colours never borrow a source colour: ok is its own teal (#0b6870), not partner green. A source colour (note-0 to note-4, caja) appears only where it identifies who paid: payer chip, contribution-bar segment, a source's soft tint, a source legend dot. Status, progress and category use ink tones or the status colours, never a source colour.

**The Nobody's Navy Rule.** Navy is structure and action, never a payer. Anything that belongs to both partners (the netting card, the shell) is navy-toned, not partner-toned.

## Typography

**Display Font:** Archivo at wide stretch (118%), with Geist as fallback
**Body Font:** Geist (with ui-sans-serif, system-ui)

**Character:** Geist is plain, sun-legible and numeric-friendly; wide Archivo gives large amounts the firm, broad stance of a printed denomination. The pairing is used strictly by role: Archivo only for amounts that stand alone, Geist for everything else, including row amounts.

### Hierarchy
- **Display** (Archivo wide 600, 40px rising to 46px on desktop, line-height 1): the headline amount of a screen: the netting sentence's amount, an expense's total, "Llevan gastado" in resumen (38/44px), caja balance in cuentas (34px).
- **Figure** (Archivo wide 600, 24px, line-height 1): secondary standalone amounts (caja card balance; partner contributions at 15.5px under the bar; inline totals in sentences).
- **Headline** (Geist 600, 26px rising to 30px, tight, -0.02em, balanced wrap): page titles.
- **Title** (Geist 600, 17px, -0.01em): section titles ("Últimos gastos", "Por etapa", "Por vencer").
- **Body** (Geist 400, 15px, line-height 1.5; 14.5px in notices and empty states, max 42ch): running text and descriptions.
- **Row amount** (Geist 600, 15.5px, tabular): amounts and descriptions in list rows; the amount is the right-aligned anchor.
- **Label** (Geist 600, 14px): field labels and fieldset legends ("¿Quién pagó?", "Etapa"), button text at 15px.
- **Meta** (Geist 400, 13px, ink-3): stage and payer line under a row, hints, relative dates. Due/owed states turn it 600 in warn or danger.
- **Tab** (Geist 600, 11.5px): bottom tab labels under 22px icons.

### Named Rules
**The Tabular Everywhere Rule.** Every amount uses tabular, lining figures, in Archivo or Geist; numeric inputs too. Columns of colones must align by digit.

**The Heaviest Number Rule.** On any row or card, the amount is the largest or heaviest type present. Labels never outweigh the money.

**The Sentence Not Ledger Rule.** Balances are read as a sentence lead in ink-2 over a display amount, not as labelled table cells.

## Layout

Mobile first, single column at a 16px gutter inside a 576px max width, with a sticky 56px top bar (project name and the caja balance pill) and a fixed bottom tab bar (Inicio, Gastos, centre "Registrar", Cuentas, Resumen) that respects the safe-area inset. Content is padded 128px at the bottom to clear it. The tab bar hides while an expense is being registered.

From the large breakpoint (1024px) the shell becomes a 256px left rail (project name, a full-width "Registrar gasto" button, nav, Ajustes and user at the foot) and content widens to 1152px with a 40px gutter. Inicio becomes two columns: main column (netting card, recent expenses) and a 360px aside (caja card, due soon, spend by stage). Forms and detail screens centre in 672 to 768px. The expense list keeps the same row anatomy at every width: payer chip, description over stage-and-payer meta, amount over date or owed state.

Rhythm: 24px between blocks (32px on desktop), 32px above a section title, 20px card padding (24px for the netting card on desktop), 16px horizontal and 14px vertical row padding, 8 to 12px gaps between choices.

## Elevation & Depth

Mostly flat with tonal layering: white sheets with hairline borders on a warm paper ground, and sunken paper for tracks and hover. Shadows are ambient and rare, reserved for things that are raised by role: the primary action, the netting card, the auth card. The raised register button uses a stronger navy-tinted float shadow and a ground-coloured ring that cuts it out of the tab bar.

### Shadow Vocabulary
- **Raise** (`box-shadow: 0 1px 2px rgb(20 32 28 / 0.06), 0 4px 12px rgb(20 32 28 / 0.06)`): primary buttons, the netting card, the auth card, small floating remove controls on thumbnails.
- **Float** (`box-shadow: 0 6px 16px rgb(15 42 82 / 0.22), 0 2px 4px rgb(15 42 82 / 0.16)`): the raised "Registrar" action in the mobile tab bar only.

### Named Rules
**The Raised By Role Rule.** Plain cards and rows have a border and no shadow. A shadow means "this is the action" or "this is the account between you".

## Shapes

Gently rounded, never sharp and never bubbly. Controls (buttons, inputs, nav items, notices) take 10px; cards and empty states take 14px; anything that identifies a person or a choice among peers is a full circle or pill: payer chips, the caja pill, stage chips, badges, the register button, every bar and its track. Borders are 1px hairlines; empty states and an expense with no payer use a dashed Firm Line. Bars are rounded tracks with segments butted together, separated by a 2px white seam.

## Components

### Buttons
Firm and plain; the navy one is the only loud control on a screen.
- **Shape:** gently curved (10px), minimum height 44px, 16px side padding, 15px semibold label, icon gap 8px.
- **Primary:** navy fill, white text, Raise shadow. Hover deepens to Deep Note Navy; press drops 1px.
- **Secondary:** white with a Firm Line border, ink text; hover darkens the border to ink-3 and washes with sunken.
- **Ghost:** navy text, no fill; hover gets the Navy Wash.
- **Danger:** white with a danger border at 40% and danger text; hover fills danger-soft.
- **Disabled:** 55% opacity, no pointer events.
- **Focus:** global 2.5px navy outline, 2px offset.

### Register Action
The one big action. On mobile a 60px navy circle with a plus, raised 20px above the tab bar with the Float shadow and a 4px Sun Paper ring; it scales to 95% on press. On desktop a full-width 48px navy button "Registrar gasto" at the top of the rail.

### Payer Chip
The atom of the world: the payer's initials in white semibold on their banknote colour, in a full circle (28, 36 or 44px). Petty cash reads "CC" in violet. A split payment shows two 24px overlapping dots ringed in white; an unpaid expense shows a dashed empty circle.

### Contribution Bar (signature)
A 14px rounded track in sunken paper, split into segments by source colour, each segment's width the share of money that source put in, seams 2px white. A 2px ink notch, overhanging the bar by 4px each side, marks where the fair split (each partner's percentage) falls, so who is ahead reads at a glance. The same split appears per stage in resumen at 10px, adding caja violet and a Firm Line segment for what is still unpaid, with a dot legend below. Segments grow once from the left on load (240ms, ease-out expo, staggered 90ms); reduced motion shows them static.

### Netting Card
The account between the partners. Navy Wash tint over white with a navy hairline at 15%, 14px corners, Raise shadow, and the guilloche: fine navy wave lines at 14% opacity on a 240 by 64px tile. A sentence lead in ink-2 ("… le debe a usted") over a display amount in Deep Note Navy; then the contribution bar with each partner's chip, name, percentage and contributed figure; then the primary "Emparejar cuentas" button.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** White Sheet on Sun Paper.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1px Hairline; lists inside use Hairline dividers.
- **Internal Padding:** 20px, or rows at 16 by 14px.
- **Caja card:** violet-soft fill with a violet border at 20% (40% on hover), large caja chip, label, and the balance in Figure type; switches to warn-soft and amber when under the minimum.

### Inputs / Fields
- **Style:** white, 1px Firm Line border, 10px corners, 48px tall, 14px padding, 16px text (no zoom on iOS), ink-3 placeholder; selects carry an inline chevron.
- **Focus:** border turns navy with a 3px navy ring at 15%.
- **Amount field:** 64px tall, 30px semibold tabular figures with a "₡" prefix set inside at 26px in ink-3.
- **Label / hint / error:** 14px semibold label above, 13px ink-3 hint below, 13px danger error replacing the hint.
- **Disabled:** sunken fill.

### Choice Buttons and Chips
- **Payer choice:** 48px tiles in a two- or three-column grid, each with the payer chip and first name. Selected: ink border plus a 2px ink ring, filled with that payer's soft tint (or sunken for "Mitad y mitad").
- **Stage chip:** 44px pill, white with Firm Line border; selected fills navy with white text.
- **Badge:** 12.5px semibold pill on a soft status tint (neutral, warn, danger, brand).

### Navigation
- **Mobile:** sticky top bar (white at 95%, blurred, hairline bottom) with the project name, the caja pill (violet, or amber when low) and a settings button. Fixed bottom tab bar, 60px items with a 22px icon over an 11.5px label; ink-3 at rest, navy when active with a heavier icon stroke.
- **Desktop rail:** 256px white rail with a hairline right border; 44px items with 19px icons, ink-2 at rest, sunken on hover, Navy Wash and Deep Note Navy when current.

### Notices and Empty States
Notices are 10px rounded soft-tint boxes with a matching border at 20 to 25% and 14.5px medium text. Empty states are dashed Firm Line cards with a 16px semibold title, a short line of help and one action.

## Do's and Don'ts

### Do:
- **Do** give every amount tabular figures, and set any amount that stands alone in wide Archivo (Display or Figure).
- **Do** tag every expense row with its payer chip, in the same anatomy on phone and desktop.
- **Do** keep source colours to payer chips, contribution-bar segments, their soft tints and legend dots.
- **Do** use navy for the one primary action per screen and for anything that belongs to both partners.
- **Do** use ink tones (ink at 70% on a sunken track) for bars that show progress or totals rather than who paid.
- **Do** keep tap targets at 44px or more (48px for fields and payer choices, 60px for tabs).
- **Do** state balances as a sentence over a display amount.
- **Do** let bars grow once on load at 240ms ease-out expo and stay still under reduced motion.

### Don't:
- **Don't** use a partner's or the caja's colour for status, category, charts of totals, or decoration.
- **Don't** give the shell, the netting card or the primary action a partner colour.
- **Don't** place guilloche anywhere but the netting card.
- **Don't** render the expense list as a table on desktop.
- **Don't** put a shadow on ordinary cards or rows.
- **Don't** let a label or title outweigh the amount on the same row.
