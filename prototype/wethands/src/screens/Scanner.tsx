// Scanner: camera + numpad. A scan or 4 typed digits consumes immediately.
// Round 6: no status row — results are full-screen pop-ups. "Taken out" closes itself and leaves a one-line
// sticky Undo; past best-before asks Use it / Discard; past use-by offers only Discard / Put back (never eaten).
import { createSignal, For, Match, onCleanup, Show, Switch } from "solid-js";
import { db, fmtDate, inStock, online, pastBestBefore, pastUseBy, setLastTaken, lastTaken, setUnitState, type Unit } from "../data";
import { Btn } from "../ui";
import s from "./screens.module.css";

type Pop =
  | { kind: "taken"; unit: Unit }
  | { kind: "bestbefore"; unit: Unit }
  | { kind: "useby"; unit: Unit }
  | { kind: "discarded"; unit: Unit }
  | { kind: "none"; typed: string }
  | { kind: "pick"; units: Unit[] };

export default function Scanner(props: { embedded?: boolean; onTaken?: (u: Unit) => void; onUndo?: (u: Unit) => void }) {
  const [typed, setTyped] = createSignal("");
  const [pop, setPop] = createSignal<Pop | null>(null);
  const [undoable, setUndoable] = createSignal<Unit | null>(
    !props.embedded && lastTaken() ? db.units.find((u) => u.no === lastTaken()) ?? null : null,
  );
  let timer: number | undefined;
  const flash = (p: Pop, ms = 1800) => { clearTimeout(timer); setPop(p); timer = window.setTimeout(() => setPop(null), ms); };
  onCleanup(() => clearTimeout(timer));

  const consume = (u: Unit) => {
    setUnitState(u.no, "consumed"); setLastTaken(u.no); setUndoable({ ...u });
    props.onTaken?.(u);
    flash({ kind: "taken", unit: { ...u } });
  };
  const take = (u: Unit) => {
    setUndoable(null); // a new scan ends the previous Undo
    if (pastUseBy(u)) return setPop({ kind: "useby", unit: u });
    if (pastBestBefore(u)) return setPop({ kind: "bestbefore", unit: u });
    consume(u);
  };
  const discard = (u: Unit) => { setUnitState(u.no, "discarded"); flash({ kind: "discarded", unit: u }, 1400); };
  const lookup = (digits: string) => {
    const hits = inStock().filter((u) => u.no.slice(-4) === digits);
    if (hits.length === 0) return flash({ kind: "none", typed: digits }, 2200);
    if (hits.length > 1) return setPop({ kind: "pick", units: hits });
    take(hits[0]);
  };
  const press = (k: string) => {
    if (k === "⌫") return setTyped((t) => t.slice(0, -1));
    const next = (typed() + k).slice(0, 4);
    setTyped(next);
    if (next.length === 4) { lookup(next); setTimeout(() => setTyped(""), 250); } // auto-submit
  };
  const undo = () => { const u = undoable()!; setUnitState(u.no, "in"); setLastTaken(null); setUndoable(null); props.onUndo?.(u); };
  const sim = () => (props.embedded ? ["0409", "0402", "0405", "0407"] : ["0412", "0402", "0405", "0407"]);

  return (
    <div class={s.scanner} classList={{ [s.embedded]: props.embedded }}>
      <div class={s.cam}>
        <div class={s.reticle} />
        <div class={s.simulate}>
          <span style={{ color: "#ff3ea5", "font-size": "12px", width: "100%", "text-align": "center" }}>simulate a QR scan:</span>
          <For each={sim()}>{(no) => (
            <button onClick={() => { const u = db.units.find((x) => x.no === no && x.state === "in"); u ? take(u) : flash({ kind: "none", typed: no }, 2200); }}>{no}</button>
          )}</For>
        </div>
        <Show when={!online()}>
          <div class={s.camOff}>Offline — taking out needs a connection.</div>
        </Show>
      </div>

      <div class={s.undoLine}>
        <Show when={undoable()} fallback={<span class={s.muted}>Scan a label or type its number</span>}>
          {(u) => (<>
            <span>✓ {u().food} · {u().no}</span>
            <button class={s.undoBtn} disabled={!online()} onClick={undo}>↩ Undo</button>
          </>)}
        </Show>
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

      <Show when={pop()}>
        <div class={s.pop} classList={{
          [s.popOk]: pop()!.kind === "taken",
          [s.popWarn]: pop()!.kind === "bestbefore",
          [s.popBad]: pop()!.kind === "useby",
        }} onClick={() => ["taken", "none", "discarded"].includes(pop()!.kind) && setPop(null)}>
          <Switch>
            <Match when={pop()!.kind === "taken" && (pop() as any).unit}>{(u) => (<>
              <svg class={s.check} viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /><path d="M14 27l8 8 16-17" /></svg>
              <div class={s.popTitle}>Taken out</div>
              <div class={s.popFood}>{u().food}</div>
              <div class={s.popSub}>{u().no} · {u().portion}{u().opened ? " · was opened" : ""}</div>
            </>)}</Match>
            <Match when={pop()!.kind === "bestbefore" && (pop() as any).unit}>{(u) => (<>
              <div class={s.popIcon}>⚠</div>
              <div class={s.popTitle}>Past best-before</div>
              <div class={s.popFood}>{u().food} · {u().no}</div>
              <div class={s.popSub}>best before {fmtDate(u().date)} — usually still fine. Look, smell, then decide.</div>
              <div class={s.popActions}>
                <Btn kind="primary" size="primary" needsNet onClick={() => consume(u())}>Use it</Btn>
                <Btn size="primary" needsNet onClick={() => discard(u())}>Discard</Btn>
                <Btn kind="ghost" onClick={() => setPop(null)}>Put back</Btn>
              </div>
            </>)}</Match>
            <Match when={pop()!.kind === "useby" && (pop() as any).unit}>{(u) => (<>
              <div class={s.popIcon}>⛔</div>
              <div class={s.popTitle}>Past use-by</div>
              <div class={s.popFood}>{u().food} · {u().no}</div>
              <div class={s.popSub}>use by {fmtDate(u().date)} — don't eat it. Not taken out.</div>
              <div class={s.popActions}>
                <Btn kind="danger" size="primary" needsNet onClick={() => discard(u())}>Discard</Btn>
                <Btn kind="ghost" onClick={() => setPop(null)}>Put back</Btn>
              </div>
            </>)}</Match>
            <Match when={pop()!.kind === "discarded" && (pop() as any).unit}>{(u) => (<>
              <div class={s.popIcon}>🗑</div>
              <div class={s.popTitle}>Discarded</div>
              <div class={s.popSub}>{u().food} · {u().no}</div>
            </>)}</Match>
            <Match when={pop()!.kind === "none" && (pop() as any)}>{(p) => (<>
              <div class={s.popIcon}>?</div>
              <div class={s.popTitle}>No {p().typed} in stock</div>
              <div class={s.popSub}>Already taken out? Check the Freezer.</div>
            </>)}</Match>
            <Match when={pop()!.kind === "pick" && (pop() as any).units}>{(us) => (<>
              <div class={s.popTitle}>Which one?</div>
              <div class={s.popSub}>Two units share these digits.</div>
              <div class={s.popActions}>
                <For each={us() as Unit[]}>{(u) => <Btn size="primary" onClick={() => take(u)} sub={u.food}>{u.no}</Btn>}</For>
                <Btn kind="ghost" onClick={() => setPop(null)}>Cancel</Btn>
              </div>
            </>)}</Match>
          </Switch>
        </div>
      </Show>
    </div>
  );
}
