# One instance language; display formats are separate settings

v1 ships **English** (the source language) and **German**, both complete. Each instance has one **instance language** for its UI and its freezer labels. There is no separate label language. When no language is stored yet, the first page load picks it from the browser's `Accept-Language` (German if it prefers `de`, otherwise English) and stores it immediately. The `COOKA_LANGUAGE` settings lock (ADR 0012) overrides this.

**Translations** live in one flat JSON catalog per language in the repo (`i18n/en.json`, `i18n/de.json`). They are embedded in the binary and shared by the Go side (label captions, share-as-text) and the SPA. Keys are dotted ids and plurals use ICU MessageFormat syntax. Contributions come by pull request (Weblate may read the same files later). CI fails when a shipped language misses or adds a key, or when a label caption exceeds 14 characters. `VERBRAUCHEN BIS` is the one allowed exception, because it is the legal wording and still readable at the 1.6 mm caption minimum. A language is offered only when complete; there is no runtime fallback to English.

**Display formats are their own settings.** The language only supplies their defaults. Formats still on their default follow a language change; overridden ones stay, with "Reset to language default".

- **Date pattern.** One free-text pattern for labels and UI alike, so the bag and the screen match. Tokens: `D`/`DD` day, `M`/`MM` month number, `MMM`/`MMMM` short/long month name, `YY`/`YYYY` year, `ddd`/`dddd` short/long weekday name. Names come in the instance language; `^` uppercases a name token; `[text]` is literal. Defaults: German `DD.MM.YY`, English `DD MMM YY`. Settings previews today's date and a label snippet and warns, but still saves, when the pattern is too wide for the narrowest label slot.
- **Decimal and thousands separators**, set independently (German `,`/none, English `.`/none).
- **Macro display units:** energy in kcal, kJ or both; mass in g or oz. Values are always stored in kcal and g, and dates as ISO dates. Formats change only display and printing. Recipe text is never converted.

**Label captions** are fixed per language and cannot be overridden per instance, because the date meaning separates "still fine" from "must not eat": `EINGEFROREN` / `MIND. HALTBAR` / `VERBRAUCHEN BIS` and `FROZEN` / `BEST BEFORE` / `USE BY`. Never "MHD". Printed labels are physical and never change. Reprints use the current language and formats.

**Recipes stay in their source language.** Neither import nor the AI fallback translates them (translation would break ADR 0009's "keeps the source's wording"). Their language is stored (JSON-LD `inLanguage`, else detected) but not shown. Timer detection, step-ingredient matching and yield parsing recognise every shipped language's words regardless of the instance language, because households import across languages.

**Machine-facing output is locale-free.** CSV exports, recipe JSON-LD and the API use stable English identifiers, ISO dates, a decimal point, and kcal and g, whatever the settings say. Human-facing output (share-as-text, on-screen text) follows the instance language and formats.

We rejected per-person languages (no accounts), a separate label language (labels and screens could disagree), formats bound to the language or to a region picker (households mix them), overridable captions, and translating imported recipes (moved out of scope).
