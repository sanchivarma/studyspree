-- Generated from src/lib/achievements/definitions.json. Never edit an applied migration.
insert into public.achievement_definitions(id,kind,threshold,name_key,description_key) values
('streak-1','streak',1,'roadmap.streakBadge','roadmap.streakRequirement'),
('streak-2','streak',2,'roadmap.streakBadge','roadmap.streakRequirement'),
('streak-3','streak',3,'roadmap.streakBadge','roadmap.streakRequirement'),
('streak-5','streak',5,'roadmap.streakBadge','roadmap.streakRequirement'),
('streak-7','streak',7,'roadmap.streakBadge','roadmap.streakRequirement'),
('streak-10','streak',10,'roadmap.streakBadge','roadmap.streakRequirement'),
('streak-25','streak',25,'roadmap.streakBadge','roadmap.streakRequirement'),
('streak-50','streak',50,'roadmap.streakBadge','roadmap.streakRequirement'),
('streak-75','streak',75,'roadmap.streakBadge','roadmap.streakRequirement'),
('streak-100','streak',100,'roadmap.streakBadge','roadmap.streakRequirement'),
('streak-200','streak',200,'roadmap.streakBadge','roadmap.streakRequirement'),
('streak-300','streak',300,'roadmap.streakBadge','roadmap.streakRequirement'),
('streak-400','streak',400,'roadmap.streakBadge','roadmap.streakRequirement'),
('streak-500','streak',500,'roadmap.streakBadge','roadmap.streakRequirement'),
('streak-600','streak',600,'roadmap.streakBadge','roadmap.streakRequirement'),
('seconds-3600','study-seconds',3600,'roadmap.timeBadge','roadmap.timeRequirement'),
('seconds-36000','study-seconds',36000,'roadmap.timeBadge','roadmap.timeRequirement'),
('seconds-180000','study-seconds',180000,'roadmap.timeBadge','roadmap.timeRequirement'),
('seconds-360000','study-seconds',360000,'roadmap.timeBadge','roadmap.timeRequirement'),
('sessions-1','session-count',1,'roadmap.sessionBadge','roadmap.sessionRequirement'),
('sessions-10','session-count',10,'roadmap.sessionBadge','roadmap.sessionRequirement'),
('sessions-50','session-count',50,'roadmap.sessionBadge','roadmap.sessionRequirement'),
('sessions-100','session-count',100,'roadmap.sessionBadge','roadmap.sessionRequirement')
on conflict(id) do update set kind=excluded.kind,threshold=excluded.threshold,name_key=excluded.name_key,description_key=excluded.description_key;
-- Legacy awards remain permanent; trusted definitions govern all new awards.
alter table public.achievement_awards drop constraint achievement_awards_milestone_check;
alter table public.achievement_awards add constraint achievement_awards_milestone_check check(milestone>0);
create or replace function auth_private.award_streak_milestones() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.achievement_awards(user_id,milestone) select new.user_id,threshold::integer from public.achievement_definitions where kind='streak' and threshold<=new.best_streak on conflict do nothing;
 return new;
end;$$;
revoke all on function auth_private.award_streak_milestones() from public,anon,authenticated;
do $$declare actor uuid;begin for actor in select id from public.profiles loop perform auth_private.evaluate_achievements(actor);end loop;end;$$;
