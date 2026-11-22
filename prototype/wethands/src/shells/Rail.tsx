// Variant C — the scanner is home. A thumb-side rail (right edge) carries nav and all status. Dark, high contrast.
import { useLocation } from "@solidjs/router";
import { For, Show, type ParentProps } from "solid-js";
import { asOf, db } from "../data";
import { hasUpdate, isOffline, reload } from "../ui";
import { useGo } from "../nav";
import s from "./shells.module.css";

const ITEMS = [
  { path: "/", icon: "⌖", label: "Take out" },
  { path: "/label", icon: "🏷", label: "Label" },
  { path: "/list", icon: "☑", label: "List" },
  { path: "/recipes", icon: "📖", label: "Cook" },
  { path: "/freezer", icon: "❄", label: "Freezer" },
];
export default function RailShell(p: ParentProps) {
  const loc = useLocation();
  const go = useGo();
  const active = (path: string) =>
    path === "/" ? loc.pathname === "/" || loc.pathname === "/scan" :
    loc.pathname.startsWith(path) || (path === "/recipes" && loc.pathname.startsWith("/cook")) || (path === "/freezer" && loc.pathname.startsWith("/u/"));
  return (
    <div class={s.row}>
      <main class={s.main}>{p.children}</main>
      <nav class={s.rail}>
        <Show when={isOffline()}><div class={s.railWarn} title={`Offline · as of ${asOf}`}>offline<br />{asOf}</div></Show>
        <For each={ITEMS}>{(t) => (
          <button class={s.railItem} classList={{ [s.railOn]: active(t.path) }} onClick={() => go(t.path)}>
            <span class={s.tabIcon}>{t.icon}</span><span class={s.railLabel}>{t.label}{t.path === "/list" ? ` ${db.list.filter((e) => !e.done).length}` : ""}</span>
          </button>
        )}</For>
        <Show when={hasUpdate()}><button class={s.railUpdate} onClick={reload}>↻<span class={s.railLabel}>Update</span></button></Show>
      </nav>
    </div>
  );
}
