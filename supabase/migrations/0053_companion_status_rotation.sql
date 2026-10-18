-- Persist a trusted per-account session ordinal for round-robin virtual statuses.
alter table public.sessions add column companion_status_cycle bigint not null default 0
  check (companion_status_cycle >= 0);
create index sessions_companion_status_cycle on public.sessions(user_id, companion_status_cycle desc);

create function public.assign_companion_status_cycle() returns trigger
language plpgsql set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 2353));
  select coalesce(max(s.companion_status_cycle), -1) + 1 into new.companion_status_cycle
    from public.sessions s where s.user_id = new.user_id;
  return new;
end;
$$;
create trigger assign_companion_status_cycle before insert on public.sessions
  for each row execute function public.assign_companion_status_cycle();

create function public.preserve_companion_status_cycle() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.companion_status_cycle is distinct from old.companion_status_cycle then
    raise exception 'Session companion status cycle is immutable' using errcode='23514';
  end if;
  return new;
end;
$$;
create trigger preserve_companion_status_cycle before update on public.sessions
  for each row execute function public.preserve_companion_status_cycle();
