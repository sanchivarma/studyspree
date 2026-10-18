-- JSON null must not bypass the choice constraint through SQL's null logic.
alter table public.profiles add constraint solo_scene_string_values check(
 jsonb_typeof(solo_scene->'desk')='string' and jsonb_typeof(solo_scene->'window')='string'
);
