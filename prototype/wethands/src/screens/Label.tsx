// Labelling: one screen, defaults from the Food; units are created first, then printed.
import { createMemo, createSignal, For, Show } from "solid-js";
import { freezeFrom, labelUnits, printer, recentFoods, setFreezeFrom } from "../data";
import { Btn, Chips, Field, Stepper } from "../ui";
import { useGo } from "../nav";
import s from "./screens.module.css";

const SHELF = ["1 mo", "3 mo", "6 mo", "12 mo"] as const;
export default function Label() {
  const go = useGo();
  const ff = freezeFrom();
  const [food, setFood] = createSignal(ff?.food ?? "");
  const [portion, setPortion] = createSignal("2 servings");
  const [perUnit, setPerUnit] = createSignal(2);
  const [count, setCount] = createSignal(ff ? Math.ceil(ff.servings / 2) : 1);
  const [shelf, setShelf] = createSignal<(typeof SHELF)[number]>("3 mo");
  const [done, setDone] = createSignal<string[] | null>(null);
  const months = () => parseInt(shelf());
  const until = createMemo(() => { const d = new Date("2026-11-22"); d.setMonth(d.getMonth() + months()); return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" }); });
  const portionText = () => (ff ? `${perUnit()} serving${perUnit() > 1 ? "s" : ""}` : portion());

  const submit = () => {
    const nos = labelUnits(food() || "Untitled", count(), portionText(), months(), ff ? { kcal: ff.kcal * perUnit(), protein: ff.protein * perUnit() } : {});
    setFreezeFrom(null);
    setDone(nos);
  };

  return (
    <div class={s.screen}>
      <Show when={!done()} fallback={
        <>
          <h1 class={s.h1}>{printer() ? `Printing ${done()!.length} label${done()!.length > 1 ? "s" : ""}…` : "Write these numbers on the containers"}</h1>
          <div class={s.bigNos}><For each={done()!}>{(n) => <span>{n}</span>}</For></div>
          <p class={s.muted}>{printer() ? "Stick each label on before freezing. Misprint? Reprint keeps the same number." : "No printer is bound — the units exist; their numbers are all you need to take them out."}</p>
          <div class={s.sticky}>
            <Btn kind="primary" size="primary" wide onClick={() => { setDone(null); setFood(""); setCount(1); }}>Label something else</Btn>
            <Btn wide onClick={() => go("/", true)}>Done</Btn>
          </div>
        </>
      }>
        <h1 class={s.h1}>Label</h1>
        <Show when={ff}>
          <div class={s.banner}>
            <b>From cooking: {ff!.food}</b> · {ff!.servings} servings · macros per unit derived from the recipe
          </div>
        </Show>
        <div class={s.labelWrap}>
          <div class={s.form}>
            <Field label="What">
              <input class={s.input} value={food()} onInput={(e) => setFood(e.currentTarget.value)} placeholder="Type or pick…" />
              <Show when={!ff}>
                <Chips options={recentFoods.slice(0, 5)} value={food()} onChange={setFood} />
              </Show>
            </Field>
            <Show when={ff} fallback={
              <Field label="Per container">
                <Chips options={["1 serving", "2 servings", "500 g", "1 l"]} value={portion()} onChange={setPortion} />
              </Field>
            }>
              <Field label="Servings per container" hint={`${ff!.servings} servings cooked`}>
                <Stepper value={perUnit()} max={ff!.servings} onChange={(n) => { setPerUnit(n); setCount(Math.ceil(ff!.servings / n)); }} />
              </Field>
            </Show>
            <Field label="How many containers">
              <Stepper value={count()} max={20} onChange={setCount} />
            </Field>
            <Field label="Best before" hint={`→ ${until()}`}>
              <Chips options={SHELF} value={shelf()} onChange={setShelf} />
            </Field>
          </div>
          <div class={s.form}>
            <Field label="Label preview (60×40)">
              <div class={s.preview}>
                <div><b style={{ "font-size": "18px" }}>{food() || "—"}</b><br />{portionText()} · cooked<br />frozen 22.11.26<br /><b>best before {until()}</b></div>
                <div><div class={s.qr} /><b>0416</b></div>
              </div>
            </Field>
          </div>
        </div>
        <div class={s.sticky}>
          <Btn kind="primary" size="primary" wide needsNet disabled={!food()} onClick={submit}>
            {printer() ? `Label & print ${count()}` : `Label ${count()}`}
          </Btn>
        </div>
      </Show>
    </div>
  );
}
