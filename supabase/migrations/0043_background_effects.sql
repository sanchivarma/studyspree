alter table public.profiles add column background_effects jsonb not null default '[]'::jsonb;
alter table public.profiles add constraint profiles_background_effects_check check (
  jsonb_typeof(background_effects) = 'array' and jsonb_array_length(background_effects) <= 6
  and background_effects <@ '["cafe","wind","rain","thunderstorm","brown-noise","white-noise"]'::jsonb
);
grant update(background_effects) on public.profiles to authenticated;
-- Radio IDs are catalog keys, never caller-controlled network URLs.
alter table public.profiles drop constraint profiles_music_track_check;
alter table public.profiles add constraint profiles_music_track_check check (
  music_track in ('silent','still-water') or music_track ~ '^radio:[a-z0-9-]{1,80}$'
);
