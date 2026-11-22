// Recipes: the Cook mode's start. A running cook stays on top so picking another recipe never loses it.
import { For, Show } from "solid-js";
import { cookStep, cooking, recipe, recipes } from "../data";
import { useGo } from "../nav";
import { Btn } from "../ui";
import s from "./screens.module.css";

export default function Recipes() {
  const go = useGo();
  return (
    <div class={s.screen}>
      <h1 class={s.h1}>Recipes</h1>
      <Show when={cooking()}>
        <div class={s.banner} style={{ display: "flex", "align-items": "center", gap: "var(--gap)" }}>
          <div style={{ flex: 1 }}><b>Cooking: {recipe.title}</b><br /><span class={s.muted}>step {cookStep() + 1} of {recipe.steps.length}</span></div>
          <Btn kind="primary" onClick={() => go(`/cook/${cooking()}`)}>Continue</Btn>
        </div>
      </Show>
      <input class={s.input} placeholder="Search recipes…" />
      <div class={s.grid}>
        <For each={recipes}>{(r) => (
          <button class={s.groupHead} style={{ background: "var(--surface)", border: "2px solid var(--line)", "border-radius": "var(--radius)" }} onClick={() => go(`/cook/chili`)}>
            <b>{r.title}</b><span class={s.count} style={{ "font-size": "var(--fs)" }}>Cook ▶</span>
          </button>
        )}</For>
      </div>
      <Btn>＋ Import recipe</Btn>
      <p class={s.muted}>PROTOTYPE: every recipe opens Chili con carne; search and import are not wired.</p>
    </div>
  );
}
