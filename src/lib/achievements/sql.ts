import type { AchievementDefinition } from "@/types/achievements";

/** Pure rendering shared by the migration generator and the drift check. */
export function renderAchievementMigration(definitions: readonly AchievementDefinition[]): string {
  const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
  const rows = definitions.map(definition => `(${quote(definition.id)},${quote(definition.kind)},${definition.threshold},${quote(definition.nameKey)},${quote(definition.descriptionKey)})`);
  return `-- Generated from src/lib/achievements/definitions.json. Never edit an applied migration.\n` +
    `insert into public.achievement_definitions(id,kind,threshold,name_key,description_key) values\n${rows.join(",\n")}\n` +
    `on conflict(id) do update set kind=excluded.kind,threshold=excluded.threshold,name_key=excluded.name_key,description_key=excluded.description_key;\n` +
    `-- Legacy awards remain permanent; trusted definitions govern all new awards.\n` +
    `alter table public.achievement_awards drop constraint achievement_awards_milestone_check;\n` +
    `alter table public.achievement_awards add constraint achievement_awards_milestone_check check(milestone>0);\n` +
    `create or replace function auth_private.award_streak_milestones() returns trigger language plpgsql security definer set search_path='' as $$\nbegin\n` +
    ` insert into public.achievement_awards(user_id,milestone) select new.user_id,threshold::integer from public.achievement_definitions where kind='streak' and threshold<=new.best_streak on conflict do nothing;\n return new;\nend;$$;\n` +
    `revoke all on function auth_private.award_streak_milestones() from public,anon,authenticated;\n` +
    `do $$declare actor uuid;begin for actor in select id from public.profiles loop perform auth_private.evaluate_achievements(actor);end loop;end;$$;\n`;
}
