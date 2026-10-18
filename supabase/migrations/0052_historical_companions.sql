-- Allow the complete known cast; rendering paginates at twenty combined tiles.
create or replace function public.valid_companion_selection(selection jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare mode text; n integer; unique_n integer;
begin
 if selection is null or jsonb_typeof(selection)<>'object' or not(selection ?& array['mode','characterSlugs']) or (select count(*) from jsonb_object_keys(selection))<>2 then return false;end if;
 mode:=selection->>'mode';
 if mode is null or mode not in('solo','characters','people','mixed') or jsonb_typeof(selection->'characterSlugs')<>'array' then return false;end if;
 if exists(select 1 from jsonb_array_elements(selection->'characterSlugs') item where jsonb_typeof(item)<>'string' or item#>>'{}' not in('male-01','male-02','male-03','male-04','female-01','female-02','female-03','female-04','moss-fox','pip-owl','momo-cloud','realistic-01','realistic-02','realistic-03','realistic-04','realistic-05','realistic-06','realistic-07','realistic-08','realistic-09','realistic-10','realistic-11','realistic-12','medieval-scholar','medieval-scribe','einstein','tesla')) then return false;end if;
 select count(*),count(distinct item) into n,unique_n from jsonb_array_elements(selection->'characterSlugs') item;
 return n=unique_n and ((mode in('solo','people') and n=0) or(mode in('characters','mixed') and n>0));
end;$$;
