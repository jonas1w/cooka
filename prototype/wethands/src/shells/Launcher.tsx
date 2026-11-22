// Variant B — no persistent nav. Home is a launcher of huge tiles; every other screen ends in a full-width Home bar.
import { useLocation } from "@solidjs/router";
import { Show, type ParentProps } from "solid-js";
import { db, inStock, lastTaken } from "../data";
import { hasUpdate, isOffline, OfflineText, reload } from "../ui";
import { useGo } from "../nav";
import s from "./shells.module.css";

export default function LauncherShell(p: ParentProps) {
  const loc = useLocation();
  const go = useGo();
  const home = () => loc.pathname === "/";
  return (
    <div class={s.col}>
      <Show when={isOffline()}><div class={s.strip}><OfflineText /></div></Show>
      <main class={s.main}>{p.children}</main>
      <Show when={!home()}>
        <button class={s.homeBar} onClick={() => go("/")}>⌂ Home</button>
      </Show>
    </div>
  );
}

export function Launcher() {
  const go = useGo();
  const open = () => db.list.filter((e) => !e.done).length;
  return (
    <div class={s.launcher}>
      <Show when={hasUpdate()}>
        <button class={`${s.tile} ${s.tileUpdate}`} onClick={reload}><b>Update ready</b><span>Tap to reload — nothing you're doing is lost</span></button>
      </Show>
      <button class={`${s.tile} ${s.tileHero}`} onClick={() => go("/scan")}>
        <span class={s.tileIcon}>⌖</span><b>Take out</b><span>Scan or type a label number{lastTaken() ? ` · last: ${lastTaken()}` : ""}</span>
      </button>
      <button class={s.tile} onClick={() => go("/label")}><span class={s.tileIcon}>🏷</span><b>Label</b><span>Freeze something</span></button>
      <button class={s.tile} onClick={() => go("/list")}><span class={s.tileIcon}>☑</span><b>Shopping</b><span>{open()} to buy</span></button>
      <button class={s.tile} onClick={() => go("/recipes")}><span class={s.tileIcon}>📖</span><b>Cook</b><span>Recipes</span></button>
      <button class={s.tile} onClick={() => go("/freezer")}><span class={s.tileIcon}>❄</span><b>Freezer</b><span>{inStock().length} units</span></button>
    </div>
  );
}
