"use client";
/* eslint-disable @next/next/no-img-element -- Private media requires authenticated, no-store requests. */
import { useTranslation } from "@/hooks/useTranslation";
import type { PublicProfile } from "@/lib/profiles/schemas";

export function ProfileCard({ profile }: { profile: PublicProfile }) {
  const { t, locale } = useTranslation();
  const media = (path: string) => `/api/profile-media/${path}`;
  return <article className="overflow-hidden rounded-2xl border border-border bg-surface">
    <div className="relative aspect-[3/1] bg-accent/15">
      {profile.bannerPath && <img src={media(profile.bannerPath)} alt="" className="absolute inset-0 size-full object-cover" onError={event => { event.currentTarget.hidden = true; }} />}
    </div>
    <div className="space-y-5 p-6">
      <div className="flex items-center gap-4">
        <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-3xl" aria-label={t("profile.avatar")}>
          <span aria-hidden="true">{(profile.displayName || profile.username).slice(0, 1).toLocaleUpperCase(locale)}</span>
          {profile.avatarPath && <img src={media(profile.avatarPath)} alt="" className="absolute inset-0 size-full object-cover" onError={event => { event.currentTarget.hidden = true; }} />}
        </div>
        <div className="min-w-0"><h2 className="break-words text-xl font-semibold">{profile.displayName || profile.username}</h2><p className="break-words text-small text-text-muted">@{profile.username}</p></div>
      </div>
      {(profile.countryCode || profile.occupation) && <p className="text-small text-text-muted">{[profile.countryCode ? new Intl.DisplayNames([locale], { type: "region" }).of(profile.countryCode) : "", profile.occupation].filter(Boolean).join(" · ")}</p>}
      {profile.bio && <p className="whitespace-pre-wrap break-words">{profile.bio}</p>}
      {(["interests", "lookingFor"] as const).map(field => profile[field].length > 0 && <div key={field}>
        <h3 className="mb-2 text-small text-text-muted">{t(`profile.${field}`)}</h3>
        <ul className="flex flex-wrap gap-2">{profile[field].map(tag => <li key={tag} className="rounded-full bg-surface-2 px-3 py-1 text-small">{tag}</li>)}</ul>
      </div>)}
      {profile.socials.length > 0 && <ul className="flex flex-wrap gap-3">{profile.socials.map((link, index) => <li key={index}><a href={link.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-11 items-center break-all text-accent underline">{link.label}</a></li>)}</ul>}
      <dl className="flex gap-6 text-small tabular-nums"><div><dt className="text-text-muted">{t("profile.followers")}</dt><dd>{profile.followers}</dd></div><div><dt className="text-text-muted">{t("profile.following")}</dt><dd>{profile.following}</dd></div></dl>
      <p className="text-small text-text-muted">{t("profile.joined", { date: new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(profile.joinedAt)) })}</p>
    </div>
  </article>;
}
