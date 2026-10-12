import type { Cat } from "./types";

export const CATS: Record<Cat, { label: string; color: string }> = {
  dron: { label: "Dron", color: "--dron" },
  chill: { label: "Chill", color: "--chill" },
  cozy: { label: "Cozy", color: "--cozy" },
};

export const CAT_KEYS = Object.keys(CATS) as Cat[];

export function isCat(s: string): s is Cat {
  return s === "dron" || s === "chill" || s === "cozy";
}
