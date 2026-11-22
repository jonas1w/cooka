// Freezer: stock grouped by Food; "use first" floats up. Read-only — taking out happens on unit page or scanner.
import { createSignal, For, Show } from "solid-js";
import { fmtDate, inStock, pastBestBefore, pastUseBy, type Unit } from "../data";
import { useGo } from "../nav";
import s from "./screens.module.css";

export default function Freezer() {
  const go = useGo();
  const [openFood, setOpenFood] = createSignal<string | null>(null);
  const groups = () => {
    const m = new Map<string, Unit[]>();
    for (const u of inStock()) m.set(u.food, [...(m.get(u.food) ?? []), u]);
    return [...m.entries()].sort((a, b) => urgency(b[1]) - urgency(a[1]) || a[0].localeCompare(b[0]));
  };
  return (
    <div class={s.screen}>
      <h1 class={s.h1}>Freezer <span class={s.muted} style={{ "font-size": "var(--fs)" }}>· {inStock().length} units</span></h1>
      <div class={s.grid}>
        <For each={groups()}>{([food, units]) => (
          <div class={s.group}>
            <button class={s.groupHead} onClick={() => (units.length === 1 ? go(`/u/${units[0].no}`) : setOpenFood(openFood() === food ? null : food))}>
              <div>
                <b>{food}</b><br />
                <span class={s.muted}>{units[0].portion} · {units[0].meaning === "use-by" ? "use by" : "bb"} {fmtDate(units[0].date)}</span>
                <Show when={units.some(pastUseBy)}> <span class={`${s.pill} ${s.danger}`}>past use-by</span></Show>
                <Show when={units.some(pastBestBefore)}> <span class={`${s.pill} ${s.warn}`}>use first</span></Show>
                <Show when={units.some((u) => u.opened)}> <span class={`${s.pill} ${s.warn}`}>opened</span></Show>
              </div>
              <span class={s.count}>{units.length}</span>
            </button>
            <Show when={openFood() === food}>
              <div class={s.unitChips}>
                <For each={units}>{(u) => <button class={s.unitChip} onClick={() => go(`/u/${u.no}`)}>{u.no}{u.opened ? " · opened" : ""}</button>}</For>
              </div>
            </Show>
          </div>
        )}</For>
      </div>
    </div>
  );
}
const urgency = (us: Unit[]) => (us.some(pastUseBy) ? 3 : us.some(pastBestBefore) ? 2 : us.some((u) => u.opened) ? 1 : 0);
