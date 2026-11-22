import { useLocation, useNavigate, useSearchParams } from "@solidjs/router";
export type Variant = "A" | "B" | "C" | "D" | "E" | "F";
// Round 2: B won round 1; D and E are B with more flexible navigation. A and C stay reachable via ?variant=.
// Round 4: F = E's look with a fixed mode row and no Home.
export const VARIANTS: Variant[] = ["F", "E", "D"];
const ALL: Variant[] = ["A", "B", "C", "D", "E", "F"];
export const VARIANT_NAMES: Record<Variant, string> = {
  A: "Tabs — Freezer home, raised Scan tab",
  B: "Launcher — big tiles, Home bar",
  C: "Scanner-first — thumb rail, dark",
  D: "Launcher + dock — Home and 4 jumps on every screen",
  E: "Launcher + context bar — Home plus next likely steps",
  F: "Mode row — fixed Cook · Take out · Freezer · List, no Home",
};
export function useVariant() {
  const [sp] = useSearchParams();
  return () => (ALL.includes(sp.variant as Variant) ? (sp.variant as Variant) : "F");
}
/** navigate but keep the prototype's ?variant/&device/&net params */
export function useGo() {
  const navigate = useNavigate();
  const loc = useLocation();
  return (path: string, replace = false) => navigate(path + loc.search, { replace });
}
