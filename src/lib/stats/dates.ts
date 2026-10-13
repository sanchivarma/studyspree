export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function dayOfWeek(date: string): number {
  return (new Date(`${date}T00:00:00.000Z`).getUTCDay() + 6) % 7;
}
