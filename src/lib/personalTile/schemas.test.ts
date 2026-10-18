import { expect, it } from "vitest";
import { tileSchema } from "./schemas";

it("reads Postgres offset timestamps in persisted status history", () => {
  expect(tileSchema.parse({ status: "Reading", history: [{ text: "Reading", createdAt: "2026-10-18T12:30:00+02:00" }] }).history)
    .toEqual([{ text: "Reading", createdAt: "2026-10-18T10:30:00.000Z" }]);
  expect(() => tileSchema.parse({ history: [{ text: "Reading", createdAt: "not a timestamp" }] })).toThrow();
});
