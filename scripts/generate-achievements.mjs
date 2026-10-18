import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderAchievementMigration } from "../src/lib/achievements/sql.ts";

const filename = process.argv[2];
if (!/^\d{4}_achievement_registry\.sql$/.test(filename ?? "")) throw new Error("Pass the next unused NNNN_achievement_registry.sql migration filename.");
const definitions = JSON.parse(readFileSync(new URL("../src/lib/achievements/definitions.json", import.meta.url), "utf8"));
writeFileSync(resolve("supabase/migrations", filename), renderAchievementMigration(definitions), { flag: "wx" });
console.log(`Created ${filename} from the canonical achievement registry.`);
