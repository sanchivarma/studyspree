-- Extend the existing keyset query, retaining every later authorization wrapper.
do $update$
declare definition text;needle text:='else m.thread_id=resource end) order by m.created_at';
begin
 definition:=pg_get_functiondef('public.community_read_base(text,jsonb)'::regprocedure);
 if position(needle in definition)=0 then raise exception 'Expected message cursor query was not found';end if;
 definition:=replace(definition,needle,'else m.thread_id=resource end) and (p_query->>''parentId'' is null or m.parent_id=(p_query->>''parentId'')::uuid) order by m.created_at');
 definition:=replace(definition,'if selected_filter<>''saved'' then',
  'if p_query->>''parentId'' is not null and (selected_filter=''saved'' or not exists(select 1 from public.chat_messages where id=(p_query->>''parentId'')::uuid and thread_id=resource and auth_private.can_read_thread(thread_id,actor) and not auth_private.is_blocked(author_id,actor))) then raise exception ''Conversation unavailable'' using errcode=''42501'';end if; if selected_filter<>''saved'' then');
 definition:=replace(definition,'''threadId'',m.thread_id,',
  '''authorName'',(select display_name from public.profiles where id=m.author_id),''replies'',(select count(*) from public.chat_messages r where r.parent_id=m.id and not r.is_deleted and not auth_private.is_blocked(r.author_id,actor)),''threadId'',m.thread_id,');
 execute definition;
end;
$update$;
