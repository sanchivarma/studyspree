-- Human-room snapshots are separate from local-only character preferences.
create or replace function public.valid_companion_selection(selection jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare mode text; n integer; unique_n integer;
begin
 if selection is null or jsonb_typeof(selection)<>'object' or not(selection ?& array['mode','characterSlugs']) or (select count(*) from jsonb_object_keys(selection))<>2 then return false;end if;
 mode:=selection->>'mode';
 if mode is null or mode not in('solo','characters','people','mixed') or jsonb_typeof(selection->'characterSlugs')<>'array' then return false;end if;
 if exists(select 1 from jsonb_array_elements(selection->'characterSlugs') item where jsonb_typeof(item)<>'string' or item#>>'{}' not in('male-01','male-02','male-03','male-04','female-01','female-02','female-03','female-04')) then return false;end if;
 select count(*),count(distinct item) into n,unique_n from jsonb_array_elements(selection->'characterSlugs') item;
 return n=unique_n and n<=8 and ((mode in('solo','people') and n=0) or(mode in('characters','mixed') and n>0));
end;$$;

create function public.community_recipients(p_term text default '') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();items jsonb;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 if length(p_term)>100 then raise exception 'Invalid search' using errcode='22023';end if;
 select coalesce(jsonb_agg(item),'[]') into items from(select auth_private.community_item(p.id,coalesce(nullif(p.display_name,''),p.username),'',p.created_at,p.id,jsonb_build_object('kind','person')) item from public.profiles p where p.id<>actor and p.allow_direct_messages and not auth_private.is_blocked(actor,p.id) and(p.display_name||' '||p.username) ilike '%'||p_term||'%' order by p.username,p.id limit 20) found_people;
 return jsonb_build_object('items',items,'resource',null,'context','{}'::jsonb,'viewerId',actor,'available',true,'nextCursor',null);
end;$$;
revoke all on function public.community_recipients(text) from public,anon;
grant execute on function public.community_recipients(text) to authenticated;

create function auth_private.notify_follow() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not auth_private.is_blocked(new.follower_id,new.following_id) then insert into public.app_notifications(user_id,actor_id,kind,resource_id) values(new.following_id,new.follower_id,'follow',new.follower_id);end if;return new;
end;$$;
create trigger notify_follow after insert on public.profile_follows for each row execute function auth_private.notify_follow();
create function auth_private.notify_partner_arrival() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.app_notifications(user_id,actor_id,kind,resource_id)
 select p.user_id,new.user_id,'partner',new.room_id from public.partner_preferences p where p.partner_id=new.user_id and p.notify and not auth_private.is_blocked(p.user_id,new.user_id)
 and not exists(select 1 from public.app_notifications where user_id=p.user_id and actor_id=new.user_id and kind='partner' and created_at>now()-interval '1 hour');return new;
end;$$;
alter table public.app_notifications drop constraint app_notifications_kind_check;
alter table public.app_notifications add constraint app_notifications_kind_check check(kind in('follow','message','booking','cancelled','membership','partner'));
create trigger notify_partner_arrival after insert on public.room_visits for each row execute function auth_private.notify_partner_arrival();
revoke all on function auth_private.notify_follow(),auth_private.notify_partner_arrival() from public,anon,authenticated;
