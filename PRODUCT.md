# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Next.js (App Router, TypeScript) + PostgreSQL (Prisma), Tailwind, deployed on Railway. Installable as a PWA. Files (photos, PDFs, XML) in a Railway bucket. Claude API (Anthropic) to read receipts, material lists and quotes. Same base as the user's Escuela project. Confirmed by the user.

## Users
- **Socios (two brothers)**, owners of the project, sharing every cost 50/50. On phone and computer, in short sessions. Job: know how much has been spent per stage, what is still owed, and who has put in what.
- **Administración (one brother's wife)**, the main day-to-day user, mostly on her phone, at hardware stores and on site. Job: quote the builder's material requests, buy, and record every expense and payment with its receipt. She is not a partner and has no balance of her own.
- **Constructor (the builder)**, contracted for labor only, on his phone at the site. Job: request materials with quantities, expected quality and the date he needs them, and confirm when they arrive.

## Product Purpose
A simple tool for an owner-managed construction in Costa Rica: the owners contract labor, and buy materials themselves from the builder's lists. It keeps every expense by stage with its receipt, compares quotes for each material request, and nets the partners' contributions, including a shared petty-cash account. Success: every expense is recorded within a minute of paying it; materials are bought before the builder needs them; at any moment the partners know what has been spent, what is owed, and who owes whom.

## Positioning
Built first for one real project (an apartment building owned by two brothers), modeled so other constructions that work the same way can use it later: owners who contract labor and buy materials directly. Deliberately small: "what we need, no more, no less". Not a construction ERP, not an accounting system.

## Operating Context
- Costa Rica, Spanish only, colones (CRC). Some quotes may come in USD, converted at the Banco Central exchange rate of the day.
- Many expenses have no electronic invoice (earthworks by the hour, truckloads, labor, cash purchases). Electronic invoices from Hacienda (XML) are imported when available; everything else is a photo of a receipt, a note, or a SINPE/transfer screenshot.
- Project costs outside the construction itself also live here, in a "Gastos generales" stage: CCSS contributions on labor, INS work-risk policy, municipal and CFIA permits, utility hookups, and the land and architect already paid.
- Quotes and lists usually arrive by WhatsApp, as photos or PDFs.
- Loans (from family or employers) are out of scope: the tool only records which partner put the money in.
- Detailed plan: `docs/PLAN.md`.

## Capabilities and Constraints
Phase 1: projects and roles, stages, expenses with receipts and payments (direct or from petty cash), partner netting with suggested petty-cash top-ups, summary by stage, historic expenses (land, architect), AI reading of receipt photos and Hacienda XML import.
Phase 2: builder material requests with a needed-by date, quotes per request, AI side-by-side comparison (price, missing lines, brand and quality vs. requested), choice and purchase, delivery confirmation.
Later: due-date reminders (CCSS), WhatsApp share, Excel export, AI supplier search.
Multi-project from day one (memberships, per-partner percentages, configurable stages), but no public sign-up or billing yet.
Undecided: product name ("Obra" is provisional); how the builder is paid (weekly, per progress, per stage); how CCSS is calculated for this project.

## Brand Commitments
- Name: **Obra** (provisional; the user will pick a final name later).
- No logo or colors yet.

## Evidence on Hand
Conversation with the user only. No real expenses, lists or quotes yet; demo data must be clearly fictional.

## Product Principles
1. Recording an expense takes under a minute: a photo, the amount, who paid, the stage.
2. Nothing without a receipt: every payment carries a photo, an XML, or a screenshot; missing ones are flagged, not blocked.
3. AI prepares and points out, people decide: nothing is recorded or chosen without a person confirming it.
4. Money between partners is always clear: the balance is computed from what was actually paid, never from invoices still pending.
5. Small on purpose: if a feature adds administration without solving a real problem for the three users, it stays out.

## Accessibility & Inclusion
Users of different ages and tech comfort; used outdoors on a phone at a construction site. Large tap targets, legible text, WCAG AA contrast, fast on mid-range Android phones and weak mobile data.
