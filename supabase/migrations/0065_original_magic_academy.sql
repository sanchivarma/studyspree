-- User chose an original academy after the named Hogwarts image was unavailable.
alter table public.profiles drop constraint valid_solo_scene;
update public.profiles set solo_scene=jsonb_set(solo_scene,'{window}','"magic-academy"') where solo_scene->>'window'='hogwarts';
alter table public.profiles add constraint valid_solo_scene check(
 jsonb_typeof(solo_scene)='object'
 and solo_scene ?& array['desk','window']
 and solo_scene - 'desk' - 'window' = '{}'::jsonb
 and solo_scene->>'desk' in('modern','medieval','shakespearean','pirate','sherlock','kings','student','scientist','submarine','space-shuttle')
 and solo_scene->>'window' in('old-castle','castle-garden','green-nature','clouds','sailing-ships','sea','mountains','space','underwater','blackhole','magic-academy','rivendell')
);
