"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authenticate } from "@/app/(auth)/actions";
import { queryKeys } from "@/lib/queryKeys";
import type { OnboardingInput } from "@/lib/auth/schemas";
import { safeAuthReturnTo } from "@/lib/auth/returnTo";

export function useOnboarding() {
  const router = useRouter();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: OnboardingInput) => {
      const result = await authenticate("onboard", input);
      if (result.status !== "success") throw new Error("onboarding_update");
      // The server action already saved these fields. Onboarding sits outside
      // the account layout; writing through its preview repository would seed
      // the next page with unrelated local preferences and repeat the write.
      return safeAuthReturnTo(result.navigate) ?? "/";
    },
    onSuccess: destination => {
      client.removeQueries({ queryKey: queryKeys.profile() });
      router.replace(destination);
    },
  });
}
