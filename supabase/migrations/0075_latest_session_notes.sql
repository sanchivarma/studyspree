-- Load the newest notes first, then keyset-page earlier notes without hiding
-- a newly submitted note behind an older, already-full page.
create or replace function public.read_session_notes(p_session uuid,p_after_at timestamptz default null,p_after_id uuid default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare items jsonb; more boolean; last_item jsonb;
begin
  if not exists(select 1 from public.sessions where id=p_session and user_id=auth.uid()) then
    raise exception 'Session unavailable' using errcode='42501';end if;
  if (p_after_at is null)<>(p_after_id is null) then raise exception 'Invalid cursor' using errcode='22023';end if;
  select coalesce(jsonb_agg(item order by stamp desc,note_id desc),'[]') into items from (
    select jsonb_build_object('id',id,'sessionId',session_id,'body',body,'createdAt',created_at) item,created_at stamp,id note_id
    from public.session_notes where session_id=p_session
      and (p_after_at is null or (created_at,id)<(p_after_at,p_after_id))
    order by created_at desc,id desc limit 51
  ) notes;
  more:=jsonb_array_length(items)>50;
  if more then items:=items-50;end if;
  last_item:=items->(jsonb_array_length(items)-1);
  return jsonb_build_object('items',items,'nextCursor',case when more then
    jsonb_build_object('at',last_item->'createdAt','id',last_item->'id') else null end);
end;$$;
