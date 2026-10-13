import { expect, it } from "vitest";
import { toLocalDate } from "./localDate";

it.each([
  ["2026-10-13T00:05:00Z", "America/Los_Angeles", "2026-10-12"],
  ["2026-10-13T23:05:00Z", "Europe/Berlin", "2026-10-14"],
  ["2026-03-29T00:30:00Z", "Europe/Berlin", "2026-03-29"],
  ["2026-03-29T01:30:00Z", "Europe/Berlin", "2026-03-29"],
  ["2026-10-25T00:30:00Z", "Europe/Berlin", "2026-10-25"],
  ["2026-10-25T01:30:00Z", "Europe/Berlin", "2026-10-25"],
  ["2026-12-31T23:30:00Z", "Asia/Kolkata", "2027-01-01"],
])("buckets %s in %s as %s", (instant, zone, expected) => {
  expect(toLocalDate(instant, zone)).toBe(expected);
});
