export const GALLERY_MAX = 6;

export function clipGallery<T>(items: T[]): T[] {
  return items.slice(0, GALLERY_MAX);
}

export function moveGallery<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = items.slice();
  const [item] = next.splice(from, 1);
  if (item === undefined) return items;
  next.splice(to, 0, item);
  return next;
}
