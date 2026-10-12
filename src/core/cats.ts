import type { Cat } from "./types";

export type IconName = "dron" | "chill" | "cozy" | "eye" | "pin" | "tree";

export interface CatDef {
  id: string;
  label: string;
  color: string;
  icon: IconName;
}

export const PALETTE = ["--dron", "--chill", "--cozy", "--mark", "--ok", "--danger"] as const;
export const ICONS: IconName[] = ["eye", "pin", "tree", "dron", "chill", "cozy"];
export const MAX_CATS = 6;

export const CATS: Record<"dron" | "chill" | "cozy", { label: string; color: string }> = {
  dron: { label: "Dron", color: "--dron" },
  chill: { label: "Chill", color: "--chill" },
  cozy: { label: "Cozy", color: "--cozy" },
};

const BUILTIN: CatDef[] = [
  { id: "dron", label: "Dron", color: "--dron", icon: "dron" },
  { id: "chill", label: "Chill", color: "--chill", icon: "chill" },
  { id: "cozy", label: "Cozy", color: "--cozy", icon: "cozy" },
];

let extras: CatDef[] = [];
let favIds = ["dron", "chill", "cozy"];
const known = new Set<string>();

export function isBuiltin(s: string): s is "dron" | "chill" | "cozy" {
  return s === "dron" || s === "chill" || s === "cozy";
}

export function isIcon(s: string): s is IconName {
  return ICONS.includes(s as IconName);
}

export function isPalette(s: string): boolean {
  return (PALETTE as readonly string[]).includes(s);
}

export function catalog(): { all: CatDef[]; custom: CatDef[]; favs: string[] } {
  return { all: [...BUILTIN, ...extras], custom: extras.slice(), favs: favIds.slice() };
}

export function setCatalog(custom: CatDef[], favs: string[]) {
  const clean = custom.filter((c) => c.id && !isBuiltin(c.id) && isIcon(c.icon) && isPalette(c.color)).slice(0, MAX_CATS - BUILTIN.length);
  extras = clean;
  const ids = new Set([...BUILTIN, ...extras].map((c) => c.id));
  const next = favs.filter((id) => ids.has(id)).slice(0, 3);
  favIds = next.length ? next : ["dron", "chill", "cozy"];
  known.clear();
  for (const c of extras) known.add(c.id);
}

export function catOf(id: string): CatDef {
  return catalog().all.find((c) => c.id === id) ?? { id, label: id, color: "--mark", icon: "pin" };
}

export function favCats(): CatDef[] {
  const byId = new Map(catalog().all.map((c) => [c.id, c]));
  return favIds.map((id) => byId.get(id)).filter((c): c is CatDef => !!c);
}

export function isCat(s: string, extra: readonly string[] = []): s is Cat {
  return isBuiltin(s) || known.has(s) || extra.includes(s);
}

export function catSlug(label: string, taken: readonly string[]): string | null {
  const base = label
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
  if (!base || taken.includes(base)) return null;
  return base;
}

export function pickFavs(ids: string[], toggle: string): string[] {
  if (ids.includes(toggle)) {
    const next = ids.filter((id) => id !== toggle);
    return next.length ? next : ids;
  }
  return [...ids, toggle].slice(-3);
}

export const CAT_KEYS = ["dron", "chill", "cozy"] as const;
