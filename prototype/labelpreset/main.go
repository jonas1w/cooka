// PROTOTYPE — throwaway. Answers "Label preset layouts" (jonas1w/cooka#16):
// do 60×40, 57×32 and 2"×2" fit their fields at readable sizes, at 203 and 300 dpi?
// Renders 1-bit bitmaps (as the real renderer would, ADR 0005) plus a contact sheet.
//
// Run: cd prototype/labelpreset && go run .   → writes out/*.png
package main

import (
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"math"
	"os"
	"path/filepath"
	"strings"

	qrcode "github.com/skip2/go-qrcode"
	"golang.org/x/image/font"
	"golang.org/x/image/font/gofont/gobold"
	"golang.org/x/image/font/opentype"
	"golang.org/x/image/math/fixed"
)

// ---------- samples ----------

type Sample struct {
	Name                                     string
	Title, Number, Date, StoredOn            string
	Portion, Prep, Macros, Host              string
	CapDate, CapStored, CapPortion           string
}

var en = Sample{CapDate: "BEST BEFORE", CapStored: "FROZEN ON", CapPortion: "PORTION"}
var de = Sample{CapDate: "VERBRAUCHEN BIS", CapStored: "EINGEFROREN", CapPortion: "MENGE"}

func samples() []Sample {
	n := en
	n.Name, n.Title, n.Number, n.Date, n.StoredOn = "normal", "Bolognese", "0402", "11.02.2027", "13.11.2026"
	n.Portion, n.Prep, n.Macros, n.Host = "500 g", "cooked", "620 kcal · 38 g P", "COOKA.LAN"

	w := de
	w.Name = "worst"
	w.Title = "Gefüllte Paprikaschoten mit Hackfleisch!" // 40
	w.Number, w.Date, w.StoredOn = "A0402", "28.02.2027", "30.11.2026"
	w.Portion = "12 Stück à ca. 85 g, roh" // 24
	w.Prep = "sous-vide 56"                // 12
	w.Macros = "1240 kcal · 96 g P · 54 g F · 88 g KH"
	w.Host = "COOKA.HOME.EXAMPLE.DE"
	l := w
	l.Name, l.Host = "longhost", "COOKA.FAMILIE-MUSTERMANN.DE" // 27 → payload 41 → v3
	return []Sample{n, w, l}
}

// ---------- renderer ----------

type Fonts struct{ Bold, Semi, Med *opentype.Font }

type R struct {
	img   *image.Gray
	dpm   float64 // dots per mm
	fonts Fonts
	cache map[string]font.Face
	notes []string
}

func NewR(wmm, hmm, dpi float64, f Fonts) *R {
	dpm := dpi / 25.4
	img := image.NewGray(image.Rect(0, 0, int(math.Round(wmm*dpm)), int(math.Round(hmm*dpm))))
	draw.Draw(img, img.Bounds(), image.White, image.Point{}, draw.Src)
	return &R{img: img, dpm: dpm, fonts: f, cache: map[string]font.Face{}}
}

func (r *R) d(mm float64) int { return int(math.Round(mm * r.dpm)) }

func (r *R) face(f *opentype.Font, px int) font.Face {
	k := fmt.Sprintf("%p/%d", f, px)
	if fc, ok := r.cache[k]; ok {
		return fc
	}
	fc, _ := opentype.NewFace(f, &opentype.FaceOptions{Size: float64(px), DPI: 72, Hinting: font.HintingFull})
	r.cache[k] = fc
	return fc
}

func (r *R) fill(x, y, w, h float64, c color.Gray) {
	draw.Draw(r.img, image.Rect(r.d(x), r.d(y), r.d(x+w), r.d(y+h)), image.NewUniform(c), image.Point{}, draw.Src)
}
func (r *R) hline(x, y, w, t float64) { r.fill(x, y, w, t, color.Gray{0}) }
func (r *R) vline(x, y, h, t float64) { r.fill(x, y, t, h, color.Gray{0}) }

const (
	Left = iota
	Center
)

type St struct {
	F        *opentype.Font
	Max, Min float64 // em size in mm
	Lines    int
	Align    int
	Invert   bool
}

func wrap2(fc font.Face, s string, wpx int) ([]string, bool) {
	words := strings.Fields(s)
	for i := len(words) - 1; i >= 1; i-- {
		a, b := strings.Join(words[:i], " "), strings.Join(words[i:], " ")
		if font.MeasureString(fc, a).Ceil() <= wpx && font.MeasureString(fc, b).Ceil() <= wpx {
			return []string{a, b}, true
		}
	}
	return nil, false
}

func ellipsize(fc font.Face, s string, wpx int) string {
	rs := []rune(s)
	for len(rs) > 0 {
		t := strings.TrimRight(string(rs), " ") + "…"
		if font.MeasureString(fc, t).Ceil() <= wpx {
			return t
		}
		rs = rs[:len(rs)-1]
	}
	return "…"
}

const lh = 1.04 // line height factor for wrapped lines

// Fit draws s into box (mm): shrink → wrap (if Lines==2) → "…". Returns a note.
func (r *R) Fit(label string, x, y, w, h float64, s string, st St) {
	if s == "" {
		return
	}
	wpx, hpx := r.d(w), r.d(h)
	maxPx, minPx := r.d(st.Max), r.d(st.Min)
	var lines []string
	var px int
	how := ""
	for p := maxPx; p >= minPx; p-- { // 1 line
		fc := r.face(st.F, p)
		if font.MeasureString(fc, s).Ceil() <= wpx && p <= hpx {
			lines, px = []string{s}, p
			break
		}
	}
	if st.Lines == 2 { // take 2 lines whenever that allows a bigger size than 1 line
		for p := maxPx; p > px && p >= minPx; p-- {
			if float64(p)*(1+lh) > float64(hpx) {
				continue
			}
			if ls, ok := wrap2(r.face(st.F, p), s, wpx); ok {
				lines, px, how = ls, p, "wrapped"
				break
			}
		}
	}
	if lines == nil {
		px = minPx
		if st.Lines == 2 && float64(px)*(1+lh) <= float64(hpx) {
			fc := r.face(st.F, px)
			// greedy first line, ellipsize the rest
			words := strings.Fields(s)
			i := 0
			for i < len(words) && font.MeasureString(fc, strings.Join(words[:i+1], " ")).Ceil() <= wpx {
				i++
			}
			lines = []string{strings.Join(words[:i], " "), ellipsize(fc, strings.Join(words[i:], " "), wpx)}
			how = "wrapped+TRUNCATED"
		} else {
			lines = []string{ellipsize(r.face(st.F, px), s, wpx)}
			how = "TRUNCATED"
		}
	}
	fc := r.face(st.F, px)
	m := fc.Metrics()
	capH := float64(m.CapHeight.Ceil())
	blockH := capH + float64(len(lines)-1)*float64(px)*lh
	top := float64(r.d(y)) + (float64(hpx)-blockH)/2
	src := image.Black
	if st.Invert {
		src = image.White
	}
	for i, ln := range lines {
		lw := font.MeasureString(fc, ln).Ceil()
		xx := r.d(x)
		if st.Align == Center {
			xx += (wpx - lw) / 2
		}
		base := top + capH + float64(i)*float64(px)*lh
		dr := font.Drawer{Dst: r.img, Src: src, Face: fc, Dot: fixed.P(xx, int(math.Round(base)))}
		dr.DrawString(ln)
	}
	r.notes = append(r.notes, fmt.Sprintf("  %-8s %4.1fmm (%2dpx) %s", label, float64(px)/r.dpm, px, how))
}

// QR: version auto (alphanumeric for uppercase), EC M, module = ceil(0.5mm).
// Returns QR side in mm. Draws with no border; caller leaves the quiet zone.
func (r *R) QR(x, y, box float64, payload string) float64 {
	q, err := qrcode.New(payload, qrcode.Medium)
	if err != nil {
		panic(err)
	}
	q.DisableBorder = true
	bm := q.Bitmap()
	mod := int(math.Ceil(0.5 * r.dpm))
	if fit := int(box * r.dpm / float64(len(bm))); fit < mod {
		mod = fit
	}
	x0, y0 := r.d(x)+(r.d(box)-len(bm)*mod)/2, r.d(y)
	for j, row := range bm {
		for i, on := range row {
			if on {
				draw.Draw(r.img, image.Rect(x0+i*mod, y0+j*mod, x0+(i+1)*mod, y0+(j+1)*mod), image.Black, image.Point{}, draw.Src)
			}
		}
	}
	side := float64(len(bm)*mod) / r.dpm
	r.notes = append(r.notes, fmt.Sprintf("  QR       v%d (%d mod) %d dots/mod = %.2fmm/mod, side %.1fmm  [%s]",
		q.VersionNumber, len(bm), mod, float64(mod)/r.dpm, side, payload))
	return side
}

func (r *R) threshold() {
	for i, v := range r.img.Pix {
		if v < 128 {
			r.img.Pix[i] = 0
		} else {
			r.img.Pix[i] = 255
		}
	}
}

func payload(s Sample) string { return "HTTPS://" + s.Host + "/" + s.Number }

// ---------- presets (all coordinates in mm) ----------

type Preset struct {
	Name   string
	W, H   float64
	Render func(r *R, s Sample, f Fonts)
}

// shared bits
func caption(r *R, x, y, w float64, s string, f Fonts) {
	r.Fit("caption", x, y, w, 1.8, s, St{F: f.Semi, Max: 2.0, Min: 1.6})
}
func numberBox(r *R, x, y, w, h float64, s Sample, f Fonts) {
	r.fill(x, y, w, h, color.Gray{0})
	r.Fit("number", x+0.5, y, w-1, h, s.Number, St{F: f.Bold, Max: 6.0, Min: 3.5, Align: Center, Invert: true})
}
func prepBadge(r *R, x, y, w, h float64, s Sample, f Fonts) {
	if s.Prep == "" {
		return
	}
	r.fill(x, y, w, h, color.Gray{0})
	r.Fit("prep", x+0.5, y, w-1, h, strings.ToUpper(s.Prep), St{F: f.Bold, Max: 3.0, Min: 2.0, Align: Center, Invert: true})
}

var presets = []Preset{
	{"60x40", 60, 40, func(r *R, s Sample, f Fonts) {
		// CleanLayout-derived: title + prep badge header, QR + number right column.
		m := 2.0
		split := 42.5 // vertical rule
		rx, rw := split+1.5, 60-m-(split+1.5)
		r.Fit("title", m, m, split-m-1, 8, s.Title, St{F: f.Bold, Max: 7, Min: 3.0, Lines: 2})
		prepBadge(r, rx, m+0.5, rw, 6, s, f)
		r.hline(m, 10.5, 60-2*m, 0.35)
		r.vline(split, 10.5, 40-m-10.5, 0.35)
		// portion | frozen on
		caption(r, m, 11.6, 23, s.CapPortion, f)
		r.Fit("portion", m, 13.8, 23.5, 4.2, s.Portion, St{F: f.Semi, Max: 3.6, Min: 2.4})
		r.vline(26.3, 11.5, 7, 0.25)
		caption(r, 27.3, 11.6, split-28, s.CapStored, f)
		r.Fit("stored", 27.3, 13.8, split-28, 4.2, s.StoredOn, St{F: f.Semi, Max: 3.6, Min: 2.4})
		r.hline(m, 19.2, split-m, 0.25)
		// date
		caption(r, m, 20.3, split-m-1, s.CapDate, f)
		r.Fit("date", m, 22.6, split-m-1, 6.5, s.Date, St{F: f.Bold, Max: 7, Min: 4})
		// macros footer
		r.fill(m, 31, split-m-1.2, 7, color.Gray{0})
		r.fill(m+0.3, 31.3, split-m-1.8, 6.4, color.Gray{255})
		r.Fit("macros", m+0.8, 31, split-m-2.8, 7, s.Macros, St{F: f.Med, Max: 3.2, Min: 2.2, Align: Center})
		// QR + number
		r.QR(rx+0.4, 12.0, rw-0.8, payload(s))
		numberBox(r, rx, 31, rw, 7, s, f)
	}},
	{"57x32", 57, 32, func(r *R, s Sample, f Fonts) {
		m := 1.5
		split := 40.5
		rx, rw := split+1.2, 57-m-(split+1.2)
		r.Fit("title", m, m, 57-2*m, 7, s.Title, St{F: f.Bold, Max: 6, Min: 2.8, Lines: 2})
		r.hline(m, 9.0, 57-2*m, 0.35)
		r.vline(split, 9.0, 32-m-9.0, 0.35)
		caption(r, m, 10.0, split-m-1, s.CapDate, f)
		r.Fit("date", m, 12.2, split-m-1, 5.6, s.Date, St{F: f.Bold, Max: 6, Min: 3.5})
		r.hline(m, 18.6, split-m, 0.25)
		// macros dropped on 57x32 (decision #16)
		sw := 15.0
		caption(r, m, 19.4, sw-1, s.CapStored, f)
		r.Fit("stored", m, 21.3, sw-1, 3.6, s.StoredOn, St{F: f.Semi, Max: 3.2, Min: 2.2})
		r.vline(m+sw-0.6, 19.2, 6, 0.25)
		caption(r, m+sw, 19.4, split-m-sw-1, s.CapPortion, f)
		r.Fit("portion", m+sw, 21.3, split-m-sw-1, 3.6, s.Portion, St{F: f.Semi, Max: 3.2, Min: 2.2})
		prepBadge(r, m, 26.0, 16, 4.5, s, f)
		r.QR(rx+0.2, 10.0, rw-0.4, payload(s))
		numberBox(r, rx, 24.0, rw, 6.5, s, f)
	}},
	{"2x2in", 50.8, 50.8, func(r *R, s Sample, f Fonts) {
		m := 2.0
		W := 50.8
		split := 33.0
		rx, rw := split+1.2, W-m-(split+1.2)
		r.Fit("title", m, m, W-2*m, 10, s.Title, St{F: f.Bold, Max: 7.5, Min: 3.2, Lines: 2})
		r.hline(m, 12.6, W-2*m, 0.35)
		r.vline(split, 12.6, 40.0-12.6, 0.35)
		caption(r, m, 13.8, split-m-1, s.CapDate, f)
		r.Fit("date", m, 16.0, split-m-1, 6.0, s.Date, St{F: f.Bold, Max: 6.5, Min: 4})
		r.hline(m, 23.0, split-m, 0.25)
		caption(r, m, 24.0, split-m-1, s.CapStored, f)
		r.Fit("stored", m, 26.0, split-m-1, 3.8, s.StoredOn, St{F: f.Semi, Max: 3.6, Min: 2.4})
		caption(r, m, 31.0, split-m-1, s.CapPortion, f)
		r.Fit("portion", m, 33.0, split-m-1, 3.8, s.Portion, St{F: f.Semi, Max: 3.6, Min: 2.4})
		r.hline(m, 40.0, W-2*m, 0.35)
		bx := m
		if s.Prep != "" {
			prepBadge(r, m, 41.5, 15, 7, s, f)
			bx = m + 16
		}
		r.Fit("macros", bx, 41.5, W-m-bx, 7, s.Macros, St{F: f.Med, Max: 3.2, Min: 2.2, Lines: 2})
		r.QR(rx+0.4, 14.0, rw-0.8, payload(s))
		numberBox(r, rx, 31.0, rw, 7.5, s, f)
	}},
}

// ---------- main ----------

func load(p string) *opentype.Font {
	b, err := os.ReadFile(p)
	if err != nil {
		panic(err)
	}
	f, err := opentype.Parse(b)
	if err != nil {
		panic(err)
	}
	return f
}

func main() {
	dir := "."
	out := filepath.Join(dir, "out")
	os.MkdirAll(out, 0o755)
	barlow := Fonts{
		Bold: load(filepath.Join(dir, "fonts/BarlowSemiCondensed-Bold.ttf")),
		Semi: load(filepath.Join(dir, "fonts/BarlowSemiCondensed-SemiBold.ttf")),
		Med:  load(filepath.Join(dir, "fonts/BarlowSemiCondensed-Medium.ttf")),
	}
	gb, _ := opentype.Parse(gobold.TTF)
	gofonts := Fonts{gb, gb, gb}
	fontsets := []struct {
		name string
		f    Fonts
	}{{"barlow", barlow}, {"gobold", gofonts}}

	type tile struct {
		img  *image.Gray
		name string
	}
	for _, fs := range fontsets {
		var tiles []tile
		for _, p := range presets {
			for _, dpi := range []float64{203, 300} {
				for _, s := range samples() {
					r := NewR(p.W, p.H, dpi, fs.f)
					p.Render(r, s, fs.f)
					r.threshold()
					name := fmt.Sprintf("%s_%s_%ddpi_%s", fs.name, p.Name, int(dpi), s.Name)
					fmt.Printf("%s  (%dx%d dots)\n", name, r.img.Bounds().Dx(), r.img.Bounds().Dy())
					for _, n := range r.notes {
						if strings.TrimSpace(n) != "" && !strings.HasPrefix(strings.TrimSpace(n), "0.0mm") {
							fmt.Println(n)
						}
					}
					save(filepath.Join(out, name+".png"), r.img)
					tiles = append(tiles, tile{r.img, name})
				}
			}
		}
		// contact sheet: everything at ~24 px/mm (203×3, 300×2), nearest-neighbour
		const gap = 30
		cols := 4
		var cw, rh []int
		cw = make([]int, cols)
		for i, t := range tiles {
			sc := 3
			if strings.Contains(t.name, "300dpi") {
				sc = 2
			}
			w, h := t.img.Bounds().Dx()*sc, t.img.Bounds().Dy()*sc
			if w > cw[i%cols] {
				cw[i%cols] = w
			}
			if i%cols == 0 {
				rh = append(rh, 0)
			}
			if h > rh[len(rh)-1] {
				rh[len(rh)-1] = h
			}
		}
		W, H := gap, gap
		for _, c := range cw {
			W += c + gap
		}
		for _, h := range rh {
			H += h + gap
		}
		sheet := image.NewGray(image.Rect(0, 0, W, H))
		draw.Draw(sheet, sheet.Bounds(), image.NewUniform(color.Gray{200}), image.Point{}, draw.Src)
		y := gap
		for row := range rh {
			x := gap
			for c := 0; c < cols; c++ {
				i := row*cols + c
				if i >= len(tiles) {
					break
				}
				t := tiles[i]
				sc := 3
				if strings.Contains(t.name, "300dpi") {
					sc = 2
				}
				b := t.img.Bounds()
				for yy := 0; yy < b.Dy()*sc; yy++ {
					for xx := 0; xx < b.Dx()*sc; xx++ {
						sheet.SetGray(x+xx, y+yy, t.img.GrayAt(xx/sc, yy/sc))
					}
				}
				x += cw[c] + gap
			}
			y += rh[row] + gap
		}
		save(filepath.Join(out, "sheet_"+fs.name+".png"), sheet)
	}
}

func save(p string, img image.Image) {
	f, _ := os.Create(p)
	defer f.Close()
	png.Encode(f, img)
}
