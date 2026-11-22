/* @refresh reload */
// PROTOTYPE — cooka "Wet-hands UX" (jonas1w/cooka#18). Throwaway. Never merge to main.
// Three navigation shells (?variant=A|B|C) around the same five core screens,
// shown in a phone or tablet frame (?device=phone|tablet|fill), with simulated
// offline (?net=off), update-ready (?update=1) and no-printer (?printer=off) states.
import "./tokens.css";
import { render } from "solid-js/web";
import { Router, Route, useLocation, useSearchParams } from "@solidjs/router";
import { createEffect, Match, Switch, type ParentProps } from "solid-js";
import { setOnline, setUpdateReady, setPrinter, setTaps } from "./data";
import { useVariant } from "./nav";
import Switcher from "./Switcher";
import TabsShell from "./shells/Tabs";
import LauncherShell, { Launcher } from "./shells/Launcher";
import RailShell from "./shells/Rail";
import Freezer from "./screens/Freezer";
import Scanner from "./screens/Scanner";
import Label from "./screens/Label";
import UnitPage from "./screens/UnitPage";
import Cook from "./screens/Cook";
import List from "./screens/List";
import Recipes from "./screens/Recipes";

function Root(props: ParentProps) {
  const [sp] = useSearchParams();
  const variant = useVariant();
  const loc = useLocation();
  const device = () => (sp.device as string) ?? (window.innerWidth < 700 ? "fill" : "phone");
  createEffect(() => setOnline(sp.net !== "off"));
  createEffect(() => setUpdateReady(sp.update === "1"));
  createEffect(() => setPrinter(sp.printer !== "off"));
  createEffect(() => { if (loc.pathname === "/") setTaps(0); });

  const countTap = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a, input, [data-tap]")) setTaps((n) => n + 1);
  };
  return (
    <>
      <div
        data-variant={variant()}
        data-device={device()}
        onPointerDown={countTap}
        style={frameStyle(device())}
      >
        <Switch>
          <Match when={variant() === "A"}><TabsShell>{props.children}</TabsShell></Match>
          <Match when={variant() === "B"}><LauncherShell nav="home">{props.children}</LauncherShell></Match>
          <Match when={variant() === "D"}><LauncherShell nav="dock">{props.children}</LauncherShell></Match>
          <Match when={variant() === "E"}><LauncherShell nav="context">{props.children}</LauncherShell></Match>
          <Match when={variant() === "F"}><LauncherShell nav="modes">{props.children}</LauncherShell></Match>
          <Match when={variant() === "C"}><RailShell>{props.children}</RailShell></Match>
        </Switch>
      </div>
      {import.meta.env.DEV && <Switcher device={device()} />}
    </>
  );
}

function frameStyle(device: string) {
  const base = {
    "container-type": "size", "container-name": "app", position: "relative" as const,
    overflow: "hidden", background: "var(--bg)", color: "var(--ink)", "font-size": "var(--fs)",
  };
  if (device === "fill") return { ...base, width: "100vw", height: "100dvh" };
  const [w, h] = device === "tablet" ? [1180, 820] : [390, 820];
  return {
    ...base, width: `${w}px`, height: `${h}px`, margin: "16px auto 96px",
    "border-radius": "28px", "box-shadow": "0 0 0 10px #222, 0 20px 60px rgba(0,0,0,.35)",
  };
}

function Home() {
  const v = useVariant();
  return (
    <Switch>
      <Match when={v() === "A"}><Freezer /></Match>
      <Match when={["B", "D", "E"].includes(v())}><Launcher /></Match>
      <Match when={v() === "C"}><Scanner /></Match>
      <Match when={v() === "F"}><Recipes /></Match>
    </Switch>
  );
}

render(
  () => (
    <Router root={Root}>
      <Route path="/" component={Home} />
      <Route path="/freezer" component={Freezer} />
      <Route path="/scan" component={() => <Scanner />} />
      <Route path="/label" component={Label} />
      <Route path="/u/:no" component={UnitPage} />
      <Route path="/cook/:id" component={Cook} />
      <Route path="/list" component={List} />
      <Route path="/recipes" component={Recipes} />
    </Router>
  ),
  document.getElementById("root")!,
);
