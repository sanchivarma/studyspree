begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(3);
select ok(public.valid_companion_selection('{"mode":"mixed","characterSlugs":["male-01","moss-fox","realistic-01"]}'),'Mixed styles are accepted');
select ok(not public.valid_companion_selection('{"mode":"characters","characterSlugs":["famous-unlicensed"]}'),'Unknown characters remain rejected');
select ok(not public.valid_companion_selection('{"mode":"characters","characterSlugs":["male-01","male-02","male-03","male-04","female-01","female-02","female-03","female-04","moss-fox"]}'),'Selection still has an eight-partner limit');
select * from finish();
rollback;
