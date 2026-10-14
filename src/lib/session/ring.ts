export function remainingOffset(elapsedSeconds: number, totalSeconds: number, circumference: number): number {
  return circumference * Math.max(0, Math.min(1, elapsedSeconds / Math.max(1, totalSeconds)));
}
