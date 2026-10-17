do $$begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_messages') then
  alter publication supabase_realtime add table public.chat_messages;
 end if;
end;$$;
-- Soft deletion and body updates retain row identity; subscribers must still pass messages_visible.
alter table public.chat_messages replica identity full;
