/** Próg zapisu „w ruchu”. Powyżej pozycja jest przybliżona. */
export const MOTION_KMH = 30;

export interface MotionMark {
  speed: number;
  heading: number | null;
}

/** `speedMs` jest w m/s (jak Geolocation), wynik `speed` w km/h. */
export function motionFromFix(speedMs: number | null | undefined, headingDeg: number | null | undefined): MotionMark | null {
  if (typeof speedMs !== "number" || !Number.isFinite(speedMs)) return null;
  const kmh = speedMs * 3.6;
  if (!(kmh > MOTION_KMH + 1e-6)) return null;
  const heading = typeof headingDeg === "number" && Number.isFinite(headingDeg) ? Math.round(((headingDeg % 360) + 360) % 360) : null;
  return { speed: Math.round(kmh), heading };
}
