// Shopping list: the one screen that works fully offline — writes queue and show it.
import { createSignal, For, Show } from "solid-js";
import { db, online, setDb } from "../data";
import { Btn } from "../ui";
import s from "./screens.module.css";

export default function List() {
  const [text, setText] = createSignal("");
  // Round 5: the add box doubles as search — typing filters, so duplicates show before you add them.
  const match = (e: { text: string }) => !text().trim() || e.text.toLowerCase().includes(text().trim().toLowerCase());
  const open = () => db.list.filter((e) => !e.done && match(e));
  const done = () => db.list.filter((e) => e.done && match(e));
  const exact = () => db.list.find((e) => !e.done && e.text.toLowerCase() === text().trim().toLowerCase());
  const add = () => {
    if (!text().trim()) return;
    setDb("list", (l) => [{ id: crypto.randomUUID(), text: text().trim(), done: false, queued: !online() }, ...l]);
    setText("");
  };
  const toggle = (id: string) => setDb("list", (e) => e.id === id, (e) => ({ done: !e.done, queued: !online() || e.queued }));
  const Entry = (e: (typeof db.list)[number]) => (
    <button class={s.entry} classList={{ [s.checked]: e.done }} onClick={() => toggle(e.id)}>
      <span class={s.box}>{e.done ? "✓" : ""}</span>
      <span class={s.txt}>{e.text}</span>
      <Show when={e.queued && !online()} fallback={<Show when={e.from}><span class={s.from}>{e.from === "restock" ? "restock" : `for ${e.from}`}</span></Show>}>
        <span class={s.queued}>⏳ not sent yet</span>
      </Show>
    </button>
  );
  return (
    <div class={s.screen}>
      <div class={s.listWrap}>
        <h1 class={s.h1}>Shopping list</h1>
        <form class={s.addRow} onSubmit={(e) => { e.preventDefault(); add(); }}>
          <input class={s.input} value={text()} onInput={(e) => setText(e.currentTarget.value)} placeholder="Add or search…" />
          <Btn kind="primary" disabled={!!exact()} onClick={add}>{exact() ? "On list" : "Add"}</Btn>
        </form>
        <Show when={text().trim()}>
          <div class={s.muted} style={{ "font-size": "var(--fs-s)" }}>
            {open().length + done().length ? `${open().length + done().length} matching` : "Not on the list yet — Add puts it on"}
            {" · "}<button style={{ background: "none", border: 0, "text-decoration": "underline", cursor: "pointer", color: "inherit", "font-size": "inherit" }} onClick={() => setText("")}>clear</button>
          </div>
        </Show>
        <For each={open()}>{Entry}</For>
        <Show when={done().length}>
          <div class={s.muted} style={{ "margin-top": "var(--gap)" }}>In the basket ({done().length})</div>
          <For each={done()}>{Entry}</For>
          <div class={s.row2}>
            <Btn onClick={() => setDb("list", (l) => l.filter((e) => !e.done))}>Clear basket</Btn>
            <Btn onClick={() => navigator.clipboard?.writeText(open().map((e) => `- ${e.text}`).join("\n"))}>Share as text</Btn>
          </div>
        </Show>
      </div>
    </div>
  );
}
