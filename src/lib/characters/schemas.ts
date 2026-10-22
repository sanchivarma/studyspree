import { z } from "zod";
import { characterSlugs } from "@/types/characters";
import type { CompanionPreferences } from "@/types/characters";

export const soloCompanions = (): CompanionPreferences => ({ mode: "solo", characterSlugs: [] });
export const companionSchema = z.object({
  mode: z.enum(["solo", "characters", "people", "mixed"]),
  characterSlugs: z.array(z.enum(characterSlugs)).max(characterSlugs.length),
}).strict().superRefine((value, context) => {
  if (new Set(value.characterSlugs).size !== value.characterSlugs.length) context.addIssue({ code: "custom", message: "Duplicate character" });
  if ((value.mode === "solo" || value.mode === "people") && value.characterSlugs.length > 0 || value.mode === "mixed" && value.characterSlugs.length === 0) context.addIssue({ code: "custom", message: "Companion mode and selection disagree" });
});

// Real human rooms have a separate transport and authorisation boundary.
export const localCompanionSchema = companionSchema.refine(value => value.mode === "solo" || value.mode === "characters", { message: "Live rooms are not available in local mode" });

/** Retire choices on read without throwing away a saved session or its hours. */
export function removeRetiredCompanions(input: unknown): unknown {
  if (!input || typeof input !== "object" || !("characterSlugs" in input) || !Array.isArray(input.characterSlugs)) return input;
  const slugs = input.characterSlugs.filter(slug => slug !== "medieval-scholar" && slug !== "medieval-scribe");
  if (slugs.length === input.characterSlugs.length) return input;
  const mode = "mode" in input ? input.mode : undefined;
  return { ...input, characterSlugs: slugs, mode: slugs.length ? mode : mode === "mixed" ? "people" : mode === "characters" ? "solo" : mode };
}
export const storedCompanionSchema = z.preprocess(removeRetiredCompanions, companionSchema);
export const storedLocalCompanionSchema = z.preprocess(removeRetiredCompanions, localCompanionSchema);
