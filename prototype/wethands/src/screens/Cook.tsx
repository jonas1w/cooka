// Cooking mode: one scrolling page; tap anywhere advances; timers start on tap and ring in the foreground.
import { createSignal, For, onCleanup, Show } from "solid-js";
import { recipe, setFreezeFrom } from "../data";
import { Btn, Stepper } from "../ui";
import { useGo } from "../nav";
import s from "./screens.module.css";

const scale = (line: string, f: number) =>
  f === 1 ? line : line.replace(/^(\d+(?:[.,]\d+)?)/, (n) => String(Math.round(parseFloat(n.replace(",", ".")) * f * 10) / 10));

export default function Cook() {
  const go = useGo();
  const [step, setStep] = createSignal(0);
  const [servings, setServings] = createSignal(recipe.servings);
  const [timers, setTimers] = createSignal<{ id: number; label: string; ends: number }[]>([]);
  const [now, setNow] = createSignal(Date.now());
  const tick = setInterval(() => setNow(Date.now()), 250);
  onCleanup(() => clearInterval(tick));
  const f = () => servings() / recipe.servings;
  const last = recipe.steps.length - 1;
  // PROTOTYPE: timers run 60× fast so you can see them ring.
  const start = (min: number, label: string) => setTimers((t) => [...t, { id: Date.now(), label, ends: Date.now() + (min * 60_000) / 60 }]);
  const fmt = (ms: number) => { const sec = Math.max(0, Math.ceil(ms / 1000 * 60)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; };

  return (
    <div class={s.cook} onClick={() => setStep((i) => Math.min(last, i + 1))}>
      <div class={s.cookHead}>
        <h1 class={s.h1}>{recipe.title}</h1>
        <Stepper value={servings()} max={40} label="servings" onChange={setServings} />
      </div>
      <Show when={timers().length}>
        <div class={s.timers}>
          <For each={timers()}>{(t) => {
            const left = () => t.ends - now();
            return (
              <button class={s.timer} classList={{ [s.ring]: left() <= 0 }} onClick={(e) => { e.stopPropagation(); setTimers((ts) => ts.filter((x) => x.id !== t.id)); }}>
                ⏱ {left() > 0 ? fmt(left()) : "Done!"} <small style={{ "font-weight": 500 }}>{t.label} ✕</small>
              </button>
            );
          }}</For>
        </div>
      </Show>
      <div>
        <h2 style={{ margin: "0 0 8px", "font-size": "var(--fs-l)" }}>Ingredients</h2>
        <ul class={s.ingredients}><For each={recipe.ingredients}>{(i) => <li>{scale(i, f())}</li>}</For></ul>
      </div>
      <div style={{ display: "grid", gap: "var(--gap)" }}>
        <For each={recipe.steps}>{(st, i) => (
          <div class={s.step} classList={{ [s.current]: i() === step(), [s.past]: i() < step() }}
            onClick={(e) => { if (i() !== step()) { e.stopPropagation(); setStep(i()); } }}>
            <b>{i() + 1}.</b> {st.text}
            <Show when={i() === step()}>
              <Show when={st.uses.length}><ul><For each={st.uses}>{(u) => <li>{scale(u, f())}</li>}</For></ul></Show>
              <Show when={st.timer}>
                <div><button class={s.timerChip} onClick={(e) => { e.stopPropagation(); start(st.timer!, `${st.timer} min · step ${i() + 1}`); }}>▶ Start {st.timer} min</button></div>
              </Show>
            </Show>
          </div>
        )}</For>
        <Show when={step() === last}>
          <Btn kind="primary" size="primary" wide needsNet
            onClick={() => { setFreezeFrom({ food: recipe.title, servings: servings(), kcal: recipe.kcalPerServing, protein: recipe.proteinPerServing }); go("/label"); }}>
            ❄ Freeze portions
          </Btn>
        </Show>
      </div>
      <div class={s.tapHint}>Tap anywhere for the next step · tap a step to jump · screen stays awake</div>
    </div>
  );
}
