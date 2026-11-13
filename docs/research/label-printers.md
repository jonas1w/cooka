# Label printers for self-hosters: protocols and hardware landscape

Research for ticket #4 (map: #1). Question: which label printers are realistic for
self-hosted home or small-kitchen users, and how can a Go server in a Docker
container drive them? This is input for a decision. It lays out trade-offs and
does not choose a printer.

Date: 2026-11-11. Sources are linked inline. Statements marked **[derived]** are
my own calculations from cited numbers. Statements marked **[unverified]** had no
primary source I could reach. Prices are **[unverified]** throughout: vendors
don't publish them, so treat the bands as rough street-price orientation only.

---

## TL;DR

| Family | Connection a Docker container can reach | Native resolution | Fits 60×40 mm? | Freezer / dissolvable media | Go libraries | QR at ~0.5 mm/module |
|---|---|---|---|---|---|---|
| **Zebra ZPL** (GK420d, ZD410/ZD411, ZD421) | Raw TCP :9100 on Ethernet/Wi-Fi models; USB otherwise | 203 dpi (300 optional) | Yes (2" models print 56 mm wide; see below) | Widest choice: generic 2"/4" direct-thermal freezer stock; DayMark DissolveMark direct-thermal rolls exist | `zplgfa` (bitmap→^GF), `zebrash` (ZPL→image); or plain `net.Dial` | Yes, native `^BQ` or bitmap |
| **ZPL "compatible" clones** (Xprinter, TSC TE-series, etc.) | Depends on SKU: USB only, or USB+LAN | 203 dpi | Usually 4" heads, so yes | Same generic stock as Zebra | Same as Zebra | Likely yes; fidelity of ZPL emulation must be tested |
| **Brother QL** (QL-810W, QL-820NWB, QL-1110NWB; QL-800 is USB only) | Raw TCP :9100 (Wi-Fi/Ethernet models) or USB `/dev/usb/lp0` | **300 dpi** (720-pin head) | No 60×40 die-cut; use 62 mm endless and cut at 40 mm (62×40) | No first-party freezer or dissolvable DK roll found | Small young ports (`go-brother-ql`, `go_brother-ql`); reference impl. is Python `brother_ql` | Yes (300 dpi, 6 dots ≈ 0.5 mm) |
| **Niimbot** (B1, B21, D110 …) | BLE or USB-serial only. No network. | 203 dpi (some 300) | B1/B21: 384-dot head (~48 mm), so print 60×40 rotated | Proprietary RFID-tagged rolls; no freezer/dissolvable product found in sources | Several tiny Go BLE/serial ports; reference is `niimbluelib` (JS) | Yes on paper, but the transport is the problem |
| **Phomemo** (M110/M120/M220, M02 …) | BLE (RFCOMM) or USB | 203 dpi | M110 driver lists 40×60 mm media | No freezer/dissolvable product found in sources | Tiny Go ports; reference is `phomemo-tools` (CUPS, Python) | Yes on paper; same transport problem |
| **IPP / CUPS** | IPP (HTTP :631) to a CUPS server | n/a (driver rasterises) | Driver-dependent | n/a | `phin1x/go-ipp`, `OpenPrinting/goipp` | Driver-dependent |
| **Browser / PDF fallback** | None from the server; the user's device prints | n/a | CSS `@page { size: 60mm 40mm }` | n/a | Server only renders HTML/PDF | Depends on OS driver scaling |

Main findings:

1. **Only ZPL printers and network Brother QLs can be driven directly by a
   containerised server over the LAN.** Both accept raw bytes on TCP 9100. BLE
   printers (Niimbot, Phomemo) need a Bluetooth stack on the host, or the
   browser has to talk to them via Web Bluetooth.
2. **One monochrome bitmap does not fit all, but one renderer does.** Every
   printer here accepts a 1-bit raster (ZPL `^GF`, Brother raster `g`, Niimbot
   `0x85` rows, Phomemo `GS v 0`). Resolution, width and orientation differ,
   though: Brother is 300 dpi and Niimbot B1 prints 60×40 rotated. So a
   "render the label at the device's dpi into a 1-bit image" step plus a thin
   per-protocol encoder works. Resampling one 480×320 bitmap does not.
3. **The 480×320 ZPL layout in `inital_idea.md` fits 2" Zebras, but only just.**
   ZD410/ZD411 print 56 mm (448 dots) on media up to 60 mm wide. The layout's
   content spans x=20..460, which fits if the label is centred.
4. **Zebra EMEA caveat.** Zebra printers placed on the EMEA market since
   1 Aug 2025 (Link-OS ≥ 7.4.2) ship with EU-RED security changes and "certain
   connectivity options disabled by default". Raw 9100 may need enabling first.

---

## 1. ZPL over raw TCP :9100 (Zebra and clones)

### Hardware

- **Zebra GK420d.** 203 dpi, 4.09"/104 mm max print width. Optional 10/100
  internal Ethernet ([GK420 series spec sheet, reseller-hosted](https://www.dimex.co.il/uploads/attachments/29468\gk420_series_product_spec_sheet_a4_en_us.pdf); [GK420d Ethernet spec sheet](https://www.barcodes.com.au/content/Zebra-GK420D-Ethernet-Spec-Sheet-.pdf)).
  Retailers list it as discontinued, e.g. CDW "discontinued 2022-04-12"
  ([CDW](https://www.cdw.com/product/zebra-gk420d-direct-thermal-203-dpi-monochrome-desktop-printer/5663128)).
  I found no Zebra EOL notice. Common on the used market **[unverified]**.
- **Zebra ZD410** (2" class, older): max media width 60 mm. Max print width
  56 mm at 203 dpi, 54 mm at 300 dpi. Roll OD up to 127 mm. Cores 12.7/25.4 mm,
  or larger with an adapter
  ([Zebra ZD410 UG – media specs](https://docs.zebra.com/us/en/printers/desktop/zd410-desktop-printer-ug/media/general-media-and-print-specifications.html)).
- **Zebra ZD411 / ZD421** (current Link-OS desktop line). 203 dpi standard,
  300 optional. ZD411 max print width 56 mm (203) / 54 mm (300). ZD421 104 mm.
  USB + USB Host standard; Ethernet, serial, Wi-Fi/BT dual radio **optional**.
  Languages: ZPL II, EPL 2, XML, ZBI, PDF Direct
  ([ZD411/ZD421 spec sheet](https://www.zebra.com/content/dam/zebra_dam/en/spec-sheets/zd411-spec-sheet-en-us.pdf)).
  The base SKU has **no network**, so buyers must pick the Ethernet or Wi-Fi
  variant.
- **Clones / "ZPL emulation".** Xprinter XP-420B: reseller listings show
  203 dpi with "TSPL, EPL, ZPL, DPL" emulation. Interfaces vary by SKU (USB,
  USB+LAN, BT, Wi-Fi) ([Ezone listing](https://ezonelb.com/product/xprinter-xp-420b-direct-thermal-label-printer);
  [Alibaba listing](https://www.alibaba.co.uk/product-detail/Xprinter-XP-420B-4-Inch-Thermal_1601409776921.html)).
  TSC TE200: native TSPL-EZ, "compatible to EPL, ZPL, ZPL II". Ethernet appears
  on the TE210/TE310 variants, not the base TE200
  ([TSC via Jarltech](https://tsc.jarltech.com/en/product/1320);
  [TSC TE200 datasheet mirror](https://ico.de/img-61/pdf/bdts2e/TSC%20TE200%20Datenblatt.pdf)).
  I found no official Xprinter spec sheet. I also found no published
  conformance list for which ZPL commands (`^BQ`, `^FB`, `^FR`, `^CI28`) the
  emulations implement **[unverified]**.
- **Price bands [unverified]:** used GK420d roughly €60–150. New ZD411 with
  Ethernet roughly €350–500. Xprinter/TSC-class 4" LAN clones roughly €80–200.

### Media (freezer / dissolvable)

- Zebra direct-thermal printers take any generic direct-thermal roll that
  matches the width/core limits above. That gives the widest media ecosystem.
- Freezer-rated direct-thermal labels with cold-temperature adhesive are sold
  for Zebra desktops, e.g. a Zebra 2.25"×2" paper label "with special
  acrylic-based cold temperature adhesive"
  ([Thomas Scientific listing](https://www.thomassci.com/p/labels-zebra-2-25-inch-x-2-inch-direct-thermal-paper-label);
  [PeakTech freezer labels](https://shop.peaktech.com/products/labels-and-supplies/freezer-labels/zebra-2-1_25)).
- Dissolvable: DayMark DissolveMark is direct-thermal stock in 2"×1" and 2"×2"
  rolls. It "dissolve[s] in any temperature of water in less than 30 seconds"
  and is "safe for freezer storage"
  ([WebstaurantStore 2×2](https://www.webstaurantstore.com/daymark-it115693-dissolvemark-2-x-2-blank-dissolvable-direct-thermal-label-roll/322IT115693.html);
  [2×1](https://www.webstaurantstore.com/daymark-it115691-dissolvemark-2-x-1-blank-dissolvable-direct-thermal-label-roll/322IT115691.html)).
  DayMark markets it for its own Matt85 printer. Compatibility with Zebra cores
  and sensors is **[unverified]**. Note there is no 60×40 mm SKU here: 2"×2"
  is 50.8×50.8 mm.

### Protocol

- **Transport.** Link-OS printers listen on TCP 9100 for raw ZPL. TCP 9200
  takes JSON SGD commands. `ip.port` configures the raw port, default 9100. TLS
  raw printing is on `ip.tls.port`, default 9143
  ([Zebra dev forum, Zebra staff](https://developer.zebra.com/content/concurrent-tcp-and-weblink-connections-printer);
  [ZPL PG – ip.tls.port](https://docs.zebra.com/us/en/printers/software/zpl-pg/r-sgd-wireless-sgd-wireless-commands/r-sgd-ip-tls-port.html)).
  A Go server needs only `net.DialTimeout("tcp", host+":9100", 3*time.Second)`
  plus `Write`. That works from a default Docker bridge network because it is
  an outbound TCP connection.
- **EU-RED.** Zebra "has made changes to all printers placed on the market in
  the EMEA region on or after 1st August 2025". This affects "Link-OS version
  7.4.2 or higher", and configuration goes through Protected Mode
  ([Zebra EU RED page](https://www.zebra.com/gb/en/cpn/eu-red-cybersecurity.html)).
  Zebra's user guides say certain connectivity options are disabled by default
  on such units
  ([ZD411 UG – secured features](https://docs.zebra.com/us/en/printers/desktop/zd411t-thermal-transfer-printer/c-mlk-ug-setup/c-modifying-secured-features.html)).
  A reseller says TCP RAW is among them
  ([Jarltech](https://www.jarltech.com/en/news/4031)) **[secondary]**. The
  setup docs should cover enabling port 9100.
- **`^BQ` (native QR).** `^BQa,b,c,d,e`: model 2 (default, recommended);
  magnification 1–100 (suggested "2 on 200 dpi"); ECC H/Q/M/L, default **Q**;
  mask 0–7. Data in `^FD` is prefixed by ECC level and input mode, e.g.
  `^FDMA,…` ([ZPL PG – ^BQ](https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-bq.html)).
- **`^GF` (bitmap).** `^GFa,b,c,d,data`. a = A (ASCII hex), B (binary),
  C (compressed binary). b = byte count. c = total graphic bytes.
  d = bytes per row
  ([ZPL PG – ^GF](https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-gf.html)).
  The ZPL guide also documents B64/Z64 (base64, zlib-compressed) encoding
  ("ZB64 Encoding and Compression" section of the same guide).
  **[derived]** A full 480×320 label is 60 bytes/row × 320 rows = 19,200 bytes,
  or 38,400 hex chars uncompressed. Z64 shrinks mostly-white labels a lot.
- CUPS's own Zebra driver sends whole pages as a downloaded graphic
  (`~DGR:CUPS.GRF` … `^XGR:CUPS.GRF`)
  ([cups/filter/rastertolabel.c](https://github.com/OpenPrinting/cups/blob/master/filter/rastertolabel.c)).
  That is evidence that "bitmap-only ZPL" is a mainstream, well-supported path.

### Go libraries

- [`SimonWaldherr/zplgfa`](https://github.com/SimonWaldherr/zplgfa): MIT, about
  80★, active 2026. `image.Image` → `^GF` in ASCII, Binary, CompressedASCII or
  Z64. Can decode `^GF` back to an image.
- [`ingridhq/zebrash`](https://github.com/ingridhq/zebrash): MIT, about 74★.
  Renders ZPL to raster images. Could serve as a UI preview, or to turn
  ZPL-designed labels into bitmaps for non-ZPL printers.
- [`StirlingMarketingGroup/go-zpl`](https://github.com/StirlingMarketingGroup/go-zpl):
  generate, parse and render ZPL. Young (8★).
- No library is needed for transport.

### QR at 203 dpi on 60×40 mm **[derived]**

- 203 dpi = 8 dots/mm, so `^BQN,2,4` (the idea note) gives **4 dots = 0.5 mm per
  module**. Third-party guidance puts the practical minimum at about
  0.33–0.4 mm per module at 203 dpi
  ([whizz-tech](https://whizz-tech.com/support/printers/radiology-requisition-qr-not-scanning-intake/))
  **[secondary]**, so magnification 3 (0.375 mm) is borderline and 4 is
  comfortable.
- Capacity check. Data codewords from
  [`skip2/go-qrcode` version.go](https://github.com/skip2/go-qrcode/blob/master/version.go):
  V2 = 25×25 modules (L/M/Q/H = 34/28/22/16 codewords); V3 = 29×29
  (55/44/34/26). Byte-mode capacity is (8·cw − 12)/8, so V2-M = 26 bytes,
  V2-Q = 20, V3-Q = 32.
  - `http://cooka.lan/c/402` (22 bytes) at ZPL's default ECC **Q** needs **V3**:
    29×4 = 116 dots = 14.5 mm. At x = 352 (idea layout) it ends at 468, past the
    20-dot right margin (460) but inside the label.
  - With ECC **M** (`^FDMA,` → `^FDMM,…` / `^BQN,2,4,M`) or uppercase
    alphanumeric mode (`HTTP://COOKA.LAN/C/402`: 4+9+11·11 = 134 bits ≤ 176)
    it fits **V2**: 100 dots = 12.5 mm, inside the 112-dot right column.
  - Quiet zone: 4 modules is what go-qrcode emits by default
    ([regular_symbol.go](https://github.com/skip2/go-qrcode/blob/master/regular_symbol.go),
    `quietZoneSize() = 4`). That is 16 dots at magnification 4. The idea layout
    leaves about 17 dots between the vertical rule (x = 332..335) and the QR
    (x = 352), and about 10 dots above it. The top quiet zone is tight.
  - Short host names and IDs keep the code at V2. That is the main lever for
    reliable scans on a frosty bag.
- ZD411/ZD410 print width 448 dots on 480-dot-wide media
  ([ZD410 UG](https://docs.zebra.com/us/en/printers/desktop/zd410-desktop-printer-ug/media/general-media-and-print-specifications.html)):
  with the media centred, roughly x = 16..464 is printable. The idea layout's
  content (20..460) fits. Anything at x < 16 or > 464 is lost.

---

## 2. Brother QL series (raster protocol)

### Hardware

- Models supported by `brother_ql`: QL-500…QL-1100, verified including
  QL-700, QL-710W, QL-720NW, QL-800, QL-810W, QL-820NWB, QL-1060N
  ([pklaus/brother_ql README](https://github.com/pklaus/brother_ql)).
  QL-800 has **no network interface**
  ([cpouldev/go-brother-ql README](https://github.com/cpouldev/go-brother-ql)).
  For LAN use: QL-810W (Wi-Fi), QL-820NWB (Ethernet/Wi-Fi/BT), QL-1110NWB.
- **Resolution: 300 dpi**, head 720 pins. Every raster line is 90 bytes
  regardless of tape
  ([Brother QL-800/810W/820NWB Raster Command Reference v1.01, pp. 19–20](https://download.brother.com/welcome/docp100278/cv_ql800_eng_raster_101.pdf)).
  A 600-dpi-in-feed-direction high-res mode exists (same doc, `ESC i K` expanded mode).
- Label sizes (same doc, pp. 14–16, 300-dpi dots). Endless 12/29/38/50/54/62 mm.
  The 62 mm tape has 696 printable dots = 58.9 mm. Die-cut sizes include
  17×54, 29×42, 29×90, 38×90, 39×48, 52×29, 54×29, 60×86, 62×29, 62×60, 62×75,
  62×100, and round 12/24/58 mm. **There is no 60×40 mm die-cut.** The natural
  equivalent is 62 mm endless cut at 40 mm (auto-cutter), i.e. 62×40 mm,
  696×472 printable dots **[derived]**.
- Price bands **[unverified]:** QL-810W/820NWB roughly €120–250. DK rolls are
  proprietary (cassette with a size-ID). Third-party clones are common.

### Media

- I found no first-party Brother DK freezer-rated or water-dissolvable roll.
  Brother sells removable paper (DK-3235, "great for food safety",
  [Brother CA](https://www.brother.ca/en/p/DK3235)) and paper/film DK rolls (e.g. DK-22205
  continuous paper) — none marketed as freezer-rated. Freezer suitability
  of DK-1202 rests on customer anecdotes only. Third-party "DK-compatible"
  freezer or dissolvable rolls are **[unverified]**.

### Protocol

- Job layout: 400-byte invalidate (NULs), `ESC @` init, then per page
  `ESC i a 01` (raster mode), `ESC i z` (print info: media type/width/length/
  raster count), `ESC i M` (auto-cut), `ESC i K` (expanded/cut-at-end),
  `ESC i d` (margin), `M 02` (TIFF/PackBits compression), then raster lines
  `g …` (`w` for two-colour), `Z` for a blank line, and `0x0C` (page) or
  `0x1A` (last page) (Raster Command Reference §2.1 pp. 5–7; §4 pp. 22–36).
- Status: `ESC i S` returns a fixed 32-byte status (media type/width, errors,
  phase). The host should check status before sending, and cannot send commands
  until printing completes (pp. 4, 22–27). Over the network "print data from the
  operating system's port monitor is simply sent as is" (§5.9, p. 44).
- `brother_ql`'s network backend connects to **TCP 9100** by default
  ([backends/network.py](https://github.com/pklaus/brother_ql/blob/master/brother_ql/backends/network.py)).
  It "doesn't support reading back the printer state" over network. Wrong-label
  and end-of-roll errors go undetected
  ([README](https://github.com/pklaus/brother_ql)).
- Raster lines are mirrored: `brother_ql` does `FLIP_LEFT_RIGHT` before packing
  ([raster.py#L234](https://github.com/pklaus/brother_ql/blob/master/brother_ql/raster.py)).
- USB: Linux `/dev/usb/lp0` (kernel backend) or libusb. Models with "Editor
  Lite" must have it switched off for USB raster printing
  ([README](https://github.com/pklaus/brother_ql)). In Docker that means
  `--device /dev/usb/lp0`.
- Brother also documents ESC/P and P-touch Template modes for the QL-820NWB
  (built-in fonts/barcodes)
  ([ESC/P reference](https://download.brother.com/welcome/docp100306/cv_ql820_eng_escp_101.pdf);
  [P-touch Template](https://download.brother.com/welcome/docp100307/cv_ql820_eng_ptemp_102.pdf)).
  Not investigated further. Raster is the portable path.

### Libraries

- Reference: [`pklaus/brother_ql`](https://github.com/pklaus/brother_ql). Python,
  GPL-3.0, about 730★, last push 2026-01. Legacy CLI tools deprecated. A web UI
  exists: [`brother_ql_web`](https://github.com/pklaus/brother_ql_web).
  [`matmair/brother_ql-inventree`](https://github.com/matmair/brother_ql-inventree)
  fork is archived.
- Go: [`cpouldev/go-brother-ql`](https://github.com/cpouldev/go-brother-ql)
  (GPL-3.0, port of brother_ql, pure-Go conversion + TCP, optional libusb, QL-800
  is its only verified hardware, 0★).
  [`suapapa/go_brother-ql`](https://github.com/suapapa/go_brother-ql) (MIT,
  network + linux_kernel backends, 0★).
  [`mhavo/goqlprinter`](https://github.com/mhavo/goqlprinter) (web UI/REST).
  All young and low-adoption. **License note:** a GPL port would affect cooka's
  licence choice. The MIT one, or a clean-room encoder written from Brother's
  public PDF, avoids that. The protocol is small (about 10 commands).

### QR

- 300 dpi ≈ 11.8 dots/mm **[derived]**. 6 dots/module ≈ 0.51 mm, so the same
  physical QR as Zebra magnification 4 is easy. There is no native QR command
  in raster mode. The server renders it into the bitmap.

---

## 3. Niimbot, Phomemo and other BLE "app" printers

### Niimbot

- Reverse-engineered protocol. Packets are `55 55 | cmd | len | data |
  XOR-checksum | AA AA`. Bitmap rows are `0x85` (packed 1-bit) and `0x84`
  (empty rows), and there are grey/two-colour variants. PrinterInfo reports
  203 or 300 dpi. RFID commands (`0x1a`) read the paper tag. Error codes
  include `WrongPaper`
  ([NIIMBOT community wiki – protocol](https://printers.niim.blue/interfacing/proto/)).
  Whether printers refuse untagged or third-party rolls is not stated
  **[unverified]**.
- [`AndBondStyle/niimprint`](https://github.com/AndBondStyle/niimprint) (Python,
  MIT, about 480★) supports B1/B18/B21/D11/D110 over BT or USB-serial. The
  printers are "8 pixels per mm (~203 dpi)". B21/B1/B18 max **384 px** width
  (about 48 mm). Its example prints an 80×50 mm label rotated
  (`-r 90`, 640×384 px).
  **[derived]** 60×40 mm works rotated: 320 dots across the head, 480 rows.
- [`MultiMote/niimbluelib`](https://github.com/MultiMote/niimbluelib) (MIT,
  "most accurate open source implementation") and
  [`niimblue`](https://github.com/MultiMote/niimblue) web app (about 830★). Both
  run **in the browser** via Web Bluetooth / Web Serial. The README says Safari
  has no native Web Bluetooth.
- Go: several very small ports, e.g.
  [`datumbrain/niimbot-d110-api`](https://github.com/datumbrain/niimbot-d110-api) (53★),
  [`MarkusOderSo/niimgo`](https://github.com/MarkusOderSo/niimgo) (USB-serial),
  [`petrovich811/niimbot`](https://github.com/petrovich811/niimbot) (BLE, Linux).
- Media: proprietary RFID-tagged rolls. I found no freezer or dissolvable SKU in
  primary sources **[unverified]**.
- Price bands **[unverified]:** €30–80.

### Phomemo

- [`vivier/phomemo-tools`](https://github.com/vivier/phomemo-tools) (GPL-3.0,
  about 480★) is a CUPS driver for M02/M02 Pro/M02S/M110/M120/M220/T02/M832,
  "reverse-engineered sniffing the bluetooth packets". It connects over BT
  RFCOMM (`/dev/rfcomm0`) or USB (`/dev/usb/lp0`, `ttyACM0`).
- M110 driver: 203 dpi and a media list including **40×60 mm**
  ([phomemo-m110.drv](https://github.com/vivier/phomemo-tools/blob/master/cups/drv/phomemo-m110.drv)).
  The data is ESC/POS-style `GS v 0` raster (1-bit, width/8 bytes per row)
  plus vendor `ESC N` / `0x1f` setup commands
  ([rastertopm110.py](https://github.com/vivier/phomemo-tools/blob/master/cups/filter/rastertopm110.py)).
- Go: tiny ports (e.g. [`n2k/phomemo_d35`](https://github.com/n2k/phomemo_d35),
  [`sgrankin/phomemo`](https://github.com/sgrankin/phomemo)).
- Price bands **[unverified]:** €40–100.

### Server reachability (both)

- No network interface, so the cooka container cannot reach them over the LAN.
  Options:
  1. **USB to the Docker host.** Pass the device through (`--device
     /dev/usb/lp0` or `/dev/ttyACM0`,
     [docker run --device](https://docs.docker.com/reference/cli/docker/container/run/#device)).
     The printer must then sit next to the server.
  2. **BLE from the host.** The container needs the host's BlueZ, typically
     host networking plus the D-Bus socket mounted, or privileged mode
     **[unverified – common practice]**. Pairing, range and flakiness are the
     user's problem.
  3. **Browser-side printing.** The PWA renders the bitmap and sends it via Web
     Bluetooth/Web Serial, as niimblue does. This needs Chromium-based browsers
     (Android Chrome, desktop Chrome/Edge). It does not work on iOS Safari
     ([niimblue README](https://github.com/MultiMote/niimblue);
     [MDN Web Bluetooth](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API#browser_compatibility)).
- These printers are cheap, but the protocols are reverse-engineered and vary
  across models and firmware. Niimblue itself asks for packet dumps for new
  models and has "print task versions"
  ([niimblue README](https://github.com/MultiMote/niimblue)).

---

## 4. IPP / CUPS

- Go clients: [`phin1x/go-ipp`](https://github.com/phin1x/go-ipp) (Apache-2.0,
  about 170★, stdlib-only, IPP 2.0 client plus CUPS extensions) and
  [`OpenPrinting/goipp`](https://github.com/OpenPrinting/goipp) (BSD-2, RFC 8010
  core).
- Label printers rarely speak IPP natively. I found no IPP support in the
  ZD411/ZD421 spec sheet's language list above. In practice IPP means **a CUPS
  server** with a driver:
  - Zebra ZPL/EPL/CPCL: CUPS built-in `rastertolabel`
    ([source](https://github.com/OpenPrinting/cups/blob/master/filter/rastertolabel.c)).
  - Brother QL: [`printer-driver-ptouch`](https://github.com/philpem/printer-driver-ptouch)
    (CUPS/foomatic, about 145★, last push 2025-03).
  - Phomemo: `phomemo-tools`. USB-only class printers can be exposed via
    [`OpenPrinting/ipp-usb`](https://github.com/OpenPrinting/ipp-usb) only if
    the device implements IPP-over-USB.
- Trade-off: CUPS adds a second daemon (host or sidecar container), driver
  install, and per-printer queue setup. That conflicts with "single container,
  zero config" but buys the broadest model coverage. The Go side only POSTs a
  PDF/PNG over IPP.

---

## 5. Browser / PDF printing fallback

- The server renders the label as HTML (or PDF) sized with CSS Paged Media
  `@page { size: 60mm 40mm; margin: 0 }`
  ([W3C css-page-3 §size](https://www.w3.org/TR/css-page-3/#page-size-prop)), and
  the user prints through the OS dialog to whatever driver they have (Brother,
  Dymo, Zebra, Rollo …).
- Pros: works with **any** printer that has an OS driver, needs zero server
  integration, and gives a universal escape hatch.
- Cons: an extra dialog per batch (bad for "freeze 4 boxes → 4 labels"), driver
  and browser scaling ("fit to page") can shrink QR modules below a safe size
  ([whizz-tech note on scale-to-fit](https://whizz-tech.com/support/printers/etsy-order-sheet-qr-fails-pixel-density-lock/)
  **[secondary]**), and there is no status feedback. Mobile print to label
  printers is often unavailable **[unverified]**.
- A PDF at exact physical size plus a 1-bit PNG download also serves people who
  print from vendor apps (Niimbot/Phomemo apps import images).

---

## 6. Can one rendered monochrome bitmap go to all of them?

| Target | Bitmap command | Row format | Resolution | Orientation for 60×40 | Notes |
|---|---|---|---|---|---|
| ZPL | `^GF` A/B/C or Z64 ([ZPL PG](https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-gf.html)) | MSB-first, 1 = black, ceil(w/8) bytes | 203 (or 300) | As-is, 480×320 | `^PW`/`^LL` set size; CUPS uses `~DG`+`^XG` |
| Brother QL | `g` raster lines, opt. PackBits ([Raster Ref](https://download.brother.com/welcome/docp100278/cv_ql800_eng_raster_101.pdf)) | Always 90 bytes (720 pins) incl. margin pins, **mirrored** | **300** | 62 mm across head | `ESC i z` must match loaded media |
| Niimbot | `0x85` PrintBitmapRow ([proto](https://printers.niim.blue/interfacing/proto/)) | Packed 1-bit + black-pixel counts | 203 (some 300) | **Rotated 90°** (B1/B21 ≤ 384 px) | Per-model "print task" variants |
| Phomemo | `GS v 0` ([rastertopm110.py](https://github.com/vivier/phomemo-tools/blob/master/cups/filter/rastertopm110.py)) | 1-bit, width/8 bytes | 203 | M110 40×60: rotated | Vendor setup bytes before raster |
| CUPS/IPP | PDF/PNG/PWG-raster → driver | n/a | Driver | Driver | Driver does the rest |
| Browser | HTML/PDF | n/a | OS | OS | No control over scaling |

**[derived]** Yes in principle: all of them ultimately take a 1-bit raster. In
practice cooka would need:

1. A **layout renderer** that draws text, lines and the QR into a 1-bit
   `image.Gray`/`image.Paletted` at the **target's dpi and orientation**.
   Rescaling a 203-dpi bitmap to 300 dpi (Brother) blurs QR modules and text.
   Rendering the layout in mm units fixes that.
2. A small **encoder per protocol**: ZPL `^GF` (zplgfa or about 30 lines),
   Brother raster (about 10 commands + PackBits), Niimbot/Phomemo (row packets).
3. A **transport**: TCP 9100 (ZPL, Brother network), device file (USB), IPP,
   or "hand the PNG/PDF to the browser".

Trade-off vs. native ZPL text/`^BQ`: native ZPL is tiny (about 1 KB), uses
printer fonts and printer-generated QR, and is easy to debug. But it ties the
layout to ZPL and to emulation fidelity on clones. Bitmap-only is about
20–40 KB per label over the LAN (negligible). It needs a font and a rasteriser
in the Go binary (e.g. `golang.org/x/image/font` + an embedded TTF), and it
gives pixel-identical output across printers and in the web preview. A hybrid
is also possible: native ZPL for Zebra, bitmap for everything else, with
`zebrash` rendering the ZPL to a preview/bitmap.

---

## 7. Trade-off summary (no decision)

| Criterion | ZPL network (Zebra/clone) | Brother QL network | BLE (Niimbot/Phomemo) | CUPS/IPP | Browser/PDF |
|---|---|---|---|---|---|
| Container → printer with zero host setup | Yes (TCP 9100) | Yes (TCP 9100) | No | No (needs CUPS) | n/a (client prints) |
| One-tap batch printing | Yes | Yes | Only via browser BLE (Chromium) | Yes | No (dialog) |
| 60×40 mm @ 203 dpi as in idea note | Exact | 62×40 @ 300 dpi | Rotated, 203 dpi | Driver | Approximate |
| Freezer / dissolvable stock | Best (generic DT rolls, DissolveMark) | Weak (proprietary DK, none found) | Weak (proprietary RFID rolls) | Same as printer | Same as printer |
| Protocol docs | Official vendor manual | Official vendor manual | Reverse-engineered | Standard (RFC 8010/8011) | Standard (CSS) |
| Go maturity | Good (zplgfa, zebrash) | Young ports / easy to write | Fragile, tiny ports | Good (go-ipp) | n/a |
| Status / error feedback | 9200 JSON SGD / `~HS` (not researched) | `ESC i S` over USB; not via brother_ql network | Yes (protocol) but over BLE | IPP job state | None |
| Entry cost [unverified] | €60–150 used, €350+ new | €120–250 | €30–100 | — | €0 |
| Gotchas | EU units: 9100 may be disabled; 2" heads print 56 mm | 300 dpi, mirrored rows, cassette ID must match `ESC i z` | Model/firmware drift; iOS no Web Bluetooth | Second daemon, drivers | QR scaling, no automation |

### Open questions for the decision

- Is "print directly from the server" a hard requirement, or is "the phone
  prints via BLE" acceptable for a second tier?
- Should the canonical label format be ZPL text (as in the idea note) or a
  dpi-independent layout rendered to a bitmap?
- Is dissolvable media a must (pushes towards generic 2" direct-thermal, i.e.
  Zebra-class) or a nice-to-have?
- Licence: avoid GPL ports (brother_ql derivatives, phomemo-tools) if cooka
  wants a permissive licence.
