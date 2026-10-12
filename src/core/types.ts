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
  /** km/h, tylko gdy zapis w ruchu. */
  speed?: number | null;
  /** stopnie, 0 = północ. */
  heading?: number | null;
  /** true, gdy zapisano powyżej 30 km/h i pozycja czeka na poprawkę. */
  approx?: boolean;
}

export interface Fix {
  lat: number;
  lng: number;
  acc: number;
  t: number;
  /** m/s z GPS, jeśli telefon je podał. */
  speed?: number | null;
  heading?: number | null;
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
