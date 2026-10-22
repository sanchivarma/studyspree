"use client";
import { useProfile } from "./useProfile";
import { useActiveSession } from "./useActiveSession";

/** Closing clears the previous session; later explicit Settings edits remain. */
export function useFreshSessionSetup() {
  const profile = useProfile();
  const active = useActiveSession();
  return {
    ready: profile.isSuccess && active.isSuccess && !active.data,
    error: profile.isError || active.isError,
    retry: () => { void Promise.all([profile.refetch(), active.refetch()]); },
  };
}
