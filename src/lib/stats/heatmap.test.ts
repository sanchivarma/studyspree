import { describe, expect, it } from "vitest";
import { buildHeatmap, getIntensity } from "./heatmap";
import { mockDayStats, MOCK_REFERENCE_DATE } from "@/lib/mock/stats";
import { dayOfWeek, shiftDate } from "./dates";
import { formatDate, formatDuration } from "./presentation";

describe("heatmap intensity", () => {
  it.each([[0, 0], [1, 1], [1799, 1], [1800, 2], [3599, 2], [3600, 3], [7199, 3], [7200, 4], [18000, 4]])("maps %i seconds to level %i", (seconds, level) => {
    expect(getIntensity(seconds)).toBe(level);
  });
  it("builds 53 Monday-first columns with every mock day and disabled future padding", () => {
    const cells = buildHeatmap(mockDayStats, MOCK_REFERENCE_DATE);
    expect(cells).toHaveLength(371);
    expect(dayOfWeek(cells[0].date)).toBe(0);
    expect(cells.filter((cell) => !cell.isPadding && !cell.isFuture)).toHaveLength(365);
    expect(cells.filter((cell) => cell.isFuture)).toHaveLength(5);
    expect(cells.find((cell) => cell.date === MOCK_REFERENCE_DATE)?.totalSeconds).toBe(mockDayStats.at(-1)?.totalSeconds);
  });
  it("uses calendar arithmetic consistently across month, leap-year and year boundaries", () => {
    expect(shiftDate("2024-02-28", 1)).toBe("2024-02-29");
    expect(shiftDate("2026-02-28", 1)).toBe("2026-03-01");
    expect(shiftDate("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("formats durations and dates as accessible localized copy", () => {
    expect(formatDuration(8100, "en")).toBe("2h 15m");
    expect(formatDuration(1800, "en")).toBe("30m");
    expect(formatDuration(7200, "en")).toBe("2h");
    expect(formatDate("2026-03-14", "en")).toBe("14 March");
    expect(formatDate("2026-03-14", "de")).toBe("14. März");
  });
});
