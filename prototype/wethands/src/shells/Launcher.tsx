// Variants B, D, E — Home is a launcher of huge tiles. They differ only in how you move between screens:
//   B "home":    every other screen ends in one full-width Home bar.
//   D "dock":    every other screen ends in a dock — Home + the four main jumps, always the same.
//   E "context": every other screen ends in Home + up to two shortcuts chosen for that screen.
import { useLocation } from "@solidjs/router";
import { For, Match, Show, Switch, type ParentProps } from "solid-js";
import { cookStep, cookTimers, cooking, db, fmtLeft, inStock, lastTaken, now, recipe } from "../data";
import { hasUpdate, isOffline, OfflineText, reload } from "../ui";
import { useGo } from "../nav";
import s from "./shells.module.css";

type Nav = "home" | "dock" | "context";
type Jump = { path: string; icon: string; label: string };
const J = {
  scan: { path: "/scan", icon: "⌖", label: "Take out" },
  label: { path: "/label", icon: "🏷", label: "Label" },
  list: { path: "/list", icon: "☑", label: "List" },
  cook: { path: "/recipes", icon: "📖", label: "Cook" },
  freezer: { path: "/freezer", icon: "❄", label: "Freezer" },
} satisfies Record<string, Jump>;
const DOCK: Jump[] = [J.scan, J.label, J.list, J.cook];
// E: what you most likely want next from each screen.
const contextFor = (path: string): Jump[] =>
  path.startsWith("/scan") ? [J.freezer, J.label] :
  path.startsWith("/label") ? [J.freezer, J.scan] :
  path.startsWith("/list") ? [J.cook] :
  path.startsWith("/recipes") ? [J.list] :
  path.startsWith("/cook") ? [J.list, J.freezer] :
  path.startsWith("/u/") ? [J.scan, J.freezer] :
  path.startsWith("/freezer") ? [J.scan, J.label] : [];

export default function LauncherShell(p: ParentProps<{ nav: Nav }>) {
  const loc = useLocation();
  const go = useGo();
  const home = () => loc.pathname === "/";
  const on = (j: Jump) => loc.pathname.startsWith(j.path) || (j === J.cook && loc.pathname.startsWith("/cook"));
  return (
    <div class={s.col}>
      <Show when={isOffline()}><div class={s.strip}>☁︎ <OfflineText /></div></Show>
      <main class={s.main}>{p.children}</main>
      <Show when={cooking() && !loc.pathname.startsWith("/cook")}><CookingBar /></Show>
      <Show when={!home()}>
        <Switch>
          <Match when={p.nav === "home"}>
            <button class={s.homeBar} onClick={() => go("/")}>⌂ Home</button>
          </Match>
          <Match when={p.nav === "dock"}>
            <nav class={s.dock}>
              <button class={s.dockItem} onClick={() => go("/")}><span class={s.tabIcon}>⌂</span>Home</button>
              <For each={DOCK}>{(j) => (
                <button class={s.dockItem} classList={{ [s.dockOn]: on(j) }} onClick={() => go(j.path)}>
                  <span class={s.tabIcon}>{j.icon}</span>{j.label}
                </button>
              )}</For>
            </nav>
          </Match>
          <Match when={p.nav === "context"}>
            <nav class={s.ctx}>
              <button class={s.ctxHome} onClick={() => go("/")}>⌂ Home</button>
              <For each={contextFor(loc.pathname)}>{(j) => (
                <button class={s.ctxItem} onClick={() => go(j.path)}><span class={s.tabIcon}>{j.icon}</span>{j.label}</button>
              )}</For>
            </nav>
          </Match>
        </Switch>
      </Show>
    </div>
  );
}

/** Round 3: while a cook is running, every other screen offers the way back — with the next timer. */
function CookingBar() {
  const go = useGo();
  const next = () => cookTimers().map((t) => t.ends - now()).sort((a, b) => a - b)[0];
  return (
    <button class={s.cookingBar} classList={{ [s.cookingRing]: next() !== undefined && next()! <= 0 }} onClick={() => go(`/cook/${cooking()}`)}>
      <span>🍲 Back to cooking</span>
      <small>{recipe.title} · step {cookStep() + 1}/{recipe.steps.length}{next() !== undefined ? ` · ⏱ ${next()! > 0 ? fmtLeft(next()!) : "done!"}` : ""}</small>
    </button>
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
