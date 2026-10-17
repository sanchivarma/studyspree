alter table public.profiles add constraint profiles_background_effects_unique check (
  jsonb_array_length(background_effects) =
    (background_effects ? 'cafe')::integer + (background_effects ? 'wind')::integer +
    (background_effects ? 'rain')::integer + (background_effects ? 'thunderstorm')::integer +
    (background_effects ? 'brown-noise')::integer + (background_effects ? 'white-noise')::integer
);
