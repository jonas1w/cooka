// Cooking mode: one scrolling page; tap anywhere advances; timers start on tap and ring in the foreground.
// Round 2: scan units out of the freezer without leaving. Round 3: add to the shopping list without leaving;
// the session (step, servings, timers, units taken) survives navigating away — see CookingBar.
import { createEffect, createSignal, For, on, onMount, Show } from "solid-js";
import {
  addToList, cookServings, cookStep, cookTaken, cookTimers, db, endCooking, fmtLeft, now, recipe,
  setCooking, setCookServings, setCookStep, setCookTaken, setCookTimers, setFreezeFrom,
} from "../data";
import { Btn, Stepper } from "../ui";
import { useGo } from "../nav";
import Scanner from "./Scanner";
import s from "./screens.module.css";

const scale = (line: string, f: number) =>
  f === 1 ? line : line.replace(/^(\d+(?:[.,]\d+)?)/, (n) => String(Math.round(parseFloat(n.replace(",", ".")) * f * 10) / 10));

export default function Cook() {
  const go = useGo();
  onMount(() => setCooking(recipe.id));
  const [sheet, setSheet] = createSignal<null | "scan" | "list">(null);
  const [text, setText] = createSignal("");
  const step = cookStep, servings = cookServings, timers = cookTimers, taken = cookTaken;
  const f = () => servings() / recipe.servings;
  const last = recipe.steps.length - 1;
  const fromFreezer = (line: string) => taken().find((u) => line.toLowerCase().includes(u.food.toLowerCase()));
  const onList = (line: string) => db.list.some((e) => !e.done && e.text.toLowerCase() === line.toLowerCase());
  const start = (min: number, label: string) => setCookTimers((t) => [...t, { id: Date.now(), label, ends: Date.now() + (min * 60_000) / 60 }]);
  // Round 7: the current step always snaps to the top of the screen (below any running timers).
  const stepEls: HTMLDivElement[] = [];
  createEffect(on(cookStep, (i, prev) => {
    requestAnimationFrame(() => stepEls[i]?.scrollIntoView({ block: "start", behavior: prev === undefined ? "auto" : "smooth" }));
  }));
  const quickAdd = (t: string) => { if (t.trim()) addToList(t.trim(), recipe.title); setText(""); };

  return (
    <div class={s.cookWrap}>
    <div class={s.cook} onClick={() => setCookStep((i) => Math.min(last, i + 1))}>
      <div class={s.cookHead}>
        <Btn kind="ghost" onClick={() => go("/recipes")}>◀ Recipes</Btn>
        <h1 class={s.h1} style={{ width: "100%" }}>{recipe.title}</h1>
        <Stepper value={servings()} max={40} label="servings" onChange={setCookServings} />
        <div class={s.row2} style={{ width: "100%" }}>
          <Btn onClick={() => setSheet("scan")}>⌖ Take out</Btn>
          <Btn onClick={() => setSheet("list")}>＋ Shopping list</Btn>
        </div>
      </div>
      <Show when={timers().length}>
        <div class={s.timers}>
          <For each={timers()}>{(t) => {
            const left = () => t.ends - now();
            return (
              <button class={s.timer} classList={{ [s.ring]: left() <= 0 }} onClick={(e) => { e.stopPropagation(); setCookTimers((ts) => ts.filter((x) => x.id !== t.id)); }}>
                ⏱ {left() > 0 ? fmtLeft(left()) : "Done!"} <small style={{ "font-weight": 500 }}>{t.label} ✕</small>
              </button>
            );
          }}</For>
        </div>
      </Show>
      <div>
        <h2 style={{ margin: "0 0 8px", "font-size": "var(--fs-l)" }}>Ingredients</h2>
        <ul class={s.ingredients}><For each={recipe.ingredients}>{(i) => (
          <li classList={{ [s.gotIt]: !!fromFreezer(i) }}>{scale(i, f())}<Show when={fromFreezer(i)}>{(u) => <small> ✓ {u().no}</small>}</Show></li>
        )}</For></ul>
        <Show when={taken().length}>
          <p class={s.muted} style={{ "font-size": "var(--fs-s)" }}>Taken out: {taken().map((u) => `${u.food} ${u.no}`).join(", ")}</p>
        </Show>
      </div>
      <div style={{ display: "grid", gap: "var(--gap)" }}>
        <For each={recipe.steps}>{(st, i) => (
          <div ref={(el) => (stepEls[i()] = el)} class={s.step} classList={{ [s.current]: i() === step(), [s.past]: i() < step() }}
            onClick={(e) => { if (i() !== step()) { e.stopPropagation(); setCookStep(i()); } }}>
            <b>{i() + 1}.</b> {st.text}
            <Show when={i() === step()}>
              <Show when={st.uses.length}><ul><For each={st.uses}>{(u) => <li classList={{ [s.gotIt]: !!fromFreezer(u) }}>{scale(u, f())}<Show when={fromFreezer(u)}>{(x) => <small> ✓ {x().no}</small>}</Show></li>}</For></ul></Show>
              <Show when={st.timer}>
                <div><button class={s.timerChip} onClick={(e) => { e.stopPropagation(); start(st.timer!, `${st.timer} min · step ${i() + 1}`); }}>▶ Start {st.timer} min</button></div>
              </Show>
            </Show>
          </div>
        )}</For>
        <Show when={step() === last}>
          <Btn kind="primary" size="primary" wide needsNet
            onClick={() => { setFreezeFrom({ food: recipe.title, servings: servings(), kcal: recipe.kcalPerServing, protein: recipe.proteinPerServing }); endCooking(); go("/label"); }}>
            ❄ Freeze portions
          </Btn>
          <Btn wide onClick={() => { endCooking(); go("/", true); }}>Finished — nothing to freeze</Btn>
        </Show>
      </div>
      <div class={s.tapHint}>Tap anywhere for the next step · tap a step to jump · screen stays awake</div>
    </div>

    <Show when={sheet() === "scan"}>
      <div class={s.sheet}>
        <div class={s.sheetHead}><b>Take out for {recipe.title}</b><Btn kind="primary" onClick={() => setSheet(null)}>Back to step {step() + 1}</Btn></div>
        <Scanner embedded onTaken={(u) => setCookTaken((t) => [...t, u])} onUndo={(u) => setCookTaken((t) => t.filter((x) => x.no !== u.no))} />
      </div>
    </Show>
    <Show when={sheet() === "list"}>
      <div class={s.sheet}>
        <div class={s.sheetHead}><b>Running low?</b><Btn kind="primary" onClick={() => setSheet(null)}>Back to step {step() + 1}</Btn></div>
        <div class={s.screen}>
          <form class={s.addRow} onSubmit={(e) => { e.preventDefault(); quickAdd(text()); }}>
            <input class={s.input} value={text()} onInput={(e) => setText(e.currentTarget.value)} placeholder="Add to shopping list…" />
            <Btn kind="primary" onClick={() => quickAdd(text())}>Add</Btn>
          </form>
          <div class={s.muted} style={{ "font-size": "var(--fs-s)" }}>Tap to add — from this recipe</div>
          <div class={s.quick}>
            <For each={recipe.ingredients.map((i) => i.replace(/^[\d.,]+\s*(g|kg|ml|l|tbsp|tsp|cloves?)?\s*/i, ""))}>{(name) => (
              <button classList={{ [s.quickOn]: onList(name) }} disabled={onList(name)} onClick={() => quickAdd(name)}>
                {onList(name) ? "✓ " : "＋ "}{name}
              </button>
            )}</For>
          </div>
          <div class={s.muted} style={{ "font-size": "var(--fs-s)" }}>{db.list.filter((e) => !e.done).length} on the list</div>
        </div>
      </div>
    </Show>
    </div>
  );
}
