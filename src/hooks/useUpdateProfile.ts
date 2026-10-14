"use client";

import { useProfileMutation } from "@/hooks/useProfileMutation";
import type { Profile } from "@/types/domain";

export function useUpdateProfile() {
  return useProfileMutation((patch: Partial<Profile>) => patch);
}
