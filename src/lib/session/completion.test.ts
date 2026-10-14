import { expect, it } from "vitest";
import { affirmationKey, isRecentCompletion } from "./completion";
import type { Session } from "@/types/domain";

it.each([[0, "Started"], [299, "Started"], [300, "Work"], [899, "Work"], [900, ""], [2699, ""], [2700, "Long"], [21600, "Long"]])("affirms %i seconds without planned duration", (seconds, suffix) => {
  expect(affirmationKey(seconds)).toBe(`complete.affirmation${suffix}`);
});
it("accepts recent ended sessions and rejects future, active and expired sessions", () => {
  const timestamp = new Date("2026-10-14T00:00:00Z").getTime();
  const session = { endedAt: new Date(timestamp).toISOString() } as Session;
  expect(isRecentCompletion(session, timestamp)).toBe(true);
  expect(isRecentCompletion(session, timestamp + 599_999)).toBe(true);
  expect(isRecentCompletion(session, timestamp + 600_000)).toBe(false);
  expect(isRecentCompletion(session, timestamp - 1)).toBe(false);
  expect(isRecentCompletion({ ...session, endedAt: null }, timestamp)).toBe(false);
});
