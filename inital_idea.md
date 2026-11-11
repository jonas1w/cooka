# Project Spec: Kitchen Inventory, Recipe & HACCP Label Manager

## 1. System-Übersicht & Zielsetzung
Entwicklung einer schlanken, selbstgehosteten Web-Applikation (Mobile-First PWA) für schnelles Gefrier- und Vorrats-Inventar inklusive direktem Netzwerk-Thermodruck (ZPL) von wasserlöslichen HACCP-Etiketten (60 × 40 mm @ 203 dpi) sowie Rezept- und Einkaufslisten-Anbindung.

## 2. Tech-Stack & Architektur
- **Backend:** Go (Golang), Zero-Dependency Standard-Library wo möglich, REST/JSON API.
- **Datenbank:** SQLite (lokale Datei, schnelle Transaktionen, kein Overhead) oder PostgreSQL.
- **Frontend:** SolidJS / SolidStart (oder leichtgewichtige PWA), optimiert für schnelle Touch-Bedienung am Smartphone/Küchen-Tablet mit nassen Händen (große Buttons, minimale Klicktiefe).
- **Deployment:** Single Docker Container (Multi-Stage Build) im lokalen LAN.
  - *Standalone Scraper based on the one mealie uses:* Eigener URL-Importer im Go-Backend, der `<script type="application/ld+json">` (`schema.org/Recipe`) für Titel, Zutaten, Portionen und Nährwerte (kcal, Protein) extrahiert.

## 3. Datenmodell (Kern-Entitäten)
- **`Item` (Vorlage / Rezept / Rohware):**
  - `id`, `name` (max. 25 Zeichen für Label), `default_state` (`FERTIG`, `ROH`, `SOUS-VIDE`, `BLANCHIERT`), `default_portion_text` (z. B. `1 Port. (500 g)`), `shelf_life_days` (z. B. 90, 180), `macros_text` (z. B. `620 kcal | 48g Protein`), `auto_restock` (bool).
- **`StockUnit` (Konkrete Box / Vakuumbeutel im Froster):**
  - `id` (Auto-Increment Kurz-ID für Label, z. B. `402`), `item_id`, `title`, `state`, `quantity_text`, `macros_text`, `frozen_at` (Date), `expires_at` (Date), `status` (`IN_STOCK`, `CONSUMED`, `DISCARDED`), `consumed_at` (Nullable Timestamp).

## 4. Kern-Workflows & API-Endpunkte
1. **Batch-Freeze & Print (`POST /api/stock/batch`):**
   - Nimmt `item_id` (oder Freitext-Attribute) und `count` (z. B. 4 Boxen) entgegen.
   - Erzeugt `N` separate `StockUnit`-Einträge in der DB (jeder Behälter erhält eine eigene eindeutige `id`).
   - Sendet für jede erzeugte Einheit einen ZPL-Printjob per Raw TCP Socket direkt an `<PRINTER_IP>:9100` (Timeout: 3s).
2. **One-Scan Consume (`GET /c/:id` bzw. `POST /api/stock/:id/consume`):**
   - Aufruf über den QR-Code auf dem Etikett (`http://<SHORT_HOST>/c/402`).
   - Setzt Status der `StockUnit` sofort auf `CONSUMED`.
   - Zeigt eine mobile Bestätigungsseite mit **„Undo“-Button** (falls versehentlich gescannt) und aktuellem Restbestand dieses Gerichts im Froster.
   - Falls Restbestand == 0 und `auto_restock == true`: Setzt das Item auf die Einkaufsliste.
3. **Dashboard & NumPad-Fallback (`GET /`):**
   - Übersicht aller `IN_STOCK`-Einheiten gruppiert nach Gericht, sortiert nach `expires_at` (FIFO / Ampellogik für bald ablaufende Boxen).
   - Direkteingabe-Feld (NumPad) für die 4-stellige Label-ID (`#0402`), falls der QR-Code vereist oder beschädigt ist.

## 5. ZPL-Druck-Engine (Exakte Layout-Vorgabe)
- **Hardware-Ziel:** 203 dpi (8 dpmm) Thermodirektdrucker (Zebra GK420d / ZD410 kompatibel), Etikettenmaß 60 × 40 mm (`480 x 320` Dots).
- **Wichtig:** Keine hartcodierten Magic Numbers im String-Template verwenden. Die Positionierung muss über das folgende berechnete Layout-Struct erfolgen:

```go
type CleanLayout struct {
	W, H      int // 480 x 320
	M         int // Außenrand (20)
	Gap       int // Abstand zur vertikalen Hauptlinie (16)
	SplitX    int // Position der vertikalen Hauptlinie (332)
	SubSplitX int // Position des kleinen Teilers zwischen Menge & Datum (184)
	HeaderY   int // Start Y Header (18)
	BoxH      int // Einheitliche Höhe für Badges & Footer-Boxen (42)
	LineY     int // Horizontale Hauptlinie unter Header (72)
	SubLineY  int // Horizontale Teillinie unter Menge/Datum (148)
	FooterY   int // Start Y für beide Footer-Boxen (260)
}

func RenderLabel(title, badge, qty, frozen, mhd, macros, url, id string) string {
	l := CleanLayout{
		W: 480, H: 320, M: 20, Gap: 16,
		SplitX: 332, SubSplitX: 184,
		HeaderY: 18, BoxH: 42,
		LineY: 72, SubLineY: 148, FooterY: 260,
	}

	fullW := l.W - (2 * l.M)               // 440
	leftContentW := l.SplitX - l.M - l.Gap // 296
	rightColX := l.SplitX + l.Gap          // 348
	rightColW := (l.W - l.M) - rightColX   // 112

	col1W := l.SubSplitX - l.M - 12        // 152
	col2X := l.SubSplitX + 14              // 198
	col2W := l.SplitX - col2X - 12         // 122

	vCenter := func(boxY, boxH, fontH int) int {
		return boxY + (boxH-fontH)/2 + 1
	}

	return fmt.Sprintf(`^XA
^CI28
^PW%d^LL%d
^FO%d,%d^A0N,40,40^FB%d,1,0,L,0^FD%s^FS
^FO%d,%d^GB%d,%d,%d^FS
^FO%d,%d^FR^A0N,24,24^FB%d,1,0,C,0^FD%s^FS
^FO%d,%d^GB%d,3,3^FS
^FO%d,%d^GB3,%d,3^FS
^FO%d,%d^A0N,16,16^FDMENGE / GEWICHT^FS
^FO%d,%d^A0N,24,24^FB%d,1,0,L,0^FD%s^FS
^FO%d,%d^GB2,50,2^FS
^FO%d,%d^A0N,16,16^FDEINGEFROREN^FS
^FO%d,%d^A0N,24,24^FB%d,1,0,L,0^FD%s^FS
^FO%d,%d^GB%d,2,2^FS
^FO%d,%d^A0N,18,18^FDHALTBAR BIS (MHD):^FS
^FO%d,%d^A0N,54,54^FB%d,1,0,L,0^FD%s^FS
^FO%d,%d^GB%d,%d,2^FS
^FO%d,%d^A0N,22,22^FB%d,1,0,C,0^FD%s^FS
^FO%d,%d^GB%d,%d,%d^FS
^FO%d,%d^FR^A0N,24,24^FB%d,1,0,C,0^FD%s^FS
^FO%d,%d^BQN,2,4^FDMA,%s^FS
^XZ`,
		l.W, l.H,
		l.M, vCenter(l.HeaderY, l.BoxH, 40)+4, leftContentW, title,
		rightColX, l.HeaderY, rightColW, l.BoxH, l.BoxH,
		rightColX, vCenter(l.HeaderY, l.BoxH, 24), rightColW, badge,
		l.M, l.LineY, fullW,
		l.SplitX, l.LineY, (l.FooterY+l.BoxH)-l.LineY,
		l.M, l.LineY+14,
		l.M, l.LineY+36, col1W, qty,
		l.SubSplitX, l.LineY+12,
		col2X, l.LineY+14,
		col2X, l.LineY+36, col2W, frozen,
		l.M, l.SubLineY, l.SplitX-l.M,
		l.M, l.SubLineY+16,
		l.M, l.SubLineY+42, leftContentW, mhd,
		l.M, l.FooterY, leftContentW, l.BoxH,
		l.M, vCenter(l.FooterY, l.BoxH, 22), leftContentW, macros,
		rightColX, l.FooterY, rightColW, l.BoxH, l.BoxH,
		rightColX, vCenter(l.FooterY, l.BoxH, 24), rightColW, id,
		rightColX+4, l.LineY+10, url,
	)
}
