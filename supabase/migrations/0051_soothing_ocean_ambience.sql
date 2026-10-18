-- Extend the catalog without rewriting existing choices or per-effect levels.
alter table public.profiles drop constraint profiles_background_effects_check;
alter table public.profiles drop constraint profiles_background_effects_unique;
-- Remove retired sound selections without altering unrelated profile settings.
update public.profiles set
 background_effects = (select coalesce(jsonb_agg(item order by ord),'[]'::jsonb) from jsonb_array_elements(background_effects) with ordinality as e(item,ord) where item #>> '{}' not in ('medieval','medieval-flute','medieval-lyre')),
 effect_volumes = effect_volumes - array['medieval','medieval-flute','medieval-lyre'];
alter table public.profiles add constraint profiles_background_effects_check check (
  jsonb_typeof(background_effects) = 'array' and jsonb_array_length(background_effects) <= 9
  and background_effects <@ '["cafe","wind","rain","thunderstorm","brown-noise","white-noise","ocean","library","castle"]'::jsonb
);
alter table public.profiles add constraint profiles_background_effects_unique check (
  jsonb_array_length(background_effects) =
    (background_effects ? 'cafe')::integer + (background_effects ? 'wind')::integer +
    (background_effects ? 'rain')::integer + (background_effects ? 'thunderstorm')::integer +
    (background_effects ? 'brown-noise')::integer + (background_effects ? 'white-noise')::integer +
    (background_effects ? 'ocean')::integer + (background_effects ? 'library')::integer + (background_effects ? 'castle')::integer
);
create or replace function public.valid_effect_volumes(value jsonb) returns boolean
language sql immutable set search_path=public as $$
  select case when jsonb_typeof(value) <> 'object' then false else not exists (
    select 1 from jsonb_each(value) e
    where e.key not in ('cafe','wind','rain','thunderstorm','brown-noise','white-noise','ocean','library','castle')
      or case when jsonb_typeof(e.value) = 'number' then (e.value::text)::numeric not between 0 and 1 else true end
  ) end
$$;
