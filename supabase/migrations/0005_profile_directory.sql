-- Public-facing data lives separately from private account/preferences.
create table public.profile_cards (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 100),
  bio text not null default '' check (length(bio) <= 500),
  country_code text not null default '' check (country_code ~ '^$|^[A-Z]{2}$'),
  occupation text not null default '' check (length(occupation) <= 100),
  interests text[] not null default '{}' check (cardinality(interests) <= 10),
  looking_for text[] not null default '{}' check (cardinality(looking_for) <= 10),
  socials jsonb not null default '[]',
  is_public boolean not null default false,
  avatar_path text, banner_path text,
  check (avatar_path is null or avatar_path ~ ('^' || user_id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$')),
  check (banner_path is null or banner_path ~ ('^' || user_id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$'))
);
alter table public.profile_cards enable row level security;
revoke all on public.profile_cards from anon, authenticated;
grant select on public.profile_cards to authenticated;
grant update(display_name,bio,country_code,occupation,interests,looking_for,socials,is_public,avatar_path,banner_path) on public.profile_cards to authenticated;
create policy cards_read on public.profile_cards for select to authenticated using (user_id = (select auth.uid()) or is_public);
create policy cards_update on public.profile_cards for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create function auth_private.validate_card() returns trigger language plpgsql set search_path = '' as $$
declare item jsonb; tag text;
begin
  foreach tag in array new.interests || new.looking_for loop
    if length(trim(tag)) not between 1 and 40 then raise exception 'Invalid tag' using errcode = '23514'; end if;
  end loop;
  if (select count(*) <> count(distinct lower(v)) from unnest(new.interests) v)
    or (select count(*) <> count(distinct lower(v)) from unnest(new.looking_for) v) then
    raise exception 'Duplicate tags' using errcode = '23514';
  end if;
  if jsonb_typeof(new.socials) <> 'array' or jsonb_array_length(new.socials) > 5 then raise exception 'Invalid links' using errcode = '23514'; end if;
  for item in select value from jsonb_array_elements(new.socials) loop
    if jsonb_typeof(item) <> 'object' or (select count(*) from jsonb_object_keys(item)) <> 2
      or jsonb_typeof(item->'label') is distinct from 'string' or length(item->>'label') not between 1 and 30
      or jsonb_typeof(item->'url') is distinct from 'string' or length(item->>'url') > 300
      or item->>'url' !~ '^https://[^/@[:space:]]+([/?#]|$)' then
      raise exception 'Invalid link' using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;
create trigger validate_card before insert or update on public.profile_cards for each row execute function auth_private.validate_card();

create function auth_private.sync_card() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profile_cards(user_id, display_name) values (new.id, new.display_name)
  on conflict (user_id) do update set display_name = excluded.display_name where profile_cards.display_name is distinct from excluded.display_name;
  return new;
end;
$$;
create trigger sync_card after insert or update of display_name on public.profiles for each row execute function auth_private.sync_card();
insert into public.profile_cards(user_id,display_name) select id,display_name from public.profiles;
create function auth_private.sync_card_name() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set display_name = new.display_name where id = new.user_id and display_name is distinct from new.display_name;
  return new;
end;
$$;
create trigger sync_card_name after update of display_name on public.profile_cards for each row execute function auth_private.sync_card_name();

create table public.profile_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id,following_id), check (follower_id <> following_id)
);
create index profile_follows_target on public.profile_follows(following_id);
alter table public.profile_follows enable row level security;
revoke all on public.profile_follows from anon,authenticated;
grant select,insert,delete on public.profile_follows to authenticated;
create policy follows_read on public.profile_follows for select to authenticated using (follower_id = (select auth.uid()) or following_id = (select auth.uid()));
create policy follows_insert on public.profile_follows for insert to authenticated with check (
  follower_id = (select auth.uid()) and exists(select 1 from public.profile_cards where user_id = following_id and is_public)
);
create policy follows_delete on public.profile_follows for delete to authenticated using (follower_id = (select auth.uid()));

-- Narrow, deliberate public projection; never expose names, email or preferences.
create function public.read_visible_profile(p_username text) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id',p.id,'username',p.username,'displayName',c.display_name,'bio',c.bio,'countryCode',c.country_code,
    'occupation',c.occupation,'interests',c.interests,'lookingFor',c.looking_for,'socials',c.socials,
    'joinedAt',p.created_at,'avatarPath',c.avatar_path,'bannerPath',c.banner_path,
    'followers',(select count(*) from public.profile_follows where following_id=p.id),
    'following',(select count(*) from public.profile_follows where follower_id=p.id),
    'isFollowing',exists(select 1 from public.profile_follows where follower_id=auth.uid() and following_id=p.id),
    'isSelf',p.id=auth.uid()
  ) from public.profiles p join public.profile_cards c on c.user_id=p.id
  where auth.uid() is not null and p.username=p_username and (c.is_public or p.id=auth.uid());
$$;
revoke all on function public.read_visible_profile(text) from public,anon;
grant execute on function public.read_visible_profile(text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('profile-media','profile-media',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy profile_media_insert on storage.objects for insert to authenticated with check (
  bucket_id='profile-media' and (storage.foldername(name))[1]=(select auth.uid())::text
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
);
create policy profile_media_read on storage.objects for select to authenticated using (
  bucket_id='profile-media' and ((storage.foldername(name))[1]=(select auth.uid())::text
    or exists(select 1 from public.profile_cards c where c.is_public and (c.avatar_path=name or c.banner_path=name)))
);
create policy profile_media_delete on storage.objects for delete to authenticated using (
  bucket_id='profile-media' and (storage.foldername(name))[1]=(select auth.uid())::text
);
revoke all on function auth_private.validate_card(), auth_private.sync_card(), auth_private.sync_card_name() from public,anon,authenticated;
