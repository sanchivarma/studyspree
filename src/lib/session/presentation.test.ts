import { expect, it } from "vitest";
import { formatTimer, formatBankedDuration } from "./presentation";

it.each([[0, "0:00"], [5, "0:05"], [300, "5:00"], [10801, "180:01"], [-5, "0:00"]])("formats %i seconds as %s", (seconds, expected) => {
  expect(formatTimer(seconds)).toBe(expected);
});
it("keeps early Finish seconds visible instead of rounding to zero minutes", () => {
  expect(formatBankedDuration(10, "en")).toBe("10s");
  expect(formatBankedDuration(59, "fr")).toBe("59s");
  expect(formatBankedDuration(60, "en")).toBe("1m");
  expect(formatBankedDuration(8100, "en")).toBe("2h 15m");
});
