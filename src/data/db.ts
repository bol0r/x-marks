import Dexie, { type Table } from "dexie";
import type { Place } from "../core/types";

const CORE = {
  places: "id, ts, cat",
  flights: "id, placeId, ts",
  visits: "id, placeId, ts",
  meta: "key",
};

function stores(photos: string) {
  return { ...CORE, photos };
}

export interface PhotoRow {
  id: string;
  placeId: string;
  blob: Blob;
  ord: number;
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
    this.version(1).stores(stores("id"));
    this.version(2)
      .stores(stores("id"))
      .upgrade(async (tx) => {
        await tx
          .table("places")
          .toCollection()
          .modify((place: Place) => {
            if (typeof place.approx !== "boolean") place.approx = false;
          });
      });
    this.version(3)
      .stores(stores("id, placeId, ord"))
      .upgrade(async (tx) => {
        await tx
          .table("photos")
          .toCollection()
          .modify((row: { id: string; placeId?: string; ord?: number }) => {
            if (!row.placeId) row.placeId = row.id;
            if (typeof row.ord !== "number") row.ord = 0;
          });
      });
    this.version(4)
      .stores(stores("id, placeId, ord"))
      .upgrade(async (tx) => {
        await tx
          .table("places")
          .toCollection()
          .modify((place: Place) => {
            if (!Array.isArray(place.tags)) place.tags = [];
            if (typeof place.stars !== "number") place.stars = 0;
          });
      });
  }
}

export const db = new XMarksDB();
