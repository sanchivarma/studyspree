"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authenticate } from "@/app/(auth)/actions";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";
import type { OnboardingInput } from "@/lib/auth/schemas";

export function useOnboarding() {
  const router = useRouter();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: OnboardingInput) => {
      const result = await authenticate("onboard", input);
      if (result.status !== "success") throw new Error("onboarding_update");
      return repo.updateProfile({ ...input, webcamEnabled: false, ambienceEnabled: false });
    },
    onSuccess: profile => {
      client.setQueryData(queryKeys.profile(), profile);
      router.replace("/"); router.refresh();
    },
  });
}
