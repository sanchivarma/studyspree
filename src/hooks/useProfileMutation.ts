"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { repo } from "@/lib/repo";
import type { Profile } from "@/types/domain";

const latestEdits = new WeakMap<QueryClient, Map<keyof Profile, symbol>>();

export function useProfileMutation<Input>(toPatch: (input: Input) => Partial<Profile>, beforeSave?: (input: Input) => Promise<void>) {
  const client = useQueryClient();
  let edits = latestEdits.get(client);
  if (!edits) { edits = new Map(); latestEdits.set(client, edits); }
  const fieldEdits = edits;
  return useMutation({
    scope: { id: "profile-preferences" },
    mutationFn: async (input: Input) => {
      await beforeSave?.(input);
      return repo.updateProfile(toPatch(input));
    },
    onMutate: async input => {
      await client.cancelQueries({ queryKey: queryKeys.profile() });
      const previous = client.getQueryData<Profile>(queryKeys.profile());
      const patch = toPatch(input);
      const edit = Symbol();
      for (const key of Object.keys(patch) as (keyof Profile)[]) fieldEdits.set(key, edit);
      if (previous) client.setQueryData(queryKeys.profile(), { ...previous, ...patch });
      return { previous, patch, edit };
    },
    onError: (_error, _input, context) => {
      if (!context?.previous) return;
      const previous = context.previous;
      client.setQueryData<Profile>(queryKeys.profile(), current => {
        if (!current) return current;
        // Roll back the edited fields, retaining newer choices and other controls.
        const rollback = Object.fromEntries((Object.keys(context.patch) as (keyof Profile)[])
          .filter(key => fieldEdits.get(key) === context.edit && current[key] === context.patch[key]).map(key => [key, previous[key]]));
        return { ...current, ...rollback };
      });
    },
    onSuccess: (saved, _input, context) => {
      client.setQueryData<Profile>(queryKeys.profile(), current => {
        if (!current) return saved;
        if (!context) return current;
        const confirmed = Object.fromEntries((Object.keys(context.patch) as (keyof Profile)[])
          .filter(key => fieldEdits.get(key) === context.edit && current[key] === context.patch[key]).map(key => [key, saved[key]]));
        return { ...current, ...confirmed };
      });
    },
    onSettled: () => {
      // Refetch after the whole queue, so an earlier save cannot erase optimism.
      if (client.isMutating({ predicate: mutation => mutation.options.scope?.id === "profile-preferences" }) === 1) {
        void client.invalidateQueries({ queryKey: queryKeys.profile() });
      }
    },
  });
}
