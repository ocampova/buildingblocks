---
version: 1
slug: "src-app"
primary_target: "src/app"
related_targets: []
---

# Surface: Obra app (src/app)

Scope: the whole phase 1 app (inicio, gastos, registrar gasto, cuentas entre socios, caja chica, resumen, login). Mode: Operate.
Audience: two partner brothers and the administradora (sister-in-law), on phones outdoors in Costa Rican sun, at hardware-store counters and on site; partners also review on a computer. Job: record an expense in under a minute, know who owes whom, know spend per stage.
Constraints: Spanish (Costa Rica), colones, mobile first PWA, large tap targets, must not feel like accounting software, must not look like a generic finance template.

## Direction contract

THESIS: Money in Obra is always somebody's money. Every amount carries the colour of who put it in (each partner, the petty cash), the way a colón note's colour tells you its value before you read it. Refuses the category default: grey fintech cards with one brand accent and anonymous totals.

OWN-WORLD: Light, sun-readable ground of warm-neutral paper white (#f5f4f0); ink near-black text. A small family of banknote-derived source colours (partner A green, partner B ochre/amber, caja violet), used as a payer chip (initial in a filled circle), the contribution bar segments and the netting card tint; one deep navy brand (the ₡10.000 note blue, #173a6e) for the shell and primary action. AMENDED from the original deep green: green is partner A's source colour, and a green shell would blur the rule that source colours mean only who paid. The netting card is tinted brand-soft for the same reason: it belongs to both partners, not to either one. Fine guilloche line pattern (SVG) only on the netting card. Tabular figures for every amount; amounts are the largest type on any row. Large amounts are set in wide Archivo (font-stretch 118%), a firm banknote-like numeral; UI text in Geist. Source colours never encode anything but the payer (status bars use ink tones).

STORY: Opening the app, a partner reads one sentence: who owes whom and how much, then the petty-cash balance, then the latest expenses each tagged by payer colour, then anything about to fall due. One big action registers an expense: photo, amount, who paid, stage.

FIRST VIEWPORT: Top bar with project name and caja balance pill. Netting card (guilloche, source-colour split bar showing each partner's share of contributions, sentence "Tu hermano te debe ₡1.000.000", button Emparejar). Below, recent expenses list with payer chip, description, stage, amount. Fixed bottom tab bar (Inicio, Gastos, Cuentas, Resumen) with a raised primary "Registrar" action. Desktop: left rail nav, netting card beside an aside with caja, due-soon and spend by stage; the expense list keeps the same row anatomy as mobile (AMENDED from 'list as a table': one row anatomy across sizes keeps the payer chip and amount where people learned them).

FORM: grounded candidate 4 of 7 (Costa Rican colón banknotes); seed:358d4aaef28d2c8c. Roll ran degraded (no challengers).

SIGNATURE: the contribution bar, a horizontal bar split by source colour, reused on inicio, cuentas and per stage in resumen. Motion: bar segments grow on load once (240ms, ease-out expo), reduced motion respected.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
