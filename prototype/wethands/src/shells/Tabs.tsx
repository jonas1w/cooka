// Variant A — conventional phone app: top status bar, bottom tabs, Scan raised in the middle. Home = Freezer.
import { useLocation } from "@solidjs/router";
import { For, Show, type ParentProps } from "solid-js";
import { db } from "../data";
import { hasUpdate, isOffline, OfflineText, reload } from "../ui";
import { useGo } from "../nav";
import s from "./shells.module.css";

const TABS = [
  { path: "/", icon: "❄", label: "Freezer" },
  { path: "/recipes", icon: "📖", label: "Recipes" },
  { path: "/scan", icon: "⌖", label: "Take out", raised: true },
  { path: "/list", icon: "☑", label: "List" },
  { path: "/label", icon: "🏷", label: "Label" },
];
export default function TabsShell(p: ParentProps) {
  const loc = useLocation();
  const go = useGo();
  const active = (path: string) => (path === "/" ? ["/", "/freezer"].includes(loc.pathname) || loc.pathname.startsWith("/u/") : loc.pathname.startsWith(path) || (path === "/recipes" && loc.pathname.startsWith("/cook")));
  return (
    <div class={s.col}>
      <header class={s.topbar}>
        <b>cooka</b>
        <Show when={isOffline()}><span class={s.chipWarn}><OfflineText short /></span></Show>
        <Show when={hasUpdate()}><button class={s.chipUpdate} onClick={reload}>Update ready ↻</button></Show>
      </header>
      <main class={s.main}>{p.children}</main>
      <nav class={s.tabs}>
        <For each={TABS}>{(t) => (
          <button class={s.tab} classList={{ [s.tabOn]: active(t.path), [s.raised]: t.raised }} onClick={() => go(t.path)}>
            <span class={s.tabIcon}>{t.icon}</span>
            <span>{t.label}{t.path === "/list" ? ` ${db.list.filter((e) => !e.done).length}` : ""}</span>
          </button>
        )}</For>
      </nav>
    </div>
  );
}
