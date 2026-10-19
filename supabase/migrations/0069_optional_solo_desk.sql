-- Removing a desk is a saved appearance choice, independent of the window.
alter table public.profiles drop constraint valid_solo_scene;
alter table public.profiles add constraint valid_solo_scene check(
 jsonb_typeof(solo_scene)='object'
 and solo_scene ?& array['desk','window']
 and solo_scene - 'desk' - 'window' = '{}'::jsonb
 and solo_scene->>'desk' in('none','modern','medieval','shakespearean','pirate','kings','student','scientist','submarine','space-shuttle')
 and solo_scene->>'window' in('old-castle','castle-garden','sailing-ships','sea','mountains','space','underwater','magic-academy','waterfall')
);
