# Home-first, commercial-tolerant; no HACCP compliance claims

cooka v1 is designed for home kitchens. Small commercial kitchens may run it, and nothing in the model may block them, but they are not a design target and cooka claims no HACCP compliance. Research (no fixed legal label fields for in-house freezing; MHD/Verbrauchsdatum are legal terms) showed that a "HACCP label" promise would be misleading. Real compliance also needs to know who performed each action, which conflicts with the no-accounts constraint.

## Consequences

- The product never calls itself or its labels "HACCP". Docs may say the stock history export and discard reasons can *support* a kitchen's own HACCP documentation.
- **Stock history** is append-only and never purged, in every mode. CSV export is always available.
- The only compliance-flavoured setting is the **discard reason** mode: required / optional / disabled (home default: disabled).
- Explicitly not in v1: per-action "by"/initials (unverifiable without accounts), temperature logging, and a full commercial mode.
