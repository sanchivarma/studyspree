-- These are scene themes, reserved separately from future virtual partners.
-- Rename the existing column in place so saved preferences remain intact.
alter table public.profiles rename column selected_character to selected_theme;
alter table public.profiles rename constraint profiles_selected_character_check to profiles_selected_theme_check;
