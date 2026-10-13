import { z } from "zod";

const OFFSET_KEY = "ss_dev_clock_offset_ms";
// Bound offsets so adding them to real time always produces a valid Date.
const offsetSchema = z.coerce.number().finite().min(-1e14).max(1e14);

function readDevOffset(): number {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return 0;

  try {
    const value = window.localStorage.getItem(OFFSET_KEY);
    if (value === null) return 0;
    const result = offsetSchema.safeParse(value);
    return result.success ? result.data : 0;
  } catch {
    // Browsers can deny storage access; the clock still supplies real time.
    return 0;
  }
}

export function now(): Date {
  return new Date(new Date().getTime() + readDevOffset());
}

export function setDevOffset(ms: number): void {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return;
  const result = offsetSchema.safeParse(ms);
  if (!result.success) return;

  try {
    window.localStorage.setItem(OFFSET_KEY, String(result.data));
  } catch {
    // The development helper must remain safe when storage is unavailable.
  }
}

export function clearDevOffset(): void {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(OFFSET_KEY);
  } catch {
    // The development helper must remain safe when storage is unavailable.
  }
}
