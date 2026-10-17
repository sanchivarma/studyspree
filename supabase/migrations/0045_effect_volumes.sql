create function public.valid_effect_volumes(value jsonb) returns boolean
language sql immutable set search_path=public as $$
  select case when jsonb_typeof(value) <> 'object' then false else not exists (
    select 1 from jsonb_each(value) e
    where e.key not in ('cafe','wind','rain','thunderstorm','brown-noise','white-noise')
      or case when jsonb_typeof(e.value) = 'number' then (e.value::text)::numeric not between 0 and 1 else true end
  ) end
$$;
alter table public.profiles add column effect_volumes jsonb not null default '{}'::jsonb
  check(public.valid_effect_volumes(effect_volumes));
grant update(effect_volumes) on public.profiles to authenticated;
