"use client";
import { useMutation } from "@tanstack/react-query";
import { invitationRepository } from "@/lib/repo/invitations";
import { useTranslation } from "./useTranslation";
export function useEmailInvitation() {
  const { locale } = useTranslation();
  return useMutation({ mutationFn: (email: string) => invitationRepository.send(email, locale), retry: false });
}
