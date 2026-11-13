# What must an HACCP / freezer label contain?

Research for ticket #3 (map: #1). Status: findings only, no decision.
Researched 2026-11-11. Every claim cites its source; anything not verified against a primary source is marked as such.

## TL;DR

- **At home, no label is legally required.** EU food-hygiene law explicitly excludes private domestic storage/preparation (VO 852/2004 Art. 1(2)(b)), and the LMIV applies only to food business operators (LMIV Art. 1(3), recital 15).
- **In a commercial kitchen, no regulation prescribes a fixed "HACCP label" for in-house frozen or prepped food.** The duty is to run a HACCP-based system (852/2004 Art. 5) and keep the cold chain (Annex II Ch. IX(5)). Labels with name and date are the usual way to meet that, but they are good practice, not a legally defined format.
- **Fixed legal label contents exist only when food is *placed on the market*.** Prepacked food needs the LMIV Art. 9(1) list. Frozen meat, meat preparations and unprocessed fish need "eingefroren am …" (LMIV Annex III no. 6, Annex X no. 3). Non-prepacked food (Gastro, lose Ware) needs only allergen information (LMIV Art. 44; LMIDV § 4).
- **MHD vs. Verbrauchsdatum:** these are legal terms with fixed wording ("mindestens haltbar bis" / "zu verbrauchen bis"). Food past its Verbrauchsdatum counts as unsafe (LMIV Art. 24(1)). A home-freezer "best before" date is not either of these in law.
- **Dissolvable direct-thermal labels exist** (Zebra 8000D Dissolvable, DayMark DissolveMark, NCCO DateCodeGenie). The datasheets list a service range down to −40 °C, a **minimum application temperature of about −6 °C / 21 °F**, a ~24 h adhesive dwell time, and a warning against premature exposure to water or high humidity.

## 1. Legally required vs. good practice

### 1.1 Who the rules apply to

| Rule | Applies to | Private household? | Source |
|---|---|---|---|
| VO (EG) 852/2004 (food hygiene, HACCP) | Food business operators | **Excluded**: "die häusliche Verarbeitung, Handhabung oder Lagerung von Lebensmitteln zum häuslichen privaten Verbrauch" | [852/2004 Art. 1(2)(b)][852] |
| VO (EG) 178/2002 (General Food Law) | "Lebensmittelunternehmen", "gleichgültig, ob sie auf Gewinnerzielung ausgerichtet sind oder nicht" | Not a business | [178/2002 Art. 3 Nr. 2][178] |
| VO (EU) 1169/2011 (LMIV, food information) | Food business operators at all stages, incl. mass caterers ("Anbieter von Gemeinschaftsverpflegung") | Not covered. Recital 15: applies only to undertakings with "eine gewisse Kontinuität der Aktivitäten" and organisation, not to occasional handling by private persons (charity events, local fairs) | [LMIV Art. 1(3), recital 15][lmiv] |
| LMIDV (German implementing ordinance for the LMIV) | Food for end consumers or mass caterers | Not covered | [LMIDV § 1][lmidv] |

Note: 178/2002 counts non-profit operations as food businesses too, so a canteen, club kitchen or Kita kitchen is in scope even without profit ([178/2002 Art. 3 Nr. 2][178]).

### 1.2 Commercial kitchen: what the law actually asks for

- **HACCP system, not a label format.** Operators must "einzurichten, durchzuführen und aufrechtzuerhalten" permanent procedures based on HACCP principles: identify hazards, set critical control points, critical limits, monitoring, corrective actions, verification, and records ([852/2004 Art. 5(1)–(2)][852]). The regulation does not set any label fields for in-house food.
- **Cold chain.** "Die Kühlkette darf nicht unterbrochen werden" for foods that can support pathogen growth ([852/2004 Annex II Ch. IX point 5][852]).
- **The only labelling duty in Annex II** covers *hazardous/inedible substances*, which must be labelled and stored separately (Ch. IX point 8). Nothing in Annex II requires labels on in-house food containers ([852/2004 Annex II][852]).
- **Traceability** must be ensured "in allen Produktions-, Verarbeitungs- und Vertriebsstufen" ([178/2002 Art. 18][178]). This is one step up and one step down (suppliers and customers), not a label requirement.
- **Freezing in Gastro (Bavarian enforcement guidance).** Freezing food before its MHD/Verbrauchsdatum in restaurants or communal catering "ist nicht zu beanstanden, sofern diese sachgerecht und hygienisch einwandfrei eingefroren wurden". Freezing *after* the Verbrauchsdatum is generally inadmissible, because such food "gilt … grundsätzlich als nicht sicher" ([StMUV/LGL LMIV-FAQ, questions 20–21][lgl-faq]). To show that something was frozen in time, the kitchen needs to know the original date and the freezing date. This is the practical reason Gastro labels record dates. It is an inference, not a stated rule.
- **Sector guidelines.** The national "Leitlinie für eine gute Lebensmittelhygienepraxis in der Gastronomie" (DEHOGA, 3rd ed. 7/2022) is the reference practice document coordinated with the Länder authorities ([IHK Berlin][ihk-berlin]; [Lebensmittelverband list of GHP guidelines][lmv-ghp]). **It is paywalled and was not read for this note.** Its exact label recommendations are therefore *unverified* (see Open questions).

### 1.3 Placing food on the market: legally fixed contents

These apply only if cooka labels are used for food that is **sold or handed out by a food business**. They do not apply to a home freezer or to purely in-house mise en place.

**Prepacked food** ("vorverpacktes Lebensmittel": a sales unit for the end consumer; food packed at the point of sale on request is excluded, [LMIV Art. 2(2)(e)][lmiv]). Mandatory particulars under [LMIV Art. 9(1)][lmiv]:
(a) name of the food, (b) list of ingredients, (c) allergens per Annex II, highlighted, (d) quantity of certain ingredients, (e) net quantity, (f) **MHD or Verbrauchsdatum**, (g) special **storage/use conditions**, (h) **name/address of the responsible food business operator**, (i) country of origin where required, (j) instructions for use where needed, (k) alcohol content > 1.2 %, (l) nutrition declaration.

**Frozen meat, frozen meat preparations, frozen unprocessed fishery products:** "das Datum des Einfrierens oder das Datum des ersten Einfrierens" ([LMIV Annex III no. 6.1][lmiv]), worded "eingefroren am …" ([LMIV Annex X no. 3][lmiv]). This is the only place where EU law requires a **freezing date** on a label.

**Quick-frozen foods (Tiefkühlkost) sold to consumers/caterers** under Directive 89/108/EEC must have: a designation including "tiefgefroren" (or "Tiefkühlkost", "tiefgekühlt", "gefrostet"); the storage period and storage temperature/equipment at the recipient's; a batch identifier; and "Nach dem Auftauen nicht wieder einfrieren". "Tiefgefroren" also means the product is kept at ≤ −18 °C throughout ([Dir. 89/108/EEC Art. 1(2), Art. 8(1)][89-108]). In Germany this is implemented by the TLMV. The gesetze-im-internet.de page could not be retrieved for this note, so the national text is *unverified*.

**Non-prepacked food (lose Ware, restaurant dishes, canteen food):** only the **allergen information** (Art. 9(1)(c)) is mandatory EU-wide. Other particulars apply only if a member state requires them ([LMIV Art. 44(1)][lmiv]). Germany allows this information on a sign, menu, notice or electronic medium, or orally if a written record of the ingredients exists and a notice says so ([LMIDV § 4(2)–(4)][lmidv]). This information goes to the guest. The law does not require it on the freezer box.

The 14 allergen groups ([LMIV Annex II][lmiv]): gluten-containing cereals, crustaceans, eggs, fish, peanuts, soybeans, milk (incl. lactose), tree nuts, celery, mustard, sesame, sulphur dioxide/sulphites (> 10 mg/kg or l), lupin, molluscs.

## 2. Field by field

| Field | Legally required where | Home / in-house practice | Sources |
|---|---|---|---|
| Product name | Prepacked food (Art. 9(1)(a)) | Universally recommended ("Inhalt") | [LMIV][lmiv]; consumer advice below |
| Production date | Nowhere as such | Common Gastro convention (*unverified* against the DEHOGA Leitlinie) | — |
| Freezing date | Frozen meat/meat preps/unprocessed fish placed on market: "eingefroren am …" | Recommended: "jedes Gefäß mit einem genauen Einfrierdatum versehen" | [LMIV Annex III 6, Annex X 3][lmiv]; [LAVES][laves] |
| MHD ("mindestens haltbar bis") | Prepacked food that is not highly perishable | A home "eat by" date has no legal status | [LMIV Art. 2(2)(r), Annex X 1][lmiv] |
| Verbrauchsdatum ("zu verbrauchen bis") | Prepacked, microbiologically highly perishable food; must be followed by storage conditions; must be on each prepacked single portion | — | [LMIV Art. 24(1), Annex X 2][lmiv] |
| Storage conditions/temperature | Where special conditions are needed (Art. 25(1)); always for quick-frozen food (89/108 Art. 8(1)(b)) | LAVES recommends −18 to −22 °C | [LMIV][lmiv]; [89/108][89-108]; [LAVES][laves] |
| Allergens | Prepacked: on label, highlighted. Non-prepacked: given to the guest by sign, menu or orally with records | Useful for households with allergies; not required | [LMIV Art. 9, 44][lmiv]; [LMIDV § 4][lmidv] |
| Responsible person | Prepacked: name/address of the *business* (Art. 9(1)(h)). No law requires a staff name or initials on internal labels | Gastro convention (staff initials) *unverified* | [LMIV][lmiv] |
| Batch / lot | Quick-frozen food placed on market | A unique stock-unit ID (cooka's QR/short ID) does a similar job | [89/108 Art. 8(1)(c)][89-108] |
| "Nach dem Auftauen nicht wieder einfrieren" | Quick-frozen food placed on market | LAVES: thawed goods "sollten … direkt weiterverwendet werden" | [89/108][89-108]; [LAVES][laves] |

Semantics, from the federal authority (BVL): after the **Verbrauchsdatum** food "dürfen … nicht verkauft" and should not be eaten ("red light"). After the **MHD** food can "oft problemlos verzehrt werden" after checking ("yellow light") ([BVL FAQ MHD][bvl]).

Home shelf-life guidance (consumer advice, not law): frozen meals stay good for "etwa drei Monate", mashed potatoes about two months, homemade baby food about one month ([LAVES "Auf Eis gelegt"][laves]).

## 3. Dissolvable labels: direct thermal and freezer

| Product | Direct thermal | Service temp. | Min. application temp. | Dissolving | Caveats | Source |
|---|---|---|---|---|---|---|
| Zebra 8000D Dissolvable | Yes (no ribbon); mid-range or high-performance DT printers recommended | −40 °C to 80 °C, after correct application and ~24 h dwell | −6 °C (21 °F); label and surface must be above this | Disperses best in a stream of warm water; adhesive leaves no residue | "Avoid premature exposure to water or high humidity"; water listed as "Not Recommended" in the chemical resistance table; indoor only; shelf life 6 months at 22 °C / 50 % RH; min. 10 pt font and 10 mil bar width | [Zebra spec][zebra] |
| DayMark DissolveMark | Sold as "Dissolvable Direct Thermal Label" | −40 °F to 176 °F per brochure (as summarised in search results) | 21 °F (≈ −6 °C) | "30 seconds or less", any water temperature | Brochure PDF could not be parsed; figures come from a retailer listing and search summary, so *partially verified* | [DayMark brochure][daymark], [retailer listing][daymark-listing] |
| NCCO DateCodeGenie Dissolving | Not stated on the product page | Freezer "down to −40" (unit not given) | 21 °F | In any water temperature; no time given | Washable containers only | [NCCO][ncco] |

What this means for cooka's workflow (from the datasheets, not tested):

- **Compatible with direct thermal:** yes, for products sold as direct-thermal stock, such as Zebra 8000D, which matches the GK420d/ZD410 class in `inital_idea.md`.
- **Freezer:** service temperatures down to −40 °C are listed. But the labels must be **applied above about −6 °C** and need a dwell time (Zebra: "usually 24 hours"). Labels should therefore go on the box *before* it goes into the freezer, not on already-frozen packs.
- **Moisture:** frost and condensation (for example when a box is taken out and thaws) count as the "water / high humidity" exposure the Zebra sheet warns about. How long the label and its QR code stay readable under frost was **not found in any datasheet**.
- **Size:** the products found are mostly US inch formats (1×1", 2×1", 2×2"). Whether 60 × 40 mm dissolvable DT stock is available in the EU was not checked.

## Open questions

1. What does the DEHOGA Gastro Leitlinie (3rd ed. 2022) actually recommend for label fields (production vs. freezing date, initials, maximum frozen storage)? It is paywalled and not verified.
2. National TLMV text (German implementation of 89/108/EEC) could not be fetched.
3. No primary source was found on how well a QR code on direct-thermal or dissolvable stock survives frost or condensation. A practical test would answer this.
4. Is dissolvable DT stock available in 60 × 40 mm in the EU, and from which suppliers?
5. Is cooka only for homes, or also for small commercial or non-profit kitchens (club kitchen, Kita, food truck)? The answer changes which section above applies.

## Sources

Primary legal texts:
- [852]: VO (EG) Nr. 852/2004, consolidated 2021-03-24, EUR-Lex: https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:02004R0852-20210324
- [178]: VO (EG) Nr. 178/2002, EUR-Lex: https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:32002R0178
- [lmiv]: VO (EU) Nr. 1169/2011 (LMIV), EUR-Lex: https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:32011R1169
- [89-108]: Richtlinie 89/108/EWG (tiefgefrorene Lebensmittel), EUR-Lex: https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:31989L0108
- [lmidv]: Lebensmittelinformations-Durchführungsverordnung (LMIDV), gesetze-im-internet.de: https://www.gesetze-im-internet.de/lmidv/BJNR227210017.html

Authority guidance:
- [lgl-faq]: StMUV/LGL Bayern, FAQ zur LMIV (Vollzugshinweise), questions 20–21: https://www.lgl.bayern.de/lebensmittel/kennzeichnung/lmiv_faq.htm
- [bvl]: BVL, FAQ Mindesthaltbarkeitsdatum/Verbrauchsdatum: https://www.bvl.bund.de/DE/Arbeitsbereiche/01_Lebensmittel/03_Verbraucher/17_FAQ/FAQ_MHD/FAQ_MHD_node.html
- [laves]: LAVES Niedersachsen, "Auf Eis gelegt – richtig einfrieren" (consumer advice): https://www.laves.niedersachsen.de/startseite/lebensmittel/lebensmittelhygiene/verbrauchertipps_zum_umgang_mit_lebensmitteln/auf-eis-gelegt-richtig-einfrieren-220245.html
- [ihk-berlin]: IHK Berlin on hygiene guidelines: https://www.ihk.de/berlin/service-und-beratung/recht-und-steuern/gewerberecht/lebensmittelrecht-und-produktkennzeichnung/lebensmittelhygieneverordnung-2265336
- [lmv-ghp]: Lebensmittelverband, list of national GHP guidelines (as of 7/2026): https://www.lebensmittelverband.de/fileadmin/Seiten/Lebensmittel/Sicherheit_und_Recht/Hygiene/Leitlinien_GHP_mit_Bezugsquellen_Stand_7_2026.pdf

Manufacturer data:
- [zebra]: Zebra 8000D Dissolvable spec: https://www.zebra.com/us/en/products/spec-sheets/supplies/labels-tags/8000d-dissolvable.html
- [daymark]: DayMark DissolveMark brochure (PDF): https://argo.webstaurantstore.com/documents/pdf/brochure/dissolvemark_brochure_daymark.pdf
- [daymark-listing]: DayMark IT115693 listing: https://www.webstaurantstore.com/daymark-it115693-dissolvemark-2-x-2-blank-dissolvable-direct-thermal-label-roll/322IT115693.html
- [ncco]: NCCO DateCodeGenie dissolving labels: https://www.ncco.com/products/date-code-genie/datecodegenie-labels/dissolving-labels-datecodegenie-labels/

[852]: https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:02004R0852-20210324
[178]: https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:32002R0178
[lmiv]: https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:32011R1169
[89-108]: https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:31989L0108
[lmidv]: https://www.gesetze-im-internet.de/lmidv/BJNR227210017.html
[lgl-faq]: https://www.lgl.bayern.de/lebensmittel/kennzeichnung/lmiv_faq.htm
[bvl]: https://www.bvl.bund.de/DE/Arbeitsbereiche/01_Lebensmittel/03_Verbraucher/17_FAQ/FAQ_MHD/FAQ_MHD_node.html
[laves]: https://www.laves.niedersachsen.de/startseite/lebensmittel/lebensmittelhygiene/verbrauchertipps_zum_umgang_mit_lebensmitteln/auf-eis-gelegt-richtig-einfrieren-220245.html
[ihk-berlin]: https://www.ihk.de/berlin/service-und-beratung/recht-und-steuern/gewerberecht/lebensmittelrecht-und-produktkennzeichnung/lebensmittelhygieneverordnung-2265336
[lmv-ghp]: https://www.lebensmittelverband.de/fileadmin/Seiten/Lebensmittel/Sicherheit_und_Recht/Hygiene/Leitlinien_GHP_mit_Bezugsquellen_Stand_7_2026.pdf
[zebra]: https://www.zebra.com/us/en/products/spec-sheets/supplies/labels-tags/8000d-dissolvable.html
[daymark]: https://argo.webstaurantstore.com/documents/pdf/brochure/dissolvemark_brochure_daymark.pdf
[daymark-listing]: https://www.webstaurantstore.com/daymark-it115693-dissolvemark-2-x-2-blank-dissolvable-direct-thermal-label-roll/322IT115693.html
[ncco]: https://www.ncco.com/products/date-code-genie/datecodegenie-labels/dissolving-labels-datecodegenie-labels/
