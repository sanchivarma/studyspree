-- Owner-scoped preferences reuse the existing profiles RLS and update grants.
alter table public.profiles add column solo_scene jsonb not null default '{"desk":"modern","window":"green-nature"}';
alter table public.profiles add constraint valid_solo_scene check(
 jsonb_typeof(solo_scene)='object'
 and solo_scene ?& array['desk','window']
 and solo_scene - 'desk' - 'window' = '{}'::jsonb
 and solo_scene->>'desk' in('modern','medieval','shakespearean','pirate','sherlock','kings','student','scientist','submarine','space-shuttle')
 and solo_scene->>'window' in('old-castle','castle-garden','green-nature','clouds','sailing-ships','sea','mountains','space','underwater','blackhole','hogwarts','rivendell')
);
grant update(solo_scene) on public.profiles to authenticated;
