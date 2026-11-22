// Scanner: camera + numpad. A scan or 4 typed digits consumes immediately; Undo stays until the next scan.
import { createSignal, For, Match, Show, Switch } from "solid-js";
import { db, inStock, online, pastUseBy, setLastTaken, lastTaken, setUnitState, type Unit } from "../data";
import { Btn } from "../ui";
import { useGo } from "../nav";
import s from "./screens.module.css";

type Result = { kind: "taken"; unit: Unit } | { kind: "useby"; unit: Unit } | { kind: "none"; typed: string } | { kind: "pick"; units: Unit[] } | { kind: "undone"; unit: Unit };

export default function Scanner() {
  const go = useGo();
  const [typed, setTyped] = createSignal("");
  const [result, setResult] = createSignal<Result | null>(
    lastTaken() ? { kind: "taken", unit: db.units.find((u) => u.no === lastTaken())! } : null,
  );

  const take = (u: Unit) => {
    if (pastUseBy(u)) return setResult({ kind: "useby", unit: u });
    setUnitState(u.no, "consumed"); setLastTaken(u.no);
    setResult({ kind: "taken", unit: { ...u } });
  };
  const lookup = (digits: string) => {
    const hits = inStock().filter((u) => u.no.slice(-4) === digits);
    if (hits.length === 0) return setResult({ kind: "none", typed: digits });
    if (hits.length > 1) return setResult({ kind: "pick", units: hits });
    take(hits[0]);
  };
  const press = (k: string) => {
    if (k === "⌫") return setTyped((t) => t.slice(0, -1));
    const next = (typed() + k).slice(0, 4);
    setTyped(next);
    if (next.length === 4) { lookup(next); setTimeout(() => setTyped(""), 250); } // auto-submit
  };
  const undo = (u: Unit) => { setUnitState(u.no, "in"); setLastTaken(null); setResult({ kind: "undone", unit: u }); };

  return (
    <div class={s.scanner}>
      <div class={s.cam}>
        <div class={s.reticle} />
        <div class={s.simulate}>
          <span style={{ color: "#ff3ea5", "font-size": "12px", width: "100%", "text-align": "center" }}>simulate a QR scan:</span>
          <For each={["0412", "0399", "0405", "0408"]}>{(no) => (
            <button onClick={() => { const u = db.units.find((x) => x.no === no)!; u.state === "in" ? take(u) : setResult({ kind: "none", typed: no }); }}>{no}</button>
          )}</For>
        </div>
        <Show when={!online()}>
          <div class={s.camOff}>Offline — taking out needs a connection.<br />Units can't be consumed until cooka is reachable.</div>
        </Show>
      </div>

      <div class={s.result} classList={{ [s.ok]: result()?.kind === "taken", [s.bad]: result()?.kind === "useby" }}>
        <Switch fallback={<div class={s.what}><span class={s.muted}>Scan a label or type its number</span></div>}>
          <Match when={result()?.kind === "taken" && (result() as any).unit}>{(u) => (<>
            <div class={s.what}><span class={s.muted}>✓ Taken out · {u().no}</span><b>{u().food}</b><span class={s.muted}>{u().portion}{u().opened ? " · was opened" : ""}</span></div>
            <Btn kind="secondary" onClick={() => undo(u())} needsNet>Undo</Btn>
          </>)}</Match>
          <Match when={result()?.kind === "undone" && (result() as any).unit}>{(u) => (
            <div class={s.what}><span class={s.muted}>↩ Back in stock · {u().no}</span><b>{u().food}</b></div>
          )}</Match>
          <Match when={result()?.kind === "useby" && (result() as any).unit}>{(u) => (<>
            <div class={s.what}><span>⚠ Past use-by — not taken out</span><b>{u().food} · {u().no}</b></div>
            <Btn kind="danger" onClick={() => go(`/u/${u().no}`)}>Discard…</Btn>
          </>)}</Match>
          <Match when={result()?.kind === "none" && (result() as any)}>{(r) => (
            <div class={s.what}><b>No unit {r().typed} in stock</b><span class={s.muted}>Already taken out? Check the Freezer.</span></div>
          )}</Match>
          <Match when={result()?.kind === "pick" && (result() as any).units}>{(us) => (
            <div class={s.what}><span class={s.muted}>Two units share these digits — which one?</span>
              <div class={s.pick} style={{ "grid-template-columns": "1fr 1fr", display: "grid", "margin-top": "8px" }}>
                <For each={us() as Unit[]}>{(u) => <Btn kind="secondary" onClick={() => take(u)} sub={u.food}>{u.no}</Btn>}</For>
              </div>
            </div>
          )}</Match>
        </Switch>
      </div>

      <div class={s.pad} style={{ opacity: online() ? 1 : 0.4, "pointer-events": online() ? "auto" : "none" }}>
        <div class={s.digits}>
          <For each={[0, 1, 2, 3]}>{(i) => <span>{typed()[i] ?? ""}</span>}</For>
        </div>
        <div class={s.keys}>
          <For each={["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"]}>{(k) =>
            k === "" ? <span /> : <button onClick={() => press(k)}>{k}</button>
          }</For>
        </div>
      </div>
    </div>
  );
}
