# Research: PocketBase vs. plain Go stdlib as backend foundation

Ticket: #5 · Researched: 2026-11-11 · Status: findings only, **no decision made here**

Question: should cooka build on PocketBase used as a Go framework, or on a hand-rolled
`net/http` (Go 1.22+ routing) + SQLite backend (modernc.org/sqlite or mattn/go-sqlite3, plus
sqlc and a migration tool)? Fixed constraints: Go, SQLite, one Docker container, no
accounts/auth (LAN only), aimed at other self-hosters.

Sources are primary (pocketbase.io docs, the PocketBase source/changelog at v0.42.2, GitHub
API, Go docs, library READMEs). Where I measured or read source code myself, that is marked
**[measured]** or **[source]**.

---

## 0. Headline finding: PocketBase left GitHub, and its Go module path changed

This affects every other criterion, so it comes first.

- The GitHub repo `pocketbase/pocketbase` is **archived** (GitHub API: `"archived": true`;
  README: "⚠️ The repo has moved to https://ganigeorgiev.com/pocketbase/pocketbase").
  [GitHub](https://github.com/pocketbase/pocketbase)
- v0.41.0 changelog: "⚠️ Migrated the Go module from GitHub to the new host
  `https://ganigeorgiev.com`" — users must rewrite imports and `go.mod`.
  [CHANGELOG v0.41.0, source]
- The Go module is now `ganigeorgiev.com/pocketbase/pocketbase`; latest is **v0.42.2**
  (2026-11-11), served via a `go-import` meta tag pointing to a self-hosted git at
  `https://ganigeorgiev.com/git/pocketbase/pocketbase`. The old `github.com/...` path stops at
  v0.40.6 (2026-10-23).
  [proxy.golang.org @latest (new)](https://proxy.golang.org/ganigeorgiev.com/pocketbase/pocketbase/@latest),
  [proxy.golang.org @latest (old)](https://proxy.golang.org/github.com/pocketbase/pocketbase/@latest)
- Issues/discussions are also on the new host (changelog links point to
  `ganigeorgiev.com/pocketbase/discussions/...`). [CHANGELOG, source]
- Bus factor: "There is no paid team or company behind it", "a personal open source project",
  "There are no promises for maintenance and support beyond what is already available."
  [FAQ](https://pocketbase.io/faq/)

Practical implications for cooka (inference, not from a source): dependency is a single
maintainer's personal domain rather than GitHub; Go module proxy caching (proxy.golang.org)
mitigates disappearance of already-published versions; Dependabot/Renovate and GitHub
security advisories tooling may behave differently for a non-GitHub module.

---

## 1. Criteria comparison

| Criterion | PocketBase as Go framework (v0.42.2) | Hand-rolled `net/http` + SQLite |
|---|---|---|
| Auth unused / public access | Possible via empty-string API rules, but superuser + `users` collection always exist | Nothing to remove |
| SPA embedding | `apis.Static(fs.FS, …)` on `/{path...}` | `http.FileServerFS(embed.FS)` / custom handler |
| Custom routes & hooks | Yes: router in `OnServe`, record lifecycle hooks | Plain handlers; hooks are your own code |
| Migrations | Built in (`migratecmd`, Go migrations, auto-run on `serve`) | Pick a tool (goose / golang-migrate) or hand-roll |
| Realtime / SSE | Built in, auto-events for record CRUD + custom messages | Hand-roll SSE (~a broker + `http.Flusher`) |
| Admin UI | Built in at `/_/`, superuser login required | None (cooka's own UI is the admin) |
| Backups | Built in: UI, cron, S3, `app.CreateBackup` | `VACUUM INTO` / backup API, own cron |
| Binary size (linux/amd64, stripped) **[measured]** | 25.2 MB (22.2 MB with `no_ui` tag) | 10.2 MB (modernc) |
| Stability | 0.x, explicit "no backward compat before v1.0", frequent ⚠️ changes, module path move | Go 1 compat promise; deps chosen by us |
| Licence | MIT | Go: BSD-3; modernc: BSD-3; mattn: MIT; sqlc: MIT |
| CGO | Not required (modernc by default) | Not with modernc/ncruces; required with mattn |

Details and citations per criterion follow.

---

## 2. Auth: can it be cleanly unused / collections opened publicly?

**PocketBase**
- Each collection has `listRule`, `viewRule`, `createRule`, `updateRule`, `deleteRule`.
  `null` ("locked") = superuser only (the default); **empty string = "anyone will be able to
  perform the action"**, guests included. [API rules](https://pocketbase.io/docs/api-rules-and-filters/)
  → cooka's collections can be made fully public.
- But auth is not *removable*:
  - The initial system migration creates a `users` auth collection
    (`core.NewAuthCollection("users", ...)`) and the `_superusers` collection. [source:
    `migrations/1640988000_init.go`]
  - On `serve`, if no superuser exists, an "installer" runs and logs a link to create one.
    It can be disabled: `ServeEvent.InstallerFunc` — "Set it to nil if you want to skip the
    installer." [source: `core/events.go`]; [Going to production](https://pocketbase.io/docs/going-to-production/)
  - Collection schema/settings changes via Web API and the admin UI require a superuser.
    [API rules](https://pocketbase.io/docs/api-rules-and-filters/) ("Authorized superusers bypass all rules").
  - v0.42.0 added a global middleware that rejects unknown/expired `Authorization` tokens with
    401. Irrelevant if no tokens are sent, but shows auth is woven into the request pipeline.
    [CHANGELOG v0.42.0, source]
- Public CRUD on collections means any LAN client can write any field the rules allow; finer
  control is via rule filter expressions or `*Request` hooks. [API rules](https://pocketbase.io/docs/api-rules-and-filters/)

**Stdlib**: no auth code exists unless written. LAN-only "no accounts" maps 1:1.

---

## 3. Embedding & serving a static SPA

**PocketBase**: `apis.Static()` "serves static directory content from `fs.FS` instance" and
"Expects the route to have a `{path...}` wildcard parameter"; second arg is `indexFallback`
(SPA fallback). Example `se.Router.GET("/{path...}", apis.Static(os.DirFS(...), false))`.
[Routing](https://pocketbase.io/docs/go-routing/). `embed.FS` implements `fs.FS`
[pkg embed](https://pkg.go.dev/embed), so a `//go:embed dist` FS can be passed directly. The
admin UI itself is served this way at `/_/{path...}` from an embedded FS. [source: `apis/serve.go`]
Caveat: PocketBase reserves `/api/*` and `/_/*`.

**Stdlib**: `http.FileServerFS(fs.FS)` (Go 1.22+) plus a fallback-to-`index.html` handler;
`{path...}` remainder wildcards and "most specific pattern wins" precedence from Go 1.22.
[Go 1.22 routing blog](https://go.dev/blog/routing-enhancements), [net/http](https://pkg.go.dev/net/http#FileServerFS)

Both are easy; roughly equal effort.

---

## 4. Custom routes and hooks (raw TCP printing, recipe scraping)

**PocketBase**
- Routes registered in `app.OnServe()` on `se.Router` (`GET/POST/...`), path params via
  `e.Request.PathValue`, groups and middleware via `Bind/BindFunc`.
  [Routing](https://pocketbase.io/docs/go-routing/)
- Since v0.23 the router is "built on top of the Go 1.22 `net/http` mux enhancements".
  [CHANGELOG v0.23.0, source] — handler code looks very close to stdlib.
- Record hooks such as `app.OnRecordAfterCreateSuccess("stock_units")` could fire ZPL printing
  after a batch insert. [source: `core/app.go`]; [Event hooks](https://pocketbase.io/docs/go-event-hooks/)
- Raw TCP (`net.DialTimeout(..., 3s)`) and HTTP scraping are plain Go in either approach;
  PocketBase neither helps nor hinders.

**Stdlib**: same `net/http` patterns; "hooks" = calling the print function from the batch
handler/service. No hidden lifecycle.

---

## 5. Migrations

**PocketBase**: `migratecmd` plugin; migrations are Go files with `m.Register(up, down)`;
`Automigrate` generates migration files from admin-UI schema edits in dev; "New unapplied
migrations are automatically executed when the application server starts, aka. on `serve`";
raw SQL allowed via `app.DB().NewQuery(...)`; `migrate collections` snapshots the schema.
[Go migrations](https://pocketbase.io/docs/go-migrations/). Schema is expressed as PocketBase
*collections*, not hand-written DDL; PocketBase also ships its own system migrations that run
on upgrade (e.g. v0.38.1 index-normalisation migration that "resaves all collections").
[CHANGELOG_23_39, source]

**Stdlib**: choose a migration tool, e.g. [pressly/goose](https://github.com/pressly/goose)
(SQL or Go migrations, embeddable via `embed.FS`) or
[golang-migrate/migrate](https://github.com/golang-migrate/migrate); or a ~50-line runner over
`PRAGMA user_version`. Pairs naturally with [sqlc](https://github.com/sqlc-dev/sqlc) (MIT,
generates type-safe Go from SQL; reads the same migration files as schema). Run on startup is
your choice.

---

## 6. Realtime / SSE subscriptions

**PocketBase**: "The Realtime API is implemented via Server-Sent Events (SSE)"; topics
`COLLECTION/*` or `COLLECTION/RECORD_ID`; delivery gated by list/view rules; idle clients
disconnected after 5 min and auto-reconnect. [Realtime API](https://pocketbase.io/docs/api-realtime/).
Events fire automatically for record create/update/delete; custom messages via
`app.SubscriptionsBroker()` + `client.Send(subscriptions.Message{...})`.
[Go realtime](https://pocketbase.io/docs/go-realtime/). The JS SDK handles subscribe/reconnect.

**Stdlib**: hand-roll SSE (`text/event-stream`, `http.Flusher`, a small fan-out broker,
reconnect handled by browser `EventSource`). Small but non-zero code and testing; cooka's need
(e.g. "a box was consumed, refresh dashboard") is low-volume.

---

## 7. Value of the admin UI for self-hosters

**PocketBase**: dashboard at `/_/` with collections/records editor, logs, settings, backups
(Settings > Backups). [Going to production](https://pocketbase.io/docs/going-to-production/).
Can be stripped with build tag `no_ui` (`DistDirFS is deliberately not set to prevent bundling
the UI`). [source: `ui/embed_no_ui.go`]

Trade-offs (analysis):
- Pro: free escape hatch to fix data (wrong expiry date, delete a ghost StockUnit), view logs,
  trigger/restore backups — without cooka building those screens.
- Con: requires creating and remembering a **superuser account**, which contradicts the
  "no accounts" premise; it's a second, developer-oriented UI exposed on the LAN; schema edits
  via the UI by self-hosters could diverge from cooka's migrations.
- Production guide recommends restricting superuser IPs and optional MFA, i.e. it's designed
  around an internet-exposed admin. [Going to production](https://pocketbase.io/docs/going-to-production/)

**Stdlib**: no admin UI; any maintenance features (export, backup button, edit) must be built
into cooka's UI, or self-hosters use `sqlite3` CLI against the volume.

---

## 8. Backup story

**PocketBase**: built-in backups since v0.16, local or S3-compatible storage, configurable
cron (`Backups.Cron`, default `CronMaxKeep: 3`) [source: `core/settings_model.go`];
`app.CreateBackup` / `app.RestoreBackup` in Go — restore "is experimental and currently is
expected to work only on UNIX based systems" and needs ~2x free disk. [source: `core/app.go`].
Copying `pb_data` with the app stopped also works; for large data use `sqlite3 .backup` +
rsync. [Going to production](https://pocketbase.io/docs/going-to-production/). FAQ suggests
Litestream for replication. [FAQ](https://pocketbase.io/faq/)

**Stdlib**: SQLite `VACUUM INTO 'file'` produces "a consistent snapshot of the original
database" from a live DB; the online backup API is the incremental alternative.
[VACUUM](https://sqlite.org/lang_vacuum.html), [Backup API](https://sqlite.org/backup.html).
A nightly `VACUUM INTO` + "download backup" endpoint is a small amount of code; restore =
replace file and restart. Litestream works equally with either approach.

---

## 9. Binary / Docker image size **[measured]**

Built 2026-11-11 with Go 1.27.3, `CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath
-ldflags="-s -w"`, minimal "hello route" programs:

| Program | Size |
|---|---|
| PocketBase v0.42.2 as framework (default, with admin UI) | 25.2 MB |
| PocketBase v0.42.2 with `-tags no_ui` | 22.2 MB |
| stdlib `net/http` + `modernc.org/sqlite` v1.62.0 | 10.2 MB |

Both are static (no CGO) so both fit `FROM scratch` / distroless static images; image size ≈
binary + SPA assets (+ CA certs/tzdata if needed for HTTPS scraping and local dates). The
~12–15 MB difference is PocketBase's own code (JSVM/goja is *not* included unless the jsvm
plugin is registered; mailer, OAuth2, image thumbs, S3 client, cobra CLI are).
PocketBase's direct deps include goja, oauth2, jwt, imaging, cobra. [source: `go.mod`]

---

## 10. API stability & maturity

**PocketBase**
- README: "full backward compatibility is not guaranteed before reaching v1.0.0."
  [GitHub README](https://github.com/pocketbase/pocketbase)
- First release v0.1.0 on 2022-07-07; now v0.42.2 four years later; no v1.0 ETA ("no fixed
  ETAs"). [GitHub releases API](https://github.com/pocketbase/pocketbase/releases), [FAQ](https://pocketbase.io/faq/)
- v0.23.0 (2024-11-24) was "a major refactor of the internals" with "many Go/JSVM and Web APIs
  breaking changes!" (echo → net/http router, `daos`/`models` merged into `core`, admins →
  `_superusers`), with separate Go/JSVM upgrade guides. [CHANGELOG v0.23.0, source]
- Count of ⚠️-marked (breaking/attention) changelog entries per release **[source, counted]**:
  v0.17–v0.22.x: 24 (incl. patches); v0.23.0: 9; v0.24–v0.39: 19 across 16
  releases; v0.40.0: 2 (incl. Go 1.27 `encoding/json` v2 behaviour change); v0.41.0: module
  path move; v0.42.0: auth-token middleware. Most post-v0.23 ones are small (signature tweaks,
  defaults, rule checks), but they arrive roughly every minor release.
- Positive: v0.22.x got backported security fixes for ~2 years after v0.23 (v0.22.57 released
  2026-10-23). [GitHub releases API]
- Very active: patch releases every 1–3 weeks in 2026. [GitHub releases API]
- Min Go version tracks latest Go closely: module requires `go 1.27`. [source: `go.mod`]

**Stdlib**: `net/http` covered by the Go 1 compatibility promise
([go.dev/doc/go1compat](https://go.dev/doc/go1compat)). modernc.org/sqlite is also v1.x but
warns to pin the matching `modernc.org/libc` version. [pkg modernc.org/sqlite](https://pkg.go.dev/modernc.org/sqlite)

---

## 11. Licence

- PocketBase: MIT ("Copyright (c) 2022 - present, Gani Georgiev"). [source: `LICENSE.md`]
- Go stdlib: BSD-3-Clause. [go.dev/LICENSE](https://go.dev/LICENSE)
- modernc.org/sqlite: BSD-3-Clause (SQLite itself public domain). [pkg.go.dev](https://pkg.go.dev/modernc.org/sqlite)
- mattn/go-sqlite3: MIT; ncruces/go-sqlite3: MIT; sqlc: MIT. [GitHub API]
- No licence blocker on either path for an open-source self-hosted app.

---

## 12. CGO requirements

- PocketBase: "PocketBase by default doesn't require CGO because it uses the pure Go SQLite
  port" (modernc); custom drivers via `DBConnect`, "this may not be the case when using a
  custom SQLite driver!" [Go overview](https://pocketbase.io/docs/go-overview/)
- modernc.org/sqlite: "a CGo-free port of the C SQLite3 library", supports linux
  amd64/arm64/arm/386/riscv64 etc. Caveat: "The transpiled SQLite core runs slower than the
  same C compiled natively" (1.3–2.0x CPU in their benchmarks) — negligible at kitchen scale.
  [pkg.go.dev](https://pkg.go.dev/modernc.org/sqlite)
- mattn/go-sqlite3: "go-sqlite3 is cgo package", needs `CGO_ENABLED=1` and gcc; cross-compiling
  needs a C cross-compiler. [README](https://github.com/mattn/go-sqlite3) → complicates
  multi-arch Docker builds (e.g. arm64 Raspberry Pi self-hosters).
- ncruces/go-sqlite3: CGO-free alternative (SQLite compiled to Wasm, run via wazero).
  [GitHub](https://github.com/ncruces/go-sqlite3)

Either path can be CGO-free; it's a driver choice, not a framework choice.

---

## 13. Comparable Go + SQLite backends

- No other actively maintained Go "backend-in-a-box" with PocketBase's scope was found in
  primary sources. The nearest comparable, [TrailBase](https://github.com/trailbaseio/trailbase),
  is **Rust**, licensed OSL-3.0 — not usable as a Go framework. [GitHub API]
- Middle ground: stdlib router + **sqlc** + **goose** (both MIT-ish, mature, on GitHub,
  11–19k stars) gives typed queries and migrations without a framework. [GitHub API]

---

## 14. Trade-off summary (no decision)

**PocketBase favours** fastest path to CRUD + realtime + admin UI + backups out of the box;
JS SDK for the SPA; record hooks for print-on-create. Costs: an unavoidable superuser/auth
layer in a deliberately account-less app; ~2.5x binary size; schema expressed as
"collections" rather than plain SQL; 0.x churn with ⚠️ changes most minor releases; and, as of
v0.41 (Oct/Nov 2026), a single-maintainer project that moved off GitHub to a personal domain
with a new import path.

**Stdlib + SQLite favours** the idea note's "zero-dependency stdlib where possible", the
no-auth premise, plain SQL (sqlc), smallest binary, Go 1 stability, full control of the
HTTP surface (only cooka's endpoints on the LAN). Costs: build SSE fan-out, migration wiring,
backup endpoint and any data-fix/maintenance UI yourself; no generic admin escape hatch.

Questions for the decision: How much of cooka is generic CRUD (PocketBase shines) vs.
bespoke workflows (batch-freeze+print, one-scan consume+undo, auto-restock — custom routes
either way)? Is a superuser account acceptable for self-hosters? How much weight does the
repo/module move carry for a long-lived dependency?
