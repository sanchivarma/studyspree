-- Preserve popular-feed cursor scores when a reaction is later removed.
-- Only trusted triggers write this private history; current visible reactions
-- still come from post_reactions and retain their existing uniqueness rules.
create table public.post_reaction_intervals(
 id bigint generated always as identity primary key,
 user_id uuid not null references public.profiles(id) on delete cascade,
 post_id uuid not null references public.feed_posts(id) on delete cascade,
 started_at timestamptz not null,
 ended_at timestamptz,
 check(ended_at is null or ended_at>=started_at)
);
alter table public.post_reaction_intervals enable row level security;
revoke all on public.post_reaction_intervals from public,anon,authenticated;
create unique index reaction_interval_open on public.post_reaction_intervals(user_id,post_id) where ended_at is null;
create index reaction_interval_snapshot on public.post_reaction_intervals(post_id,started_at,ended_at);
insert into public.post_reaction_intervals(user_id,post_id,started_at) select user_id,post_id,created_at from public.post_reactions;
create function auth_private.record_reaction_interval() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  insert into public.post_reaction_intervals(user_id,post_id,started_at) values(new.user_id,new.post_id,now());return new;
 else
  update public.post_reaction_intervals set ended_at=greatest(now(),started_at) where user_id=old.user_id and post_id=old.post_id and ended_at is null;return old;
 end if;
end;$$;
revoke all on function auth_private.record_reaction_interval() from public,anon,authenticated;
create trigger reaction_interval_change after insert or delete on public.post_reactions for each row execute function auth_private.record_reaction_interval();
create or replace function auth_private.popularity_score(post uuid,stamp timestamptz) returns bigint language sql stable security definer set search_path='' as $$
 select count(*) from public.post_reaction_intervals where post_id=post and started_at<=stamp and(ended_at is null or ended_at>stamp);
$$;
revoke all on function auth_private.popularity_score(uuid,timestamptz) from public,anon,authenticated;
