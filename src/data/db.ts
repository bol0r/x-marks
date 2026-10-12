import Dexie, { type Table } from "dexie";
import type { Place } from "../core/types";

export interface PhotoRow {
  id: string;
  blob: Blob;
}

export interface MetaRow {
  key: string;
  value: string;
}

export interface FlightRow {
  id: string;
  placeId: string;
  ts: number;
}

export interface VisitRow {
  id: string;
  placeId: string;
  ts: number;
}

export class XMarksDB extends Dexie {
  places!: Table<Place, string>;
  photos!: Table<PhotoRow, string>;
  flights!: Table<FlightRow, string>;
  visits!: Table<VisitRow, string>;
  meta!: Table<MetaRow, string>;

  constructor(name = "xmarks-db") {
    super(name);
    this.version(1).stores({
      places: "id, ts, cat",
      photos: "id",
      flights: "id, placeId, ts",
      visits: "id, placeId, ts",
      meta: "key",
    });
  }
}

export const db = new XMarksDB();
