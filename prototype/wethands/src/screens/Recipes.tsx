import { For } from "solid-js";
import { recipes } from "../data";
import { useGo } from "../nav";
import s from "./screens.module.css";

export default function Recipes() {
  const go = useGo();
  return (
    <div class={s.screen}>
      <h1 class={s.h1}>Recipes</h1>
      <div class={s.grid}>
        <For each={recipes}>{(r) => (
          <button class={s.groupHead} style={{ background: "var(--surface)", border: "2px solid var(--line)", "border-radius": "var(--radius)" }} onClick={() => go(`/cook/chili`)}>
            <b>{r.title}</b><span class={s.count} style={{ "font-size": "var(--fs)" }}>Cook ▶</span>
          </button>
        )}</For>
      </div>
      <p class={s.muted}>PROTOTYPE: every recipe opens Chili con carne.</p>
    </div>
  );
}
