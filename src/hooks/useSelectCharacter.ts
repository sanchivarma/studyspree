"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";
import type { CharacterSlug } from "@/lib/characters/registry";
import type { Profile } from "@/types/domain";

export function useSelectCharacter() {
  const client = useQueryClient();
  return useMutation({
    // Serialise writes if the sheet is reopened before a save finishes.
    scope: { id: "character-selection" },
    mutationFn: (selectedCharacter: CharacterSlug) => repo.updateProfile({ selectedCharacter }),
    onMutate: async (selectedCharacter) => {
      await client.cancelQueries({ queryKey: queryKeys.profile() });
      const previous = client.getQueryData<Profile>(queryKeys.profile());
      if (previous) client.setQueryData(queryKeys.profile(), { ...previous, selectedCharacter });
      return { previous, selectedCharacter };
    },
    onError: (_error, _slug, context) => {
      // An older save must not roll back a newer optimistic choice.
      if (context?.previous && client.getQueryData<Profile>(queryKeys.profile())?.selectedCharacter === context.selectedCharacter) {
        client.setQueryData(queryKeys.profile(), context.previous);
      }
    },
    onSettled: () => {
      if (client.isMutating({ predicate: (mutation) => mutation.options.scope?.id === "character-selection" }) === 1) {
        void client.invalidateQueries({ queryKey: queryKeys.profile() });
      }
    },
  });
}
