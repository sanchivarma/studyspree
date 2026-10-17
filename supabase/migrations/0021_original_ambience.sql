-- Preserve existing selections, including the explicitly silent preview.
alter table public.profiles drop constraint profiles_music_track_check;
alter table public.profiles add constraint profiles_music_track_check
  check (music_track in ('silent', 'still-water'));
