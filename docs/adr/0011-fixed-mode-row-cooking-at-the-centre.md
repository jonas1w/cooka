# Fixed mode row, cooking at the centre

cooka is used mostly while cooking, often with wet or greasy hands, so the UI is built around cooking mode. Every screen ends in the same four-button mode row — Cook · Take out · Freezer · Shopping list — and there is no home screen; cooka opens on Cook. A cooking session survives leaving cooking mode (step, servings, timers, units taken out) and every other screen offers "Back to cooking"; taking units out and adding shopping list entries also open as panels inside cooking mode, so the recipe is never left. Tablets use the same mode row. Scan results are full-screen: "Taken out" closes by itself and leaves a one-line Undo until the next scan; a unit past best-before now asks "Use it / Discard / Put back" instead of being consumed (amending ADR 0004's scan-consumes rule), while a unit past use-by is still never consumed.

We tried five navigation shapes in the wet-hands prototype (`prototype/wet-hands-ux` branch): conventional bottom tabs with a Freezer home, a scanner-first dark UI with a thumb rail, a launcher of big tiles with a Home bar, the launcher plus a fixed dock, and the launcher plus a per-screen context bar. The launcher's big, plain layout won, but a Home bar made every switch two taps and a context bar that changed per screen was hard to learn; a fixed row of modes kept the simplicity without either cost. We rejected parallel cooking sessions for v1 (one at a time; timers keep running) — possibly a later "advanced" setting — and a separate tablet layout (side rail or split screen).

## Consequences

- Design tokens: minimum tap target 64px (76px for a screen's primary action), 18px body text (15 / 23 / 30px scale), 14px gap, 16px padding, light warm palette.
- Offline and "Update ready" share one thin line at the top of the screen; writes that need the server stay visible, disabled, labelled "Needs connection".
- The take-out flow is phrased and modelled as taking *a thing in stock* out, not specifically a freezer unit, so pantry items (v2, barcodes) can join the same scanner and cooking-mode panel without a redesign.
- Labelling has no mode of its own: it is reached from Freezer and from "Freeze portions".
- No dialog library was needed in any prototyped flow (Kobalte unused); confirmations are inline or full-screen pop-ups.
