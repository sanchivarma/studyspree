import { expect, it } from "vitest";
import { companionSchema, storedCompanionSchema } from "./schemas";
import { sessionSchema } from "@/lib/repo/schemas";

it("rejects retired new choices while retaining remaining partners in historical reads", () => {
  const old = { mode: "characters", characterSlugs: ["medieval-scholar", "male-01", "medieval-scribe"] };
  expect(companionSchema.safeParse(old).success).toBe(false);
  expect(storedCompanionSchema.parse(old)).toEqual({ mode: "characters", characterSlugs: ["male-01"] });
  expect(storedCompanionSchema.parse({ mode: "mixed", characterSlugs: ["medieval-scholar"] })).toEqual({ mode: "people", characterSlugs: [] });
});

it("keeps historical timestamps and banked seconds when the entire old selection is retired", () => {
  const old = { id: "historical-session", startedAt: "2026-10-13T10:00:00.000Z", endedAt: "2026-10-13T11:00:00.000Z", actualSeconds: 3600,
    endedReason: "completed", plannedMinutes: 60, themeSlug: "rain-desk", localDate: "2026-10-13", task: null,
    companions: { mode: "characters", characterSlugs: ["medieval-scholar", "medieval-scribe"] } };
  expect(sessionSchema.parse(old)).toMatchObject({ startedAt: old.startedAt, endedAt: old.endedAt, actualSeconds: 3600, localDate: old.localDate,
    companions: { mode: "solo", characterSlugs: [] } });
});
