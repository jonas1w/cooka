// PROTOTYPE — floating variant switcher + simulated device state. Dev builds only.
import { useLocation, useSearchParams } from "@solidjs/router";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { VARIANTS, VARIANT_NAMES, useVariant, type Variant } from "./nav";
import { taps } from "./data";
import s from "./Switcher.module.css";

export default function Switcher(props: { device: string }) {
  const [sp, setSp] = useSearchParams();
  const v = useVariant();
  const loc = useLocation();
  const cycle = (d: number) => {
    const i = Math.max(0, VARIANTS.indexOf(v()));
    setSp({ variant: VARIANTS[(i + d + VARIANTS.length) % VARIANTS.length] }, { replace: true });
  };
  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest("input, textarea, [contenteditable]")) return;
    if (e.key === "ArrowLeft") cycle(-1);
    if (e.key === "ArrowRight") cycle(1);
  };
  onMount(() => window.addEventListener("keydown", onKey));
  onCleanup(() => window.removeEventListener("keydown", onKey));
  const toggle = (k: string, on: string, off?: string) =>
    setSp({ [k]: sp[k] === on ? off : on }, { replace: true });

  const [more, setMore] = createSignal(props.device !== "fill");
  return (
    <div class={s.bar} classList={{ [s.top]: props.device === "fill" }}>
      <button onClick={() => cycle(-1)} aria-label="Previous variant">◀</button>
      <span class={s.label}><b>{v()}</b><Show when={more()}> — {VARIANT_NAMES[v() as Variant]}</Show></span>
      <button onClick={() => cycle(1)} aria-label="Next variant">▶</button>
      <button onClick={() => setMore(!more())}>{more() ? "–" : "⋯"}</button>
      <Show when={more()}>
      <span class={s.sep} />
      <select value={props.device} onChange={(e) => setSp({ device: e.currentTarget.value }, { replace: true })}>
        <option value="phone">Phone</option>
        <option value="tablet">Tablet</option>
        <option value="fill">Fill</option>
      </select>
      <button classList={{ [s.on]: sp.net === "off" }} onClick={() => toggle("net", "off")}>Offline</button>
      <button classList={{ [s.on]: sp.update === "1" }} onClick={() => toggle("update", "1")}>Update ready</button>
      <button classList={{ [s.on]: sp.printer === "off" }} onClick={() => toggle("printer", "off")}>No printer</button>
      <span class={s.sep} />
      <span class={s.taps} title="Taps since last on Home">{loc.pathname} · taps from home: <b>{taps()}</b></span>
      </Show>
    </div>
  );
}
