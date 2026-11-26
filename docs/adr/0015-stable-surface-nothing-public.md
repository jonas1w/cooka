# Nothing public; a small stable surface for integrations

v1 makes nothing reachable from the internet and hands nothing to macro trackers. There is no public recipe share page, no per-recipe token, and no path prefix meant for a proxy to expose. Macro trackers have no open write API. The only sanctioned path is importing a public recipe URL, which Cronometer (Gold, paid) and MyFitnessPal (English locale only) offer. Both re-match the ingredients against their own databases and ignore the page's nutrition values, and FDDB and Yazio, which German households mostly use, have no URL import at all (`docs/research/grocy-mealie-friction.md`). Opening a LAN-only app with no auth to the internet for that gain is not worth it. There is also no "copy macros" action. The recipe page (per serving), the unit page (per unit) and the label already show the numbers, and tracker forms take one value per field, so a pasted line saves no typing. Anyone who wants to host a page can use the recipe JSON-LD export (ADR 0013).

**Stable surface.** cooka documents and keeps compatible:

- `POST /api/shopping-list/entries`, the one add endpoint (ADR 0006).
- The export formats: history CSV, stock CSV and recipe JSON-LD (ADR 0013). They are locale-free (ADR 0014). CSV columns are only ever added, never renamed, reordered or removed. The recipe JSON-LD stays plain schema.org `Recipe`.

Breaking either needs a major version and a release note. Everything else (the rest of `/api` and the `GET /api/events` stream) belongs to the SPA. It is readable but undocumented and may change in any release.

We rejected a public read-only share page (small, paid-tier benefit for a security hole in an app with no auth), a "copy macros" text action (saves no typing), and a stable read API such as freezer stock for a Home Assistant sensor (a new integration surface, out of scope for v1).
