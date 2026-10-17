import { expect, it } from "vitest";
import { themes, getTheme } from "./registry";
import { roomSounds } from "@/lib/audio/catalog";
import { onboardingSchema, profileSchema } from "@/lib/auth/schemas";

it.each(["nature-day", "nature-night", "sci-fi", "space"])("supports %s across scenes, account preferences and ambience", slug => {
  const theme = getTheme(slug);
  expect(theme.slug).toBe(slug);
  expect(theme.mp4).toBe(`/themes/${slug}/scene-v1.mp4`);
  expect(theme.webm).toBe(`/themes/${slug}/scene-v1.webm`);
  expect(theme.poster).toBe(`/themes/${slug}/poster-v1.jpg`);
  expect(roomSounds[theme.slug]).toBeTruthy();
  expect(profileSchema.safeParse({ id: "00000000-0000-4000-8000-000000000001", username: "reader", first_name: "Reader", last_name: "", selected_theme: slug, show_streak: false }).success).toBe(true);
  expect(onboardingSchema.safeParse({ displayName: "Reader", timezone: "Europe/Berlin", selectedTheme: slug, showStreak: false, reduceMotion: true }).success).toBe(true);
});
it("keeps eight distinct themes and a safe fallback", () => {
  expect(themes).toHaveLength(8);
  expect(new Set(themes.map(theme => theme.gradient)).size).toBe(8);
  expect(getTheme("missing").slug).toBe("rain-desk");
});
