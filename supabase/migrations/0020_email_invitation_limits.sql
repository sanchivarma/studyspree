-- A delivery reservation contains a hash, never an address or email body.
create table public.email_invitation_reservations (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipient_hash text not null check(recipient_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
create index email_invitation_actor_time on public.email_invitation_reservations(user_id,created_at);
alter table public.email_invitation_reservations enable row level security;
revoke all on public.email_invitation_reservations from public,anon,authenticated;
grant select on public.email_invitation_reservations to authenticated;
create policy own_email_reservations on public.email_invitation_reservations for select to authenticated using(user_id=auth.uid());
create function public.reserve_email_invitation(p_id uuid,p_recipient_hash text) returns boolean
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 if p_id is null or p_recipient_hash is null or p_recipient_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid invitation' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,20));
 if exists(select 1 from public.email_invitation_reservations where id=p_id) then return false;end if;
 if (select count(*) from public.email_invitation_reservations where user_id=actor and created_at>now()-interval '1 hour')>=5 then raise exception 'Invitation limit reached' using errcode='P0001';end if;
 insert into public.email_invitation_reservations(id,user_id,recipient_hash) values(p_id,actor,p_recipient_hash);
 return true;
end;$$;
revoke all on function public.reserve_email_invitation(uuid,text) from public,anon;
grant execute on function public.reserve_email_invitation(uuid,text) to authenticated;
