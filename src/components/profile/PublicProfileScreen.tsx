"use client";
import Link from "next/link";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useProfileFollow } from "@/hooks/useProfileFollow";
import { useTranslation } from "@/hooks/useTranslation";
import { ProfileCard } from "./ProfileCard";
import type { PublicProfile } from "@/lib/profiles/schemas";
export function PublicProfileScreen({ username, initialProfile }: { username: string; initialProfile: PublicProfile | null }) {
  const profile = usePublicProfile(username, initialProfile); const follow = useProfileFollow(username); const { t } = useTranslation();
  return <section data-testid="public-profile" className="mx-auto max-w-xl space-y-5 px-6 py-12">
    <h1 className="text-title">{t("profile.title")}</h1>
    {profile.isPending ? <p role="status">{t("profile.loading")}</p> : profile.isError || !profile.data ? <p role="status">{t("profile.unavailable")}</p> : <>
      <ProfileCard profile={profile.data} />
      {profile.data.isSelf ? <Link href="/profile" className="inline-flex min-h-11 items-center text-accent underline">{t("profile.edit")}</Link> : <button type="button" aria-pressed={profile.data.isFollowing} disabled={follow.isPending}
        onClick={() => follow.mutate(!profile.data!.isFollowing)} className="min-h-11 rounded-xl bg-accent px-6 py-3 font-semibold text-background disabled:opacity-50">{t(profile.data.isFollowing ? "profile.unfollow" : "profile.follow")}</button>}
      {follow.isError && <p role="alert">{t("profile.error")}</p>}
    </>}
  </section>;
}
