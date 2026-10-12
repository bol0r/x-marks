import { signal } from "@preact/signals";
import { getPhoto } from "../data/store";

const urls = new Map<string, string>();
export const photoTick = signal(0);

export async function photoURL(id: string): Promise<string | null> {
  const hit = urls.get(id);
  if (hit) return hit;
  try {
    const b = await getPhoto(id);
    if (!b) return null;
    const u = URL.createObjectURL(b);
    urls.set(id, u);
    return u;
  } catch {
    return null;
  }
}

export function dropPhotoURL(id: string) {
  const u = urls.get(id);
  if (u) {
    URL.revokeObjectURL(u);
    urls.delete(id);
  }
  photoTick.value++;
}

export async function shrink(file: Blob, max = 1400): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const b = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.82));
    if (!b) throw new Error("toBlob");
    return b;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function pickFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "image/*";
    inp.hidden = true;
    let done = false;
    const finish = (f: File | null) => {
      if (done) return;
      done = true;
      inp.remove();
      resolve(f);
    };
    inp.onchange = () => finish(inp.files?.[0] ?? null);
    inp.addEventListener("cancel", () => finish(null));
    document.body.appendChild(inp);
    inp.click();
  });
}
