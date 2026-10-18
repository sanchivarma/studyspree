import { expect, it } from "vitest";
import { parseResourcePatch } from "./patches";

it("keeps partial edits partial and normalizes feature-specific names", () => {
  expect(parseResourcePatch("buddy-listings", { status: "closed" })).toEqual({ published: false });
  expect(parseResourcePatch("groups", { description: "New description" })).toEqual({ body: "New description" });
  expect(parseResourcePatch("scheduled-sessions", { title: "New title" })).toEqual({ title: "New title" });
  expect(parseResourcePatch("tasks", { done: true, title: "Read" })).toEqual({ done: true, title: "Read" });
});
it("rejects unknown fields, identities, invalid status and ambiguous aliases", () => {
  for (const patch of [{}, { userId: crypto.randomUUID() }, { actualSeconds: 99 }, { status: "unknown" }, { status: "open", published: false }]) expect(() => parseResourcePatch("buddy-listings", patch)).toThrow();
  expect(() => parseResourcePatch("groups", { name: "One", title: "Two" })).toThrow();
  expect(() => parseResourcePatch("scheduled-sessions", { minutes: 17 })).toThrow();
});
