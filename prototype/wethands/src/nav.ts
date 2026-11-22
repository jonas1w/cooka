import { useLocation, useNavigate, useSearchParams } from "@solidjs/router";
export type Variant = "A" | "B" | "C";
export const VARIANTS: Variant[] = ["A", "B", "C"];
export const VARIANT_NAMES: Record<Variant, string> = {
  A: "Tabs — Freezer home, raised Scan tab",
  B: "Launcher — big tiles, Home bar",
  C: "Scanner-first — thumb rail, dark",
};
export function useVariant() {
  const [sp] = useSearchParams();
  return () => (VARIANTS.includes(sp.variant as Variant) ? (sp.variant as Variant) : "A");
}
/** navigate but keep the prototype's ?variant/&device/&net params */
export function useGo() {
  const navigate = useNavigate();
  const loc = useLocation();
  return (path: string, replace = false) => navigate(path + loc.search, { replace });
}
