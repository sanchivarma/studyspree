-- Preserve desk choices while renaming Waterfall and retiring Green Nature.
alter table public.profiles drop constraint valid_solo_scene;
update public.profiles set solo_scene=jsonb_set(solo_scene,'{window}','"waterfall"')
where solo_scene->>'window'='rivendell';
update public.profiles set solo_scene=jsonb_set(solo_scene,'{window}','"sea"')
where solo_scene->>'window'='green-nature';
alter table public.profiles alter column solo_scene set default '{"desk":"modern","window":"sea"}';
alter table public.profiles add constraint valid_solo_scene check(
 jsonb_typeof(solo_scene)='object'
 and solo_scene ?& array['desk','window']
 and solo_scene - 'desk' - 'window' = '{}'::jsonb
 and solo_scene->>'desk' in('modern','medieval','shakespearean','pirate','sherlock','kings','student','scientist','submarine','space-shuttle')
 and solo_scene->>'window' in('old-castle','castle-garden','clouds','sailing-ships','sea','mountains','space','underwater','blackhole','magic-academy','waterfall')
);
