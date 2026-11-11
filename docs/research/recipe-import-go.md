# Recipe import in Go: schema.org extraction and recipe-scrapers alternatives

Research for issue #7 (map: #1). Status: findings only, no decision. Researched 2026-11-11.

**Question.** How far does schema.org/Recipe JSON-LD extraction alone get on real sites (German and big English ones)? How does the Python `recipe-scrapers` library that Mealie uses actually work? Is there a maintained Go port? What fallbacks exist? How reliably can we parse portions, ingredients (quantity/unit/food) and nutrition (kcal/protein)?

## TL;DR

- **JSON-LD covers it, when we can fetch the page.** All 16 recipe sites (17 pages) that answered a plain HTTP GET (12 German-language, 4 English) had a parseable schema.org `Recipe` in `<script type="application/ld+json">`. None used microdata. 13 of the 16 included `nutrition` with calories (12 also with protein); Kitchen Stories, Weight Watchers DE and Andy Cooks DE did not.
- **The bigger problem is fetching.** 7 sites returned HTTP 403 (bot challenges, at least one confirmed as Cloudflare): allrecipes, seriouseats, simplyrecipes, budgetbytes, foodnetwork, rewe.de and knorr. Mealie works around this with TLS-fingerprint impersonation (`curl_cffi`) and optional FlareSolverr. A plain Go `net/http` client would hit the same wall.
- **`recipe-scrapers` is schema.org-first plus per-site overrides.** Every one of its 642 site classes falls back to the shared `SchemaOrg` parser for any method it doesn't override. 281 of them (44 %) override nothing except `host()`. It reads JSON-LD **and** microdata through `extruct`. For nutrition it only passes the strings through.
- **There is no maintained Go equivalent.** The options are: `kkyr/go-recipe` (Apache-2.0, last commit 2023-03); Recipya's Go scraper (GPL-3.0, part of an app, repo to be archived in favour of a Rust/AGPL rewrite); and `shncraft/recipe-scrapers-go` (MIT, 3 commits, 0 stars, unproven). A small JSON-LD extractor is easy to write in Go. Matching recipe-scrapers' coverage of site quirks is not.
- **Yield and nutrition parse fine with a few rules. Ingredients are the hard part.** Real values include `["4","4 Portionen"]`, `"18 Stücke"` and `"10 - 12 serving(s)"`. Calories show up as `"1015 kcal"`, `"380 calories"`, `429` and `"537"`. Protein shows up as `"48.9 g"`, `"33 grams protein"` and `48`. Ingredients are always free text (`"1 Zwiebel(n)"`, `"0.5 Bund Petersilie"`, `"Salz"`). Mealie's best parser (`ingredient-parser-nlp`) is trained on English-language data only.

## 1. What the specs say

- **schema.org/Recipe** ([spec](https://schema.org/Recipe)):
  - `recipeYield` is *QuantitativeValue or Text*.
  - `recipeIngredient` is *ItemList, PropertyValue or Text*. It supersedes the older `ingredients`.
  - `nutrition` is *NutritionInformation*.
  - `recipeInstructions` is *CreativeWork, ItemList or Text*, usually `HowToStep`/`HowToSection`.
  - Times are ISO-8601 `Duration`.
- **schema.org/NutritionInformation** ([spec](https://schema.org/NutritionInformation)): `calories` is of type *Energy* and `proteinContent` of type *Mass*. Both are text-with-unit in practice. `servingSize` is free *Text*. The spec does **not** say what the values are per.
- **Google's Recipe structured-data guide** ([docs](https://developers.google.com/search/docs/appearance/structured-data/recipe)) is what publishers actually optimise for:
  - `nutrition.calories` is defined as "the number of calories in each serving".
  - "If `nutrition.calories` is defined, `recipeYield` must be defined with the number of servings."
  - `recipeIngredient` is an array of plain strings, e.g. `"3/4 cup sugar"`.
  - Only `name` and `image` are required. Ingredients, instructions, yield and nutrition are merely *recommended*.

So by convention nutrition is **per serving** and yield is **a servings count**. Neither the spec nor Google defines structured ingredients. Practically every site ships free text.

## 2. Real pages probed (2026-11-11)

Method: a Python stdlib script sent a single GET with a desktop Chrome User-Agent and `Accept-Language: de-DE`. It then parsed every `ld+json` block, walked `@graph`/nesting for `@type: Recipe`, and grepped for microdata `itemtype=schema.org/Recipe`. The script is not committed. This is a convenience sample, not a survey: about 40 URLs were tried, and many guessed URLs returned 404 or redirected. The table lists only the pages that resolved to a recipe or were blocked.

| Site | Lang | JSON-LD Recipe | recipeYield (raw) | Nutrition (raw excerpt) | Notes |
|---|---|---|---|---|---|
| chefkoch.de (2 recipes) | de | yes | `["4","4 Portionen"]` | `servingSize "1 Portion"`, `calories "1015 kcal"`, `proteinContent "48.9 g"` | Instructions as `HowToSection` |
| lecker.de | de | yes | `"18 Stücke"` | `servingSize "1 Stück"`, `"418 kcal"`, `"9 g"` | Per piece, not per portion |
| kitchenstories.com/de | de | yes | `["6","6 Portionen"]` | **none** | |
| eatsmarter.de | de | yes | `"4"` | `"479 kcal"`, `"38 g"` | Ingredient strings padded with spaces (`"1   Zwiebel "`) |
| essen-und-trinken.de | de | yes | `"4"` (bare string) | `calories 1062`, `proteinContent 48` (bare numbers, no unit) | |
| einfachkochen.de | de | yes | `"4 Portion"` | `"537"`, `"21.00"` (no unit, numeric strings) | |
| hellofresh.de | de | yes | `"2"` | `"1502 kcal"`, `"72.4 g"`, `sodiumContent "5.7 g"` | 5.7 g "sodium" is almost certainly salt mislabelled |
| rezepte.lidl.de | de | yes | `"4 Portionen"` | `"519 calories"`, `"23.1 g"` | English unit word on a German site |
| gutekueche.at | de-AT | yes | `"4 Portionen"` | `calories 429` only, no protein | |
| weightwatchers.com/de | de | yes | `"4"` | **none** | Ingredient text: `"2 Stück, mittelgroß Zwiebel/n"` |
| andy-cooks.com/de | de | yes | `"8"` | **none** | |
| cookidoo.de | de | yes | `"6 portions"` | `"1045.8 kcal"`, `"50.6 g"` | **No `recipeInstructions`** (login-gated). Ingredients in oz with HTML entities (`3 &frac12; - 7 oz`) |
| bbcgoodfood.com | en | yes | `4` | `"380 calories"`, `"33 grams protein"` | |
| recipetineats.com | en | yes | `["10"]` | `servingSize "398 g"`, `"594 kcal"`, `"39 g"` | WP Recipe Maker |
| delish.com | en | yes | `"10 - 12 serving(s)"` | `" 858 Calories"` | Range yield |
| kingarthurbaking.com | en | yes | `["16","1 loaf"]` | `servingSize "43g"`, `"120 calories"`, `"3g"` | |
| allrecipes, seriouseats, simplyrecipes, budgetbytes, foodnetwork, rewe.de, knorr | en/de | n/a | | | **HTTP 403.** allrecipes returned `cf-mitigated: challenge`, `server: cloudflare` |

Other observations:

- **Listing pages contain `Recipe` too.** lecker.de category pages and hellofresh.de `/recipes` embed ItemLists of `Recipe` stubs with no ingredients. An importer has to reject "Recipe" nodes that lack `recipeIngredient`. Mealie does the same: it returns `None` unless ingredients or instructions are present ([scraper_strategies.py L340-L355][m-strat]).
- **Microdata did not appear on any probed page.** recipe-scrapers still parses it (`SYNTAXES = ["json-ld", "microdata"]`, [_schemaorg.py L21][rs-schema]), presumably for older sites.
- **Redirects are worth noting.** Several guessed URLs redirected to a different recipe (lecker, chefkoch, gutekueche) or to the homepage (eatsmarter.com → eatsmarter.de). The importer should use the final URL or `canonical`.

## 3. How `recipe-scrapers` works

Repo: [hhursev/recipe-scrapers](https://github.com/hhursev/recipe-scrapers). MIT licence, about 2.3k stars, latest release 15.13.0 on 2026-10-18, commits as recent as 2026-11-10. Runtime dependencies are `beautifulsoup4`, `extruct` and `isodate` ([pyproject.toml][rs-pyproject]).

**Parsing.** `SchemaOrg.__init__` runs `extruct.extract(html, syntaxes=["json-ld","microdata"], uniform=True)`. It finds the `Recipe` entity, either directly, inside `@graph`, or as `mainEntity` of a `WebPage`. It merges duplicates that share an `@id`/`name` and also collects `Person`, `AggregateRating` and `WebSite` nodes ([_schemaorg.py L42-L111][rs-schema]).

**Scraper selection** ([`scrape_html`, `__init__.py`][rs-init]):
- Known hosts get a site class from a registry: 642 scraper modules at 15.13.0.
- With `supported_only=False`, unknown hosts get a generic `SchemaScraper` ([_factory.py][rs-factory]).
- `simple_opengraph=True` additionally falls back to OpenGraph title, description and image ([_opengraph.py][rs-og]).

**Site classes override only what's broken.** The `SchemaOrgFillPlugin` is attached to every host (`run_on_hosts = ("*",)`). It catches `NotImplementedError` from a site class method and calls the same-named `SchemaOrg` method instead ([plugins/schemaorg_fill.py][rs-fill], [settings/default.py][rs-settings]). Examples:
- `allrecipes.py`, `kitchenstories.py`, `eatsmarter.py` and `recipetineats.py` only declare `host()`, so they are pure schema.org.
- `chefkoch.py` swaps in a custom `SchemaOrg` subclass to fix how `HowToStep.name`/`text` are joined ([chefkoch.py][rs-chefkoch]).
- `lecker.py` scrapes instructions from the DOM via CSS selector `.bx-instruction-group__instruction-step + div p` ([lecker.py][rs-lecker]). This is fragile and breaks on redesigns.
- `essenundtrinken.py` overrides `ingredients`/`ingredient_groups`. `hellofresh.py` overrides times. `rewe.py` overrides instructions/equipment.

**Counts at tag 15.13.0** (grep over the tarball):
- 642 site modules.
- 281 define at most one method (just `host`).
- 309 touch `self.soup` (DOM scraping for at least one field).
- Only 22 override `nutrients`.

**Output is mostly strings.**
- `ingredients()` returns a list of normalized strings. `PropertyValue` objects are flattened to `"value unit name"` ([_schemaorg.py L216-L253][rs-schema]).
- `yields()` returns a string such as `"4 servings"` or `"18 items"`, produced by regex tables in `get_yields` ([_utils.py L254+][rs-utils]).
- `nutrients()` returns the `nutrition` dict with values stringified, e.g. `{"calories": "1015 kcal"}` ([_schemaorg.py L255-L270][rs-schema]).
- There is **no** ingredient parsing into quantity/unit/food and no numeric nutrition parsing in the library.

**Fetching is out of scope.** Since v15 you pass in HTML. `online=True` uses `requests` with a recipe-scrapers User-Agent ([_abstract.py][rs-abstract]).

## 4. How Mealie uses it

Repo: [mealie-recipes/mealie](https://github.com/mealie-recipes/mealie). AGPL-3.0, release v3.30.0 on 2026-10-31. It pins `recipe-scrapers==15.13.0`, `extruct==0.18.0`, `ingredient-parser-nlp==2.9.1` and `openai`. Links below point to `mealie-next` at `27ad949`.

**URL import strategies**, tried in order ([recipe_scraper.py L19-L24][m-rs]):
1. `RecipeScraperPackage` calls `scrape_html(html, org_url=url, supported_only=False)`, so unknown sites still get the schema.org path ([scraper_strategies.py L327-L357][m-strat]).
2. `RecipeScraperOpenAITranscription` handles video URLs (audio transcript, then LLM).
3. `RecipeScraperOpenAI` runs an LLM "recipe import workflow" over the page content, if a group has AI enabled ([L375-L421][m-strat]).
4. `RecipeScraperOpenGraph` uses `extruct` OpenGraph and gives title, image and description only.

**Fetching.** `safe_scrape_html` cycles through browser TLS impersonations via `httpx-curl-cffi`, "to bypass bot-detection systems that fingerprint the TLS handshake (JA3/JA4), such as Cloudflare". It can also use FlareSolverr ([fetch.py][m-fetch], `mealie/pkgs/safehttp/`).

**Pasting as a fallback.** Mealie's UI also accepts pasted HTML/JSON ([features docs](https://mealie.io/documentation/getting-started/features/)). That is a low-tech answer to 403s.

**Post-processing** ([cleaner.py][m-clean]):
- `clean_yield` splits yields into `servings_qty`, `yield_qty` and `yield_str`. It uses translated "servings/serves/yield" words to decide which list entry is servings.
- `clean_nutrition` takes the first number with a regex, turns `,` into `.`, and converts sodium/cholesterol from grams to milligrams when it sees "g". It explicitly assumes "all units are supplied in grams".

**Ingredient parsers** ([ingredient_parser.py][m-ing]): the user can choose between three.
- **Brute**: hand-written tokenizer for amount, unit, food and note, including unicode fractions ([brute/process.py][m-brute]).
- **NLP**: wraps [`ingredient-parser-nlp`](https://github.com/strangetom/ingredient-parser) (MIT, actively maintained). It is a sequence-labelling model trained on about 88k sentences from allrecipes, BBC, Cookstr (archive.org `recipes-en-201706`) and NYT ([data docs](https://ingredient-parser.readthedocs.io/en/latest/explanation/data.html)). It reports 95.15 % sentence-level and 98.08 % word-level accuracy on its own English test split ([README](https://github.com/strangetom/ingredient-parser)). Its training DB has a single `en` table. No German support is documented.
- **OpenAI**: LLM with a structured-output schema.

After parsing, the food and unit are fuzzy-matched against the group's own food/unit tables, with default thresholds of 85 (food) and 70 (unit) ([_base.py][m-base]). The contributor doc still describes the old CRF++ model ([ingredient-parser.md][m-ingdoc]) and is outdated.

## 5. Go options

| Option | Licence | Status | Approach | Notes |
|---|---|---|---|---|
| [kkyr/go-recipe](https://github.com/kkyr/go-recipe) | Apache-2.0 | 33★, last commit **2023-03-16** | Default ld+json Schema Recipe scraper plus per-host custom scrapers registered by hostname, reusing the default for missing fields | Same design as recipe-scrapers, small site list, unmaintained |
| [reaper47/recipya](https://github.com/reaper47/recipya) `internal/scraper` | **GPL-3.0** | 413★, commits through 2026-11 but README says the Go repo "will eventually be archived" (Rust rewrite [recipya-rs](https://github.com/reaper47/recipya-rs), AGPL-3.0) | goquery, a switch on host with ~185 files of site scrapers, schema.org model | Not a library (`internal/`). Copying code imposes GPL. Useful as a reference for site quirks |
| [shncraft/recipe-scrapers-go](https://github.com/shncraft/recipe-scrapers-go) | MIT | 0★, **3 commits**, last 2026-02-21 | Claims a port of recipe-scrapers (577+ domains, goquery, Schema.org → OpenGraph fallback) | README module path (`shanisharrma/...`) differs from repo owner. Treat as unvetted |
| [astappiev/microdata](https://github.com/astappiev/microdata) | BSD-2-Clause | 7★, pushed 2026-10 | Generic microdata **and** JSON-LD extraction from HTML | Building block, not recipe-specific |
| [PuerkitoBio/goquery](https://github.com/PuerkitoBio/goquery) | BSD-3-Clause | 15k★, active | jQuery-like DOM | For site-specific CSS overrides |
| Hand-rolled: `golang.org/x/net/html` + `encoding/json` | BSD | — | Find `ld+json` scripts, unmarshal into `any`, walk `@graph`/`mainEntity`/`@type` arrays | ~200–400 LOC by analogy with `_schemaorg.py` (416 lines incl. all fields) |
| Go ingredient parsers | — | — | GitHub search turned up only toys (e.g. `chvck/ingredients-parser`, 2017) | No maintained Go ingredient NLP |

## 6. Fallback options

1. **JSON-LD only, in Go.** No dependencies. It worked on every page we could fetch in the sample. It fails on sites without JSON-LD, sites with broken JSON-LD (missing instructions, as on Cookidoo), and anything behind a bot wall.
2. **Add microdata.** Little gain on modern sites (0/16 sites in the sample). Cheap if you use `astappiev/microdata`.
3. **Go port of selected site overrides.** recipe-scrapers is MIT, so its per-site logic can be ported with attribution. 44 % of its sites need no override at all. The rest is an ongoing maintenance load as sites redesign. Note how recipe-scrapers' lecker override relies on a CSS class name.
4. **Python sidecar running `recipe-scrapers`** (plus optionally `ingredient-parser-nlp` and `curl_cffi`). This reuses an actively maintained 642-site corpus and Mealie's fetch tricks. The cost is a Python runtime in the "single Docker container", a second process and an IPC boundary, and probably 50–100+ MB more image size (not measured). recipe-scrapers itself needs only bs4, extruct and isodate.
5. **LLM extraction** (Mealie's `RecipeScraperOpenAI`). It handles pages without structured data and can parse German ingredients into quantity/unit/food in the same call. It needs an API key or a local model, is non-deterministic, costs money per import, and sends page content to a third party unless the model is local.
6. **Fetch hardening.** TLS-fingerprint impersonation (Go equivalents exist, e.g. uTLS-based clients; not evaluated here) or FlareSolverr. Alternatively, a manual "paste HTML/JSON" or bookmarklet/share-sheet import, where the user's own browser fetches the page. This is independent of which parser is chosen.
7. **OpenGraph fallback.** Title, image and description only. Gives a stub recipe for manual completion.

## 7. Field reliability for cooka's needs

### Portions (`recipeYield`)

Seen forms: a bare int or string (`4`, `"4"`); a list mixing a number and text (`["4","4 Portionen"]`, `["16","1 loaf"]`); text with a German or English noun (`"4 Portionen"`, `"4 Portion"`, `"6 portions"`, `"18 Stücke"`); and a range (`"10 - 12 serving(s)"`).

Parsing approach: take the first number, and prefer the list entry whose noun is a serving word. A range needs a policy (min or max). The schema also allows `QuantitativeValue`, which wasn't seen in the sample.

The trap is units that aren't servings. With lecker's "18 Stücke", nutrition is per *piece* (`servingSize "1 Stück"`). King Arthur's `["16","1 loaf"]` comes with `servingSize "43g"`. So "kcal per portion" for a freezer label is only safe when yield is a servings count. Both recipe-scrapers (`get_yields`, which separates items/dozen/batches) and Mealie (`clean_yield` into servings vs yield) handle this distinction explicitly.

### Nutrition (kcal / protein)

- **Presence.** 13/16 fetched sites had calories and 12/16 had protein (gutekueche: calories only). This is roughly what Google's "recommended, not required" status suggests.
- **Value formats seen.**
  - Calories: `"1015 kcal"`, `"380 calories"`, `" 858 Calories"`, `"120 calories"`, `1062` (number), `"537"` (no unit), `"1045.8 kcal"`.
  - Protein: `"48.9 g"`, `"33 grams protein"`, `"3g"`, `48`, `"21.00"`.
- **Parsing.** Extract the first decimal number (handling `,` as a decimal separator) and assume kcal and g. That is exactly Mealie's `clean_nutrition` heuristic. It works for every value in the sample.
- **Edge cases.** Nobody in the sample used kJ, but the Energy type allows it. Sodium vs salt is mislabelled (HelloFresh "5.7 g" sodium). The basis can be per piece rather than per portion (lecker). HelloFresh's 1502 kcal comes with `servingSize "1140…"` (g). The values are per serving by convention, but cooka has to check `servingSize`/yield before printing "per portion".
- **Missing data.** Kitchen Stories, Weight Watchers and Andy Cooks provide none. cooka needs manual entry, or computation from ingredients (Recipya advertises "calculate nutritional information automatically", not investigated).

### Ingredients (quantity / unit / food)

- **Structure.** Always free-text strings in the sample. Structured `PropertyValue` is legal but recipe-scrapers only flattens it back to a string.
- **German specifics seen.**
  - Plural markers: `Zwiebel(n)`, `Zwiebel/n`.
  - German units: `EL`, `TL`, `Bund`, `Prise`, `St.`, `Stück`, `Stange`.
  - Decimal quantities written as `0.5`/`0.75`.
  - Inline notes and qualifiers: `(oder TK)`, `(Gr. M)`, `"2 Stück, mittelgroß Zwiebel/n"`.
  - No quantity: `"Salz"`, `"Prise Pfeffer…"`.
  - Whitespace padding.
  - HTML entities (`&frac12;`) left in the JSON (Cookidoo).
- **English specifics seen.** Fractions, ranges, dual units `"3 cups (360g) flour"`, and weird nesting `"1 onion (, finely chopped (…))"`.
- **Approaches:**
  - **Rule-based** (like Mealie's brute parser). Deterministic and easy to port to Go. Needs a German unit table. It will get "food" wrong on qualifier-heavy lines.
  - **`ingredient-parser-nlp`.** Highest reported accuracy, but its training data is English, so expect poor results on German. Python-only.
  - **LLM.** Handles both languages. Has the cost and non-determinism trade-offs above.
  - **Matching step** (Mealie's fuzzy matching against a curated food/unit table). Matters as much as tokenisation if cooka wants shopping-list aggregation.

## 8. Trade-offs (not a decision)

| Approach | Coverage (fetchable sites) | 403 sites | Ingredient structure | Ops / dependency cost | Maintenance |
|---|---|---|---|---|---|
| Go JSON-LD only | High in sample (16/16 fetchable sites) | No | None (strings) | Minimal, pure Go | Low |
| Go JSON-LD + ported site overrides | Higher on quirky sites | No | None | Pure Go | Ongoing per-site upkeep |
| Python sidecar (recipe-scrapers + curl_cffi) | Highest (642 sites, upstream fixes) | Partly (TLS impersonation) | Optional NLP (English) | Python in image, IPC | Upstream does the work, pin & bump |
| LLM fallback | Any page with text | Only if fetched | Yes, multilingual | API key / local model, cost, privacy | Prompt upkeep |
| Manual paste / bookmarklet | Any page the user can open | Yes | — | UI work | Low |

These options aren't exclusive. A common layering is JSON-LD first, then site overrides or a sidecar, then an LLM or OpenGraph stub, with paste-HTML as the escape hatch. Mealie implements roughly that order.

## Sources

- schema.org: [Recipe](https://schema.org/Recipe), [NutritionInformation](https://schema.org/NutritionInformation)
- Google Search Central: [Recipe structured data](https://developers.google.com/search/docs/appearance/structured-data/recipe)
- recipe-scrapers (main @ `00b5297`, tag 15.13.0 for counts): [_schemaorg.py][rs-schema], [_abstract.py][rs-abstract], [_factory.py][rs-factory], [_utils.py][rs-utils], [_opengraph.py][rs-og], [plugins/schemaorg_fill.py][rs-fill], [settings/default.py][rs-settings], [__init__.py][rs-init], [chefkoch.py][rs-chefkoch], [lecker.py][rs-lecker], [pyproject.toml][rs-pyproject]
- Mealie (mealie-next @ `27ad949`): [recipe_scraper.py][m-rs], [scraper_strategies.py][m-strat], [fetch.py][m-fetch], [cleaner.py][m-clean], [ingredient_parser.py][m-ing], [parser _base.py][m-base], [brute/process.py][m-brute], [contributor ingredient-parser doc][m-ingdoc]
- ingredient-parser-nlp: [repo](https://github.com/strangetom/ingredient-parser), [training data](https://ingredient-parser.readthedocs.io/en/latest/explanation/data.html)
- Go: [kkyr/go-recipe](https://github.com/kkyr/go-recipe), [reaper47/recipya](https://github.com/reaper47/recipya) ([scraper.go](https://github.com/reaper47/recipya/blob/main/internal/scraper/scraper.go)), [reaper47/recipya-rs](https://github.com/reaper47/recipya-rs), [shncraft/recipe-scrapers-go](https://github.com/shncraft/recipe-scrapers-go), [astappiev/microdata](https://github.com/astappiev/microdata), [PuerkitoBio/goquery](https://github.com/PuerkitoBio/goquery)
- Probed pages: chefkoch.de (745721177147257, 1062121211526182), lecker.de (77925), kitchenstories.com/de/rezepte/lasagne-586b, eatsmarter.de/rezepte/low-carb-chili-con-carne, essen-und-trinken.de/rezepte/55331-rzpt-lasagne-alla-bolognese, einfachkochen.de/rezepte/kohlrabischnitzel, hellofresh.de korma-chicken-curry…689589be, rezepte.lidl.de/rezepte/klassisches-gulasch, gutekueche.at (1497), weightwatchers.com/de chili-con-carne-pfanne, andy-cooks.com/de lasagne, cookidoo.de r91191, bbcgoodfood.com chilli-con-carne-recipe, recipetineats.com/lasagna, delish.com a51337, kingarthurbaking.com classic-sandwich-bread-recipe

[rs-schema]: https://github.com/hhursev/recipe-scrapers/blob/00b529730a619da361facc7d0b94f0dd26bd517f/recipe_scrapers/_schemaorg.py
[rs-abstract]: https://github.com/hhursev/recipe-scrapers/blob/00b529730a619da361facc7d0b94f0dd26bd517f/recipe_scrapers/_abstract.py
[rs-factory]: https://github.com/hhursev/recipe-scrapers/blob/00b529730a619da361facc7d0b94f0dd26bd517f/recipe_scrapers/_factory.py
[rs-utils]: https://github.com/hhursev/recipe-scrapers/blob/00b529730a619da361facc7d0b94f0dd26bd517f/recipe_scrapers/_utils.py#L254
[rs-og]: https://github.com/hhursev/recipe-scrapers/blob/00b529730a619da361facc7d0b94f0dd26bd517f/recipe_scrapers/_opengraph.py
[rs-fill]: https://github.com/hhursev/recipe-scrapers/blob/00b529730a619da361facc7d0b94f0dd26bd517f/recipe_scrapers/plugins/schemaorg_fill.py
[rs-settings]: https://github.com/hhursev/recipe-scrapers/blob/00b529730a619da361facc7d0b94f0dd26bd517f/recipe_scrapers/settings/default.py
[rs-init]: https://github.com/hhursev/recipe-scrapers/blob/00b529730a619da361facc7d0b94f0dd26bd517f/recipe_scrapers/__init__.py
[rs-chefkoch]: https://github.com/hhursev/recipe-scrapers/blob/00b529730a619da361facc7d0b94f0dd26bd517f/recipe_scrapers/chefkoch.py
[rs-lecker]: https://github.com/hhursev/recipe-scrapers/blob/00b529730a619da361facc7d0b94f0dd26bd517f/recipe_scrapers/lecker.py
[rs-pyproject]: https://github.com/hhursev/recipe-scrapers/blob/00b529730a619da361facc7d0b94f0dd26bd517f/pyproject.toml
[m-rs]: https://github.com/mealie-recipes/mealie/blob/27ad949bef6c685ddf159430e46427c024fa73cc/mealie/services/scraper/recipe_scraper.py
[m-strat]: https://github.com/mealie-recipes/mealie/blob/27ad949bef6c685ddf159430e46427c024fa73cc/mealie/services/scraper/scraper_strategies.py
[m-fetch]: https://github.com/mealie-recipes/mealie/blob/27ad949bef6c685ddf159430e46427c024fa73cc/mealie/services/scraper/fetch.py
[m-clean]: https://github.com/mealie-recipes/mealie/blob/27ad949bef6c685ddf159430e46427c024fa73cc/mealie/services/scraper/cleaner.py
[m-ing]: https://github.com/mealie-recipes/mealie/blob/27ad949bef6c685ddf159430e46427c024fa73cc/mealie/services/parser_services/ingredient_parser.py
[m-base]: https://github.com/mealie-recipes/mealie/blob/27ad949bef6c685ddf159430e46427c024fa73cc/mealie/services/parser_services/_base.py
[m-brute]: https://github.com/mealie-recipes/mealie/blob/27ad949bef6c685ddf159430e46427c024fa73cc/mealie/services/parser_services/brute/process.py
[m-ingdoc]: https://github.com/mealie-recipes/mealie/blob/27ad949bef6c685ddf159430e46427c024fa73cc/docs/docs/contributors/guides/ingredient-parser.md
