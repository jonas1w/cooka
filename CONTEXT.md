# cooka

A self-hosted kitchen app for a household (or small kitchen) that tracks frozen food from label to plate, plus a shopping list and recipes.

## Language

**Freezer label**:
The printed label stuck on a container before freezing; identifies one unit of frozen food and links back to it.
_Avoid_: HACCP label, sticker

**Discard**:
Removing a stock unit from stock without eating it (spoiled, past use-by, quality, or a misprinted label that was never used). Distinct from consuming it.
_Avoid_: Delete, throw away

**Discard reason**:
Why a unit was discarded. Per instance it is required, optional, or disabled (not asked at all).

**Stock history**:
The append-only record of what happened to each stock unit: labelled, consumed, discarded, restored, opened, reprinted, edited (a merge is an edit of the unit's Food). Each event keeps the label number and Food name as they were at that moment. Never edited, never purged; exportable. "Undo" is what people tap; "restored" is what is recorded.
_Avoid_: Audit log, HACCP log

**Instance language**:
The single language an instance uses for its UI and labels. Chosen per instance, not per person; picked from the first browser's language until someone changes it. Imported recipes keep their own language.

**Display format**:
How dates (one pattern for labels and screens, e.g. `DD.MM.YY` or `ddd DD MMM`), numbers (decimal and thousands separators) and macro units (kcal/kJ, g/oz) are shown. Separate settings whose defaults come from the instance language; they never change stored values, and exports ignore them.
_Avoid_: Locale, region

**Food**:
A named thing that gets frozen repeatedly — a cooked dish or a raw good — carrying the defaults used when labelling it (preparation, portion, shelf life, macros). Never created by hand: labelling a new name creates it, later labels reuse it.
_Avoid_: Item, template, Vorlage, product

**Recipe**:
Instructions with ingredients and servings, imported or written. A Food may link to the Recipe it is cooked from — at most one, the one it was last cooked from; raw goods have none.

**Servings**:
How many portions or pieces a Recipe makes — what cooking mode scales and what its macros are given per. 18 cookies are 18 servings. Distinct from a stock unit's portion text, which is derived from the servings frozen into it.
_Avoid_: Portions (for the recipe's yield), yield

**Recipe import**:
Turning a web page, a social-media post or pasted text into a Recipe, through one fixed chain: structured recipe data on the page, then the AI fallback, then a plain text split, then a stub with only title, image and source. Imports are snapshots — the Recipe is the household's own copy from then on, never re-synced.
_Avoid_: Scrape, sync

**Source URL**:
The address a Recipe was imported from, kept on the Recipe. Importing a source URL that is already in cooka offers to open the existing Recipe or import a copy.

**AI fallback**:
An optional, per-instance language model the household brings itself (OpenAI, Anthropic, Gemini, or any OpenAI-compatible endpoint; model chosen freely) that structures an import only when the page has no structured recipe data. It fills a fixed format, leaves anything the source does not state empty — never estimates macros — and keeps the source's wording.
_Avoid_: AI import, smart import

**Import hint**:
A dismissable note on a freshly imported Recipe pointing at what to check — nutrition not imported, structured by AI, no ingredients found. Imports save immediately; hints replace a review step.

**Cooking mode**:
The view for cooking a Recipe: the whole recipe on one page, the current step highlighted with its ingredients beneath it and snapped to the top of the screen, timers and the screen kept awake. Units can be taken out and shopping list entries added from inside it without leaving the recipe. Ends in "Freeze portions", which labels the cooked dish, or "Finished".
_Avoid_: Cook view, step mode

**Cooking session**:
The one Recipe currently being cooked on a device: its step, servings, running timers and the units taken out for it. It survives leaving cooking mode — every other screen offers "Back to cooking" — and ends with "Freeze portions" or "Finished". One at a time; opening another Recipe asks to switch. Nothing about it is stored once it ends: taking a unit out while cooking is an ordinary consume.
_Avoid_: Cook log, cooking history

**Mode**:
One of the four fixed places at the bottom of every screen — Cook (Recipes and cooking mode; where cooka opens), Take out (the scanner), Freezer (stock, unit pages and labelling) and Shopping list. The mode row never changes and there is no home screen.
_Avoid_: Tab, page, home

**Default shelf life**:
The freezer shelf life a newly created Food starts with, set per instance. After that, each Food remembers its own.

**Stock unit**:
One physical container (box, bag) in stock, identified by its freezer label. Keeps its own copy of everything printed on the label; editing its Food never changes it. Belongs to one Food.
_Avoid_: Item, box, entry

**Consume**:
Taking a stock unit out to eat it — done by scanning its label with the scanner, typing its label number there, or tapping Take out on its unit page. Always the whole unit.
_Avoid_: Use, check out

**Opened**:
A stock unit that was partly used and put back. Still in stock; finish it before starting a new one. There is no partial quantity — opened is the only in-between.
_Avoid_: Partial, half

**Restore**:
Putting a consumed or discarded stock unit back in stock, e.g. after a wrong scan. Possible at any time; recorded in the stock history. "Undo" after a scan is a restore. Not the same as restoring a backup.
_Avoid_: Un-delete, revert

**Date meaning**:
Whether a stock unit's date is a best-before (quality hint, food usually still fine after) or a use-by (must not be eaten after). Set per instance as a default; a Food may override it; each stock unit keeps the meaning it was labelled with.

**Past best-before**:
A stock unit whose best-before date has passed. Use it first and check it — not a reason to discard. Scanning one asks "Use it / Discard / Put back" instead of consuming straight away.
_Avoid_: Expired, spoiled, overdue

**Past use-by**:
A stock unit whose use-by date has passed. Must be discarded.
_Avoid_: Expired

**Location**:
Where a stock unit is kept (e.g. kitchen freezer, basement chest freezer). Every instance has at least one; while there is only one, it stays invisible. Each location has a kind — in v1 only freezer.
_Avoid_: Storage, place, compartment

**Stored on**:
The day a stock unit entered stock. Printed according to its location's kind — "frozen on" for a freezer.
_Avoid_: frozen_at as the general term

**Label number**:
The short, permanent identifier printed on a freezer label and carried in its QR code. Four digits, with a letter prefix added once the digits run out (0402, … 9999, A0000, …); never reused. People only ever type the four digits — if several in-stock units share them, they pick one.
_Avoid_: ID, code, short ID

**Labelled together**:
Stock units labelled in the same moment for the same Food (e.g. four bags from one pot). Not an entity of its own — each unit stays independent; "4 labelled, 3 left" is read from the stock history.
_Avoid_: Batch (as a thing you can edit)

**Preparation**:
How a Food was prepared before storing (cooked, raw, sous-vide, blanched, …), printed as a short badge on the label. Chosen from a short per-instance list; optional.
_Avoid_: State (that is the stock unit's lifecycle), type

**Macros**:
Nutrition values (kcal, protein, optionally fat and carbs) for a whole stock unit — what you eat if you eat the whole container. Stored and printed only; never tracked.
_Avoid_: Nutrition per portion, macros per 100 g

**Merge**:
Folding a duplicate Food (usually a typo) into another. Its stock units then belong to the surviving Food; what they printed is unchanged. A Food with stock units can only be merged, never deleted.
_Avoid_: Combine, dedupe

**Unit page**:
The page a freezer label's QR code opens in any camera app. Shows the stock unit and offers Take out; opening it never changes anything.
_Avoid_: Consume page, label page

**Scanner**:
cooka's own camera-and-keypad screen for taking units out — the Take out mode, and also opened inside cooking mode. Unlike the unit page, a scan or a typed label number here consumes immediately, confirmed by a full-screen "Taken out" that closes by itself and leaves an Undo until the next scan — except for units past best-before (asks first) and past use-by (never consumed, only discarded or put back).
_Avoid_: Consume mode

**Base URL**:
The HTTPS address printed into every freezer label's QR code — the address labels point at. cooka may also be used under other HTTPS host names; labels never print them. Labels keep the base URL they were printed with; the instance remembers every base URL it has printed with and recognises labels from all of them.
_Avoid_: Short host, domain

**Proxy mode**:
How an instance serves HTTPS by default: the self-hoster's reverse proxy (Caddy, Traefik, Nginx Proxy Manager, Tailscale serve) terminates TLS and cooka only answers requests the proxy marks as HTTPS. Active whenever no certificate is attached.
_Avoid_: HTTP mode, insecure mode

**Attached-cert mode**:
How an instance serves HTTPS itself, from a certificate and key the self-hoster places in `/data/tls/`. Active whenever those files are present; cooka never creates or renews certificates.
_Avoid_: Self-signed mode, built-in TLS, ACME

**Label preset**:
A hand-designed label layout for one label size (60×40 mm, 57×32 mm, 2"×2"), deciding which label fields fit. One per instance; there are no free-form sizes.
_Avoid_: Template, label format

**Reprint**:
Printing a new physical label for a stock unit that is still in stock — same label number, its current details, the current base URL and label preset. Never creates a new unit; recorded in the stock history.
_Avoid_: Duplicate, copy, relabel

**Bound printer**:
The one label printer an instance prints to, identified by its serial number rather than its address. If its address changes, cooka finds it again; if a different printer answers there, cooka says so instead of printing to it.
_Avoid_: Default printer, printer IP

**No-printer mode**:
How an instance works while no printer is bound: labelling still creates stock units and shows their label numbers large, to be written on by hand; taking out works by typing the number.
_Avoid_: Offline mode, manual mode

**Shopping list**:
The one list per instance that people shop from — cooka's own, not a staging area for another app. Buying something never creates stock; stock only comes from labelling.
_Avoid_: Grocery list, Einkaufszettel, cart

**Shopping list entry**:
One free-text line on the shopping list, optionally linked to the Food or Recipe that put it there. No amounts, units or categories — "2 onions" is just text.
_Avoid_: Item, product, shopping item

**Restock**:
A per-Food setting (off by default): when the Food's last in-stock unit is consumed, an entry named after the Food is added to the shopping list — for a cooked dish, a reminder to cook it again. Restoring the unit removes the entry again while it is still open.
_Avoid_: Auto-reorder, low-stock alert

**Event stream**:
The one server-sent stream every open screen listens to. It only says *which* topic changed (e.g. the shopping list); the screen then reloads that data itself. Changes from other phones arrive through it within seconds.
_Avoid_: Push, sync, websocket

**Setting**:
A per-instance choice stored in cooka and changeable by anyone who can open it (printer, label preset, language, food defaults, AI provider, next label number). Reached from the gear in the top status line.
_Avoid_: Config, preference

**Settings lock**:
An environment variable that fixes a setting from the server side; the locked setting wins over the stored value and is shown read-only.
_Avoid_: Override, admin setting

**Backup**:
A complete, consistent copy of an instance — its data and recipe images — that it can be restored from. Made nightly and before every upgrade, or downloaded on demand. Restoring a backup replaces everything, but label numbers and base URLs never go backwards. Always say "restore a backup", never just "restore", which is a stock unit's.
_Avoid_: Dump, snapshot (as the user-facing term)

**Export**:
A read-only copy of part of the data for other tools or people — the stock history, the current stock, the recipes. Never imported back as such.
_Avoid_: Backup (an export cannot restore an instance)

**Stable surface**:
What cooka promises not to break between minor releases: the endpoint that adds a shopping-list entry, and the export formats. Export columns and fields may be added, never renamed or removed. Everything else the app speaks (the rest of `/api`, the event stream) is internal and may change in any release.
_Avoid_: Public API (cooka exposes nothing to the internet), integration API
