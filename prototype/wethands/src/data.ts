// PROTOTYPE — in-memory stub data. No persistence, no backend.
import { createSignal } from "solid-js";
import { createStore, produce } from "solid-js/store";

export type DateMeaning = "best-before" | "use-by";
export type Unit = {
  no: string; food: string; portion: string; prep?: string;
  frozenOn: string; date: string; meaning: DateMeaning;
  kcal?: number; protein?: number; opened?: boolean;
  state: "in" | "consumed" | "discarded";
};

const TODAY = "2026-11-22";
export const today = TODAY;

export const [db, setDb] = createStore({
  nextNo: 416,
  units: [
    { no: "0398", food: "Chili con carne", portion: "2 servings", prep: "cooked", frozenOn: "2026-09-02", date: "2026-12-01", meaning: "best-before", kcal: 820, protein: 54, state: "in" },
    { no: "0399", food: "Chili con carne", portion: "2 servings", prep: "cooked", frozenOn: "2026-09-02", date: "2026-12-01", meaning: "best-before", kcal: 820, protein: 54, state: "in", opened: true },
    { no: "0402", food: "Chicken stock", portion: "1 l", prep: "cooked", frozenOn: "2026-06-10", date: "2026-11-10", meaning: "best-before", state: "in" },
    { no: "0405", food: "Minced beef", portion: "500 g", prep: "raw", frozenOn: "2026-08-20", date: "2026-11-18", meaning: "use-by", state: "in" },
    { no: "0407", food: "Lasagne", portion: "1 serving", prep: "cooked", frozenOn: "2026-10-01", date: "2027-01-01", meaning: "best-before", kcal: 640, protein: 38, state: "in" },
    { no: "0408", food: "Lasagne", portion: "1 serving", prep: "cooked", frozenOn: "2026-10-01", date: "2027-01-01", meaning: "best-before", kcal: 640, protein: 38, state: "in" },
    { no: "0411", food: "Blanched spinach", portion: "300 g", prep: "blanched", frozenOn: "2026-10-15", date: "2027-04-15", meaning: "best-before", state: "in" },
    { no: "0412", food: "Dal makhani", portion: "2 servings", prep: "cooked", frozenOn: "2026-11-01", date: "2027-02-01", meaning: "best-before", kcal: 760, protein: 32, state: "in" },
    { no: "0415", food: "Pizza dough", portion: "2 balls", prep: "raw", frozenOn: "2026-11-20", date: "2027-02-20", meaning: "best-before", state: "in" },
    { no: "A0407", food: "Old pesto", portion: "1 jar", prep: "raw", frozenOn: "2025-12-01", date: "2026-06-01", meaning: "best-before", state: "in" },
  ] as Unit[],
  list: [
    { id: "s1", text: "2 onions", done: false, from: "Chili con carne" },
    { id: "s2", text: "Chicken stock", done: false, from: "restock" },
    { id: "s3", text: "Oat milk", done: false },
    { id: "s4", text: "Coriander", done: true },
  ] as { id: string; text: string; done: boolean; from?: string; queued?: boolean }[],
});

export const recentFoods = ["Chili con carne", "Lasagne", "Chicken stock", "Dal makhani", "Pizza dough", "Minced beef"];

export const recipe = {
  id: "chili", title: "Chili con carne", servings: 6, kcalPerServing: 410, proteinPerServing: 27,
  ingredients: ["2 onions", "3 cloves garlic", "500 g minced beef", "2 tbsp tomato paste", "800 g chopped tomatoes", "400 g kidney beans", "1 tsp cumin", "1 tsp chili flakes"],
  steps: [
    { text: "Dice the onions and garlic.", uses: ["2 onions", "3 cloves garlic"] },
    { text: "Brown the minced beef in a large pot over high heat, about 8 minutes.", uses: ["500 g minced beef"], timer: 8 },
    { text: "Add onions, garlic, cumin and chili flakes; fry for 3 minutes.", uses: ["1 tsp cumin", "1 tsp chili flakes"], timer: 3 },
    { text: "Stir in the tomato paste, then the chopped tomatoes.", uses: ["2 tbsp tomato paste", "800 g chopped tomatoes"] },
    { text: "Simmer covered for 45 minutes, stirring now and then.", uses: [], timer: 45 },
    { text: "Add the drained kidney beans and simmer 10 more minutes. Season.", uses: ["400 g kidney beans"], timer: 10 },
  ],
};
export const recipes = [
  recipe,
  { id: "dal", title: "Dal makhani", servings: 4 },
  { id: "lasagne", title: "Lasagne", servings: 8 },
  { id: "focaccia", title: "Overnight focaccia", servings: 12 },
];

export const inStock = () => db.units.filter((u) => u.state === "in");
export const pastUseBy = (u: Unit) => u.meaning === "use-by" && u.date < TODAY;
export const pastBestBefore = (u: Unit) => u.meaning === "best-before" && u.date < TODAY;
export const fmtDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y.slice(2)}`;
};

export function setUnitState(no: string, state: Unit["state"]) {
  setDb("units", (u) => u.no === no, "state", state);
}
export function labelUnits(food: string, count: number, portion: string, months: number, extra: Partial<Unit> = {}) {
  const nos: string[] = [];
  setDb(produce((s) => {
    for (let i = 0; i < count; i++) {
      const no = String(s.nextNo++).padStart(4, "0");
      const d = new Date(TODAY); d.setMonth(d.getMonth() + months);
      s.units.push({ no, food, portion, frozenOn: TODAY, date: d.toISOString().slice(0, 10), meaning: "best-before", state: "in", prep: "cooked", ...extra });
      nos.push(no);
    }
  }));
  return nos;
}

// Simulated device state, driven from the prototype bar via URL params.
export const [online, setOnline] = createSignal(true);
export const [updateReady, setUpdateReady] = createSignal(false);
export const [printer, setPrinter] = createSignal(true);
export const asOf = "14:02";

// Sticky Undo for the scanner: stays until the next scan.
export const [lastTaken, setLastTaken] = createSignal<string | null>(null);

// Cook → freeze handover payload.
export const [freezeFrom, setFreezeFrom] = createSignal<null | { food: string; servings: number; kcal: number; protein: number }>(null);

// Prototype instrumentation: taps since last visit to Home.
export const [taps, setTaps] = createSignal(0);
