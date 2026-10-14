import { afterEach, expect, it, vi } from "vitest";
import { defaultTimezone } from "./defaultTimezone";

afterEach(() => vi.restoreAllMocks());
it("uses the device's resolved timezone for a new profile", () => {
  const options = Intl.DateTimeFormat().resolvedOptions();
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({ ...options, timeZone: "Asia/Tokyo" });
  expect(defaultTimezone()).toBe("Asia/Tokyo");
});
it("falls back to UTC when the browser cannot resolve a timezone", () => {
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockImplementation(() => { throw new Error("Intl unavailable"); });
  expect(defaultTimezone()).toBe("UTC");
});
