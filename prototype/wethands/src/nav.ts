import { useLocation, useNavigate, useSearchParams } from "@solidjs/router";
export type Variant = "A" | "B" | "C" | "D" | "E";
// Round 2: B won round 1; D and E are B with more flexible navigation. A and C stay reachable via ?variant=.
export const VARIANTS: Variant[] = ["B", "D", "E"];
const ALL: Variant[] = ["A", "B", "C", "D", "E"];
export const VARIANT_NAMES: Record<Variant, string> = {
  A: "Tabs — Freezer home, raised Scan tab",
  B: "Launcher — big tiles, Home bar",
  C: "Scanner-first — thumb rail, dark",
  D: "Launcher + dock — Home and 4 jumps on every screen",
  E: "Launcher + context bar — Home plus next likely steps",
};
export function useVariant() {
  const [sp] = useSearchParams();
  return () => (ALL.includes(sp.variant as Variant) ? (sp.variant as Variant) : "B");
}
/** navigate but keep the prototype's ?variant/&device/&net params */
export function useGo() {
  const navigate = useNavigate();
  const loc = useLocation();
  return (path: string, replace = false) => navigate(path + loc.search, { replace });
}
