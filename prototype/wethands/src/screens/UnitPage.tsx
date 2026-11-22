// Unit page: what a label's QR opens in any camera app. Opening it never changes anything.
import { useParams } from "@solidjs/router";
import { createSignal, Show } from "solid-js";
import { db, fmtDate, pastBestBefore, pastUseBy, setDb, setUnitState } from "../data";
import { Btn, Chips } from "../ui";
import s from "./screens.module.css";

export default function UnitPage() {
  const params = useParams();
  const unit = () => db.units.find((u) => u.no === params.no);
  const [discarding, setDiscarding] = createSignal(false);
  const [reason, setReason] = createSignal("Past use-by");
  return (
    <Show when={unit()} fallback={<div class={s.screen}><h1 class={s.h1}>No such label</h1></div>}>
      {(u) => (
        <div class={s.screen}>
          <div class={s.muted}>Freezer label</div>
          <div class={s.no}>{u().no}</div>
          <h1 class={s.h1}>{u().food}</h1>
          <div class={s.pills}>
            <span class={s.pill}>{u().portion}</span>
            <Show when={u().prep}><span class={s.pill}>{u().prep}</span></Show>
            <Show when={u().opened}><span class={`${s.pill} ${s.warn}`}>Opened — finish first</span></Show>
            <Show when={pastBestBefore(u())}><span class={`${s.pill} ${s.warn}`}>Past best-before — use soon, check it</span></Show>
            <Show when={pastUseBy(u())}><span class={`${s.pill} ${s.danger}`}>Past use-by — don't eat</span></Show>
          </div>
          <dl class={s.meta}>
            <dt>Frozen on</dt><dd>{fmtDate(u().frozenOn)}</dd>
            <dt>{u().meaning === "use-by" ? "Use by" : "Best before"}</dt><dd>{fmtDate(u().date)}</dd>
            <Show when={u().kcal}><dt>Macros</dt><dd>{u().kcal} kcal · {u().protein} g protein</dd></Show>
          </dl>

          <div class={s.sticky}>
            <Show when={u().state === "in"} fallback={
              <>
                <div class={s.done}>{u().state === "consumed" ? "✓ Taken out" : "Discarded"}</div>
                <Btn wide needsNet onClick={() => setUnitState(u().no, "in")}>Restore — put back in stock</Btn>
              </>
            }>
              <Show when={discarding()} fallback={
                <>
                  <Show when={!pastUseBy(u())}>
                    <Btn kind="primary" size="primary" wide needsNet onClick={() => setUnitState(u().no, "consumed")}>Take out</Btn>
                  </Show>
                  <div class={s.row2}>
                    <Btn needsNet disabled={pastUseBy(u())} onClick={() => setDb("units", (x) => x.no === u().no, "opened", !u().opened)}>
                      {u().opened ? "Not opened" : "Opened, put back"}
                    </Btn>
                    <Btn kind={pastUseBy(u()) ? "danger" : "secondary"} needsNet onClick={() => setDiscarding(true)}>Discard…</Btn>
                  </div>
                </>
              }>
                <div class={s.muted}>Why? (optional on this instance)</div>
                <Chips options={["Past use-by", "Spoiled", "Quality", "Misprint"] as const} value={reason() as any} onChange={setReason} />
                <div class={s.row2}>
                  <Btn onClick={() => setDiscarding(false)}>Cancel</Btn>
                  <Btn kind="danger" needsNet onClick={() => setUnitState(u().no, "discarded")}>Discard</Btn>
                </div>
              </Show>
            </Show>
          </div>
        </div>
      )}
    </Show>
  );
}
