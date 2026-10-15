import { z } from "zod";
import { characterSlugs } from "@/types/characters";
import type { CompanionPreferences } from "@/types/characters";

export const soloCompanions = (): CompanionPreferences => ({ mode: "solo", characterSlugs: [] });
export const companionSchema = z.object({
  mode: z.enum(["solo", "characters", "people", "mixed"]),
  characterSlugs: z.array(z.enum(characterSlugs)).max(8),
}).strict().superRefine((value, context) => {
  if (new Set(value.characterSlugs).size !== value.characterSlugs.length) context.addIssue({ code: "custom", message: "Duplicate character" });
  const needsCharacters = value.mode === "characters" || value.mode === "mixed";
  if (needsCharacters !== (value.characterSlugs.length > 0)) context.addIssue({ code: "custom", message: "Companion mode and selection disagree" });
});

// Real human rooms have a separate transport and authorisation boundary.
export const localCompanionSchema = companionSchema.refine(value => value.mode === "solo" || value.mode === "characters", { message: "Live rooms are not available in local mode" });
