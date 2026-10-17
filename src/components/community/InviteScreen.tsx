"use client";
import { useRouter } from "next/navigation";
import { useCommunityMutation } from "@/hooks/useCommunityMutation";
import { useTranslation } from "@/hooks/useTranslation";
import { buttonClass } from "./CommunityComposer";
export function InviteScreen({ token }: {
    token: string;
}) {
    const { t } = useTranslation();
    const mutation = useCommunityMutation();
    const router = useRouter();
    return <section className="mx-auto max-w-lg space-y-5 px-6 pt-24"><h1 className="text-title">{t("community.acceptInvite")}</h1><p>{t("community.sharingNotice")}</p><button className={buttonClass} disabled={mutation.isPending} onClick={() => mutation.mutate({ action: "invite.accept", data: { token } }, { onSuccess: value => router.push(`/${value.kind === "group" ? "groups" : "rooms"}/${value.id}`) })}>{t("community.acceptInvite")}</button>{mutation.isError && <p role="alert">{t("community.inviteUnavailable")}</p>}</section>;
}
