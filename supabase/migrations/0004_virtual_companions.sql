-- Virtual companions are separate from theme selection and session accounting.
create function public.valid_companion_selection(selection jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare v_mode text; v_count integer; v_unique integer;
begin
  if selection is null or jsonb_typeof(selection) <> 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(selection)) <> 2 or not (selection ?& array['mode','characterSlugs']) then return false; end if;
  v_mode := selection->>'mode';
  if v_mode is null or v_mode not in ('solo','characters') or jsonb_typeof(selection->'characterSlugs') <> 'array' then return false; end if;
  if exists(select 1 from jsonb_array_elements(selection->'characterSlugs') item
    where jsonb_typeof(item) <> 'string' or item #>> '{}' not in ('male-01','male-02','male-03','male-04','female-01','female-02','female-03','female-04')) then return false; end if;
  select count(*), count(distinct item) into v_count,v_unique from jsonb_array_elements(selection->'characterSlugs') item;
  return v_count = v_unique and v_count <= 8 and ((v_mode = 'solo' and v_count = 0) or (v_mode = 'characters' and v_count > 0));
end;
$$;

alter table public.profiles add column companion_preferences jsonb not null default '{"mode":"solo","characterSlugs":[]}'::jsonb
  check(public.valid_companion_selection(companion_preferences));
alter table public.sessions add column companions jsonb not null default '{"mode":"solo","characterSlugs":[]}'::jsonb
  check(public.valid_companion_selection(companions));

grant update(companion_preferences) on public.profiles to authenticated;
grant insert(companions), update(companions) on public.sessions to authenticated;

create function auth_private.protect_ended_companions() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.ended_at is not null and new.companions is distinct from old.companions then
    raise exception 'Ended session companions are immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger protect_ended_companions before update on public.sessions
for each row execute function auth_private.protect_ended_companions();
revoke all on function auth_private.protect_ended_companions() from public,anon,authenticated;
