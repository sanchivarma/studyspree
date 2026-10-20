import { z } from "zod";
import definitions from "./definitions.json" with { type: "json" };
import type { AchievementDefinition } from "@/types/achievements";

const definitionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), kind: z.enum(["streak", "study-seconds", "session-count"]),
  threshold: z.number().int().positive(), nameKey: z.string().regex(/^[a-zA-Z.]+$/), descriptionKey: z.string().regex(/^[a-zA-Z.]+$/),
}).strict();
export const achievementDefinitions: readonly AchievementDefinition[] = z.array(definitionSchema)
  .refine(values => new Set(values.map(value => value.id)).size === values.length).parse(definitions);
