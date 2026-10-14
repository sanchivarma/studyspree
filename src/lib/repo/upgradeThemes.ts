// Storage compatibility for the naming change. Never reset existing study time.
export function upgradeThemeNames(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(upgradeThemeNames);
  if (typeof value !== "object" || value === null) return value;
  const row = { ...value } as Record<string, unknown>;
  for (const [previous, next] of [["selectedCharacter", "selectedTheme"], ["characterSlug", "themeSlug"], ["selected_character", "selected_theme"]]) {
    if (previous in row) {
      if (!(next in row)) row[next] = row[previous];
      delete row[previous];
    }
  }
  return row;
}
