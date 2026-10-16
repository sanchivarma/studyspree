import { describe, expect, it } from "vitest";
import { eventOccupiesDate, monthWindow, shiftMonth } from "./month";
import { orderRoomPeople } from "./roomGrid";
import { communityCommandSchema } from "./schemas";

describe("monthly calendar", () => {
  it("uses 42 calendar dates and profile-zone boundaries through DST", () => {
    const month = monthWindow("2026-03", "Europe/Berlin");
    expect(month.dates).toHaveLength(42);
    expect(month.dates[0]).toBe("2026-02-23");
    expect(month.from).toBe("2026-02-22T23:00:00.000Z");
    expect(month.to).toBe("2026-04-05T22:00:00.000Z");
  });
  it("moves over year boundaries and rejects malformed months", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(() => monthWindow("2026-13", "UTC")).toThrow();
  });
  it("includes multi-day sessions but excludes their midnight end date", () => {
    expect(eventOccupiesDate("2026-10-16T21:00:00Z", "2026-10-18T22:00:00Z", "2026-10-18", "Europe/Berlin")).toBe(true);
    expect(eventOccupiesDate("2026-10-16T21:00:00Z", "2026-10-18T22:00:00Z", "2026-10-19", "Europe/Berlin")).toBe(false);
  });
  it("accepts explicit dates and bounded contact lists without client time accounting", () => {
    const event = { action: "calendar.create", data: { title: "Read together", startsAt: "2026-10-19T09:00:00Z", endsAt: "2026-10-20T10:00:00Z", contacts: [], lists: [] } };
    expect(communityCommandSchema.safeParse(event).success).toBe(true);
    expect(communityCommandSchema.safeParse({ ...event, data: { ...event.data, actualSeconds: 300 } }).success).toBe(false);
    expect(communityCommandSchema.safeParse({ action: "contact.request", data: { username: " " } }).success).toBe(false);
  });
});
it("puts pinned self first without mutating presence, and preserves pinned filtering", () => {
  const people = [{ person: { id: "other" } }, { person: { id: "me" } }, { person: { id: "third" } }];
  expect(orderRoomPeople(people, "me", ["other", "me"], false).map(p => p.person.id)).toEqual(["me", "other", "third"]);
  expect(orderRoomPeople(people, "me", ["me"], true).map(p => p.person.id)).toEqual(["me"]);
  expect(people[0].person.id).toBe("other");
});
