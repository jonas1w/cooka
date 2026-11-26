# cooka v1 — milestone plan

How cooka v1 gets built: six milestones, each turned into one spec and a set of tickets by its own session. The *why* lives in the ADRs (`docs/adr/`), the words in `CONTEXT.md`, the behaviour in the closed tickets of the [wayfinder map](https://github.com/jonas1w/cooka/issues/1). This file only says **what to build in which order, what to read first, and how to test it**. It never restates a decision; it points at it.

## How to build a milestone

0. **Once, before M1:** run `/setup-matt-pocock-skills` (GitHub tracker, `ready-for-agent` label, `docs/agents/`).
1. **Load the milestone's reading list** below — ADRs, closed tickets (resolution comments), research docs, prototype branches — plus `CONTEXT.md` and this file.
2. **`/to-spec`** → one spec issue for the milestone. Derive the data model, screens, routes and settings for this milestone from the reading list and record them as Implementation Decisions. Confirm the [seams](#testing-seams) rather than re-inventing them. Attach the issue to the milestone's GitHub Milestone.
3. **`/to-tickets`** → vertical tracer-bullet slices with native blocking, attached to the same GitHub Milestone.
4. **`/implement`** one slice per fresh session, `/tdd` at the seams.

Milestones run in order; a milestone's spec may start when the previous milestone's slices are done.

## Releases

- **First usable release = M1 + M2** — label → scan → consume with real printed labels. The household runs it from here.
- **Public v1.0 = M1 – M6.**
- **Distribution** ([ADR 0016](adr/0016-agpl-ghcr-semver.md)): AGPL-3.0; one multi-arch image (amd64, arm64) on GitHub Container Registry; semver tags `1.2.3`, `1.2`, `1`, `latest`. Major = a break of the [stable surface](adr/0015-stable-surface-nothing-public.md) or a schema change that cannot be restored backwards. CI (tests + i18n catalog check) from M1; release workflow in M6.

## Milestones

### M1 — Freezer core

Labelling in **no-printer mode** (implicit Foods, fuzzy autocomplete, labelled together, label numbers with era letter), the Freezer stock list, the unit page, the scanner (camera + numpad, Undo, same-digits pick, not found, past best-before asks, past use-by never consumed), consume / opened / discard (with discard-reason mode) / restore, stock history, merge, Locations (invisible while there is one). **The first tracer bullet carries the groundwork:** Go binary with embedded SPA, migrations, HTTPS-only gate (proxy and attached-cert mode), event stream, mode row shell with the top status line and gear, i18n catalog plumbing (English only), CI.

Decided in this plan (not yet in a ticket):

- **Stock history events:** labelled · consumed · discarded · restored · opened · reprinted · edited. A merge is an `edited` event on each moved unit (field: Food). Each event keeps the label number and Food name as they were, the time, and a discard reason where one applies. "Undo" is the UI word; `restored` is recorded. The vocabulary is effectively frozen once M1 ships (history CSV is stable surface).
- **"Taken out" shows the remaining count** of the same Food (opened included): "Taken out · Chili con carne · 2 left"; at zero "· none left", plus "· on shopping list" once restock exists (M3).
- **Freezer stock list:** one row per Food ("Chili con carne · 3 · earliest 12.03.26"), groups ordered by their earliest date; expanding shows its units, opened first, then by date. Two colours only — red past use-by, amber past best-before; no "expiring soon" tier. A search box (Food name or label number) on top; no filters. Location appears as a sub-heading only once there is more than one.

Reading list:

- ADRs: [0001](adr/0001-home-first-commercial-tolerant.md), [0002](adr/0002-implicit-foods-snapshot-units.md), [0003](adr/0003-label-number-scheme.md), [0004](adr/0004-scan-opens-scanner-consumes.md), [0007](adr/0007-plain-go-stdlib-sqlite-no-backend-framework.md), [0008](adr/0008-solid-spa-mandatory-https.md), [0010](adr/0010-https-via-proxy-or-attached-cert.md), [0011](adr/0011-fixed-mode-row-cooking-at-the-centre.md), [0012](adr/0012-in-app-settings-env-locks-byo-ai.md) (settings shape, gear, food defaults), [0014](adr/0014-one-instance-language-separate-formats.md) (catalog and date-pattern plumbing)
- Tickets: [Audience](https://github.com/jonas1w/cooka/issues/2), [Core domain model](https://github.com/jonas1w/cooka/issues/8), [Scan & consume semantics](https://github.com/jonas1w/cooka/issues/9), [Backend foundation decision](https://github.com/jonas1w/cooka/issues/13), [Frontend stack & offline/PWA](https://github.com/jonas1w/cooka/issues/14), [HTTPS provisioning](https://github.com/jonas1w/cooka/issues/17), [Wet-hands UX](https://github.com/jonas1w/cooka/issues/18), [Configuration & settings](https://github.com/jonas1w/cooka/issues/20), [Language & locale](https://github.com/jonas1w/cooka/issues/22)
- Research: `docs/research/backend-foundation.md`, `docs/research/haccp-label-contents.md`, `docs/research/grocy-mealie-friction.md`
- Prototype: branch `prototype/wet-hands-ux` (`prototype/wethands`)

### M2 — Label printing

The bitmap renderer with the three label presets (60×40, 57×32, 2"×2") at 203/300 dpi, the ZPL driver over raw TCP (units first, then one connection for all labelled together), printer discovery (mDNS, /24 sweep, manual IP) and binding by serial, test label / offset / darkness, reprint, base URL confirmation before the first print, printed hosts, next label number (raise-only), label captions and date pattern on labels. No-printer mode stays the default until a printer is bound.

Reading list:

- ADRs: [0003](adr/0003-label-number-scheme.md), [0004](adr/0004-scan-opens-scanner-consumes.md) (QR URL), [0005](adr/0005-render-bitmaps-thin-printer-encoders.md), [0010](adr/0010-https-via-proxy-or-attached-cert.md) (base URL), [0012](adr/0012-in-app-settings-env-locks-byo-ai.md) (printer setup, next label number), [0014](adr/0014-one-instance-language-separate-formats.md) (captions, date pattern)
- Tickets: [Printing architecture & label layout](https://github.com/jonas1w/cooka/issues/10), [Label preset layouts](https://github.com/jonas1w/cooka/issues/16), [Configuration & settings](https://github.com/jonas1w/cooka/issues/20), [HTTPS provisioning](https://github.com/jonas1w/cooka/issues/17), [Language & locale](https://github.com/jonas1w/cooka/issues/22)
- Research: `docs/research/label-printers.md`, `docs/research/haccp-label-contents.md`
- Prototype: branch `prototype/label-preset-layouts` (`prototype/labelpreset`)

### M3 — Shopping list

The one shopping list with free-text entries (optionally linked to a Food), add-box-as-search, check-off into Done, "Clear done" and ~24 h auto-clear, the offline write queue (client ids, idempotent PUTs, absolute patches, check-off guard, "not sent yet"), restock per Food (added on last consume, removed on restore while open), share-as-text, and the documented add endpoint (stable surface).

Reading list:

- ADRs: [0006](adr/0006-own-shopping-list-no-sync.md), [0007](adr/0007-plain-go-stdlib-sqlite-no-backend-framework.md) (offline writes), [0008](adr/0008-solid-spa-mandatory-https.md) (offline queue, client updates), [0015](adr/0015-stable-surface-nothing-public.md)
- Tickets: [Shopping list & integrations](https://github.com/jonas1w/cooka/issues/12), [Backend foundation decision](https://github.com/jonas1w/cooka/issues/13), [Frontend stack & offline/PWA](https://github.com/jonas1w/cooka/issues/14), [Wet-hands UX](https://github.com/jonas1w/cooka/issues/18), [Getting recipes into macro trackers](https://github.com/jonas1w/cooka/issues/23)
- Research: `docs/research/grocy-mealie-friction.md`

### M4 — Recipes & cooking

Recipe import without AI (JSON-LD → text split → OpenGraph stub; plain fetch, paste-anything, PWA share target, bookmarklet; Instagram / YouTube Shorts captions), deterministic cleanup, per-serving nutrition rules, one stored image, source-URL duplicate check, import hints; recipe view and edit; cooking mode and the cooking session (step snapping, tap-anywhere next, number-only scaling, detected timers, wake lock, Back-to-cooking bar, take-out and list panels); recipe → shopping list (untick sheet); **Freeze portions** prefilling labelling (recipe-linked Food, servings per unit, macros); multilingual timer / ingredient / yield detection.

Reading list:

- ADRs: [0009](adr/0009-recipe-import-chain-ai-fallback.md), [0011](adr/0011-fixed-mode-row-cooking-at-the-centre.md), [0014](adr/0014-one-instance-language-separate-formats.md) (recipe language)
- Tickets: [Recipe import strategy](https://github.com/jonas1w/cooka/issues/15), [Fetching Instagram & YouTube Shorts captions without login](https://github.com/jonas1w/cooka/issues/19), [Cooking mode & cook-to-freeze handover](https://github.com/jonas1w/cooka/issues/11), [Wet-hands UX](https://github.com/jonas1w/cooka/issues/18), [Shopping list & integrations](https://github.com/jonas1w/cooka/issues/12), [Language & locale](https://github.com/jonas1w/cooka/issues/22)
- Research: `docs/research/recipe-import-go.md`, `docs/research/ig-yt-caption-fetching.md`
- Prototype: branch `prototype/wet-hands-ux`

### M5 — AI fallback

Bring-your-own provider settings (OpenAI, Anthropic, Gemini, any OpenAI-compatible base URL; free-text model; write-only key; `COOKA_AI_API_KEY` lock), the Test action (text, opt-in image/audio, provider's own error, key masked), the AI step in the import chain (only when JSON-LD yields nothing; fixed schema; never invents; keeps wording; hint "structured by AI"), capability-gated features, and the optional Gemini YouTube-link path for spoken-only Shorts.

Reading list:

- ADRs: [0009](adr/0009-recipe-import-chain-ai-fallback.md), [0012](adr/0012-in-app-settings-env-locks-byo-ai.md)
- Tickets: [Recipe import strategy](https://github.com/jonas1w/cooka/issues/15), [Configuration & settings](https://github.com/jonas1w/cooka/issues/20), [Transcribing spoken-only short-video recipes in a Go container](https://github.com/jonas1w/cooka/issues/24)
- Research: `docs/research/video-transcription.md`, `docs/research/recipe-import-go.md`

### M6 — Operations & release

Backups (nightly and pre-migration zips, fixed retention, download, failed-backup notice), restore a backup (before-restore backup, schema guard, label counter and base URLs carried forward), exports (history CSV, stock CSV, recipe JSON-LD zip), German catalog complete, display formats complete (date pattern editor with preview, separators, kcal/kJ, g/oz), remaining settings sections and locks, System info (version, update state, HTTPS mode, certificate expiry, base URL, printed hosts, last backup), `compose.yaml` proxy recipes and docs, the release workflow and image.

Reading list:

- ADRs: [0010](adr/0010-https-via-proxy-or-attached-cert.md), [0012](adr/0012-in-app-settings-env-locks-byo-ai.md), [0013](adr/0013-backups-zip-snapshots-label-counter-carried.md), [0014](adr/0014-one-instance-language-separate-formats.md), [0015](adr/0015-stable-surface-nothing-public.md), [0016](adr/0016-agpl-ghcr-semver.md)
- Tickets: [Backup, restore & data export](https://github.com/jonas1w/cooka/issues/21), [Configuration & settings](https://github.com/jonas1w/cooka/issues/20), [Language & locale](https://github.com/jonas1w/cooka/issues/22), [Getting recipes into macro trackers](https://github.com/jonas1w/cooka/issues/23), [HTTPS provisioning](https://github.com/jonas1w/cooka/issues/17)

## Cross-milestone contracts

- **M1 owns the data model.** Later milestones only add tables and columns (Recipe, shopping-list entries, settings). M1 already leaves room for Food → Recipe and for Location kinds.
- **i18n from day one.** Catalog keys and display-format plumbing start in M1 (English only); German is completed in M6. No user-facing string bypasses the catalog.
- **Settings arrive with the milestone that first needs them**, in their final section names from ADR 0012 (Printer & labels · Food defaults · Recipes & AI · Language · Data · System). M6 completes the rest and the locks.
- **CI from M1:** tests and the i18n catalog check run on every push.

## Testing seams

Decided once for all of v1; each `/to-spec` session confirms them.

1. **The HTTP API (primary).** Go tests start the real server (`httptest`) on a temporary SQLite with a fake clock and drive `/api` as the SPA does. Covers the domain rules: label numbering and era letters, consume / undo / restore, past use-by blocking, stock history, merge, restock, idempotent offline writes, backup / restore and the label counter, export formats.
2. **The label renderer.** Unit details + preset + dpi → 1-bit bitmap, checked by golden images per preset at 203 and 300 dpi; the ZPL encoder against a fake TCP printer that records what it receives.
3. **The import chain.** Saved HTML / caption fixtures → Recipe, behind a fetcher interface (no network in tests); the AI step against a stubbed provider.
4. **The browser, thin.** A few Playwright flows against the real binary for what only exists there: offline shopping-list queue, numpad take-out with Undo, cooking session surviving navigation, "Update ready". The camera is not tested; scanning enters through the numpad path.

Fakes: clock, printer (TCP listener), AI provider (HTTP stub). Nothing else is mocked — no component tests of Solid internals, no SQL-level repository tests.
