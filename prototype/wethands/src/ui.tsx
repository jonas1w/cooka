// PROTOTYPE — shared primitives. Deliberately thin; shells own layout.
import { Show, type JSX, type ParentProps } from "solid-js";
import { online, updateReady, asOf } from "./data";
import s from "./ui.module.css";

type BtnProps = ParentProps<{
  kind?: "primary" | "secondary" | "danger" | "ghost";
  size?: "normal" | "primary";
  needsNet?: boolean;
  disabled?: boolean;
  wide?: boolean;
  onClick?: () => void;
  sub?: JSX.Element;
}>;
/** A button. With needsNet it disables itself offline and says why — never hides. */
export function Btn(p: BtnProps) {
  const blocked = () => p.needsNet && !online();
  return (
    <button
      class={s.btn}
      classList={{ [s[p.kind ?? "secondary"]]: true, [s.big]: p.size === "primary", [s.wide]: p.wide }}
      disabled={p.disabled || blocked()}
      onClick={(e) => { e.stopPropagation(); p.onClick?.(); }}
    >
      <span>{p.children}</span>
      <Show when={blocked()} fallback={p.sub && <small>{p.sub}</small>}>
        <small>Needs connection</small>
      </Show>
    </button>
  );
}

export function Stepper(p: { value: number; min?: number; max?: number; onChange: (n: number) => void; label?: string }) {
  return (
    <div class={s.stepper}>
      <button aria-label="less" disabled={p.value <= (p.min ?? 1)} onClick={(e) => { e.stopPropagation(); p.onChange(p.value - 1); }}>−</button>
      <output>{p.value}<Show when={p.label}><small> {p.label}</small></Show></output>
      <button aria-label="more" disabled={p.value >= (p.max ?? 99)} onClick={(e) => { e.stopPropagation(); p.onChange(p.value + 1); }}>+</button>
    </div>
  );
}

export function Chips<T extends string>(p: { options: readonly T[]; value: T; onChange: (v: T) => void; render?: (v: T) => JSX.Element }) {
  return (
    <div class={s.chips}>
      {p.options.map((o) => (
        <button classList={{ [s.chip]: true, [s.chipOn]: o === p.value }} onClick={() => p.onChange(o)}>
          {p.render ? p.render(o) : o}
        </button>
      ))}
    </div>
  );
}

/** Offline note, shared wording. Shells decide where it sits. */
export function OfflineText(_p: { short?: boolean }) {
  return <>Offline · {asOf}</>;
}
export const isOffline = () => !online();
export const hasUpdate = updateReady;
export const reload = () => location.reload();

export function Field(p: ParentProps<{ label: string; hint?: JSX.Element }>) {
  return (
    <div class={s.field}>
      <div class={s.fieldLabel}>{p.label}<Show when={p.hint}><span>{p.hint}</span></Show></div>
      {p.children}
    </div>
  );
}
