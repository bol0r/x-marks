export type Cat = "dron" | "chill" | "cozy";

export interface Place {
  id: string;
  cat: Cat;
  lat: number;
  lng: number;
  acc: number | null;
  ts: number;
  name: string;
  note: string;
  addr: string;
  src: string;
  photo?: boolean;
  archived?: boolean;
}

export interface Fix {
  lat: number;
  lng: number;
  acc: number;
  t: number;
}

export interface PlaceQuery {
  name: string;
  parts: string[];
}

export interface ParsedPlace {
  lat?: number;
  lng?: number;
  src?: string;
  info?: string;
  name?: string;
  label?: string;
  error?: string;
  query?: PlaceQuery;
}

export type Filter = "all" | Cat | "arch";
export type View = "list" | "tiles" | "map";
