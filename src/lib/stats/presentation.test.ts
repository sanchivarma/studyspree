import { afterEach, expect, it, vi } from "vitest";
import { dictionaries, locales } from "@/translations";
import { formatDuration, numberFormatter } from "./presentation";

afterEach(() => vi.restoreAllMocks());

it.each(locales)("retains translated minute/hour patterns for %s", locale => {
  const messages = dictionaries[locale].stats;
  expect(formatDuration(60, locale)).toBe(messages.durationMinutes.replace("{minutes}", "1"));
  expect(formatDuration(3600, locale)).toBe(messages.durationHours.replace("{hours}", "1"));
  expect(formatDuration(8100, locale)).toBe(messages.durationHoursMinutes.replace("{hours}", "2").replace("{minutes}", "15"));
  expect(numberFormatter(locale)).toBe(numberFormatter(locale));
});

it("formats a full heatmap with two date formatters rather than hundreds", async () => {
  vi.resetModules();
  const formatter = vi.spyOn(Intl, "DateTimeFormat");
  const { formatDate } = await import("./presentation");
  for (let day = 0; day < 371; day++) {
    expect(formatDate("2026-10-21", "en")).toBe("21 October");
    expect(formatDate("2026-10-21", "en", true)).toBe("21 October 2026");
  }
  expect(formatter).toHaveBeenCalledTimes(2);
});
