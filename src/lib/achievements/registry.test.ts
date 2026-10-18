import { readFileSync, readdirSync } from "node:fs";
import { expect, it } from "vitest";
import { achievementDefinitions } from "./registry";
import { renderAchievementMigration } from "./sql";

it("keeps client definitions, the latest generated migration and legacy streak milestones aligned", () => {
  const latest = readdirSync("supabase/migrations").filter(name => /^\d{4}_achievement_registry\.sql$/.test(name)).sort().at(-1);
  expect(latest).toBeDefined();
  expect(readFileSync(`supabase/migrations/${latest}`, "utf8").replaceAll("\r\n", "\n")).toBe(renderAchievementMigration(achievementDefinitions));
  expect(new Set(achievementDefinitions.map(definition => definition.id)).size).toBe(achievementDefinitions.length);
  expect(new Set(achievementDefinitions.map(definition => definition.kind)).size).toBe(3);
});
