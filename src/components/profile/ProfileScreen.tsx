"use client";
import Link from "next/link";
import { useState } from "react";
import { AccountControls } from "@/components/layout/AccountControls";
import { useOwnProfile } from "@/hooks/useOwnProfile";
import { useEditOwnProfile } from "@/hooks/useEditOwnProfile";
import { useProfileImageUpload } from "@/hooks/useProfileImageUpload";
import { useTranslation } from "@/hooks/useTranslation";
import { profileEditSchema, type OwnProfile } from "@/lib/profiles/schemas";
import { ProfileCard } from "./ProfileCard";
import { AchievementGrid } from "./AchievementGrid";
import { CharacterHistory } from "./CharacterHistory";
import { CommunityBoard } from "@/components/community/CommunityBoard";
import { StatsScreen } from "@/components/stats/StatsScreen";

const fieldClass = "mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2";
function ProfileEditor({ profile }: { profile: OwnProfile }) {
  const { t } = useTranslation(); const edit = useEditOwnProfile(); const upload = useProfileImageUpload();
  const [invalid, setInvalid] = useState(false);
  const [links, setLinks] = useState(profile.socials.length || 1);
  return <form aria-label={t("profile.edit")} className="space-y-5 rounded-2xl border border-border bg-surface p-6" onSubmit={event => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const tags = (key: string) => String(data.get(key) ?? "").split(",").map(s => s.trim()).filter(Boolean);
    const input = { displayName: data.get("displayName"), bio: data.get("bio"), countryCode: String(data.get("countryCode") ?? "").toUpperCase(),
      occupation: data.get("occupation"), interests: tags("interests"), lookingFor: data.getAll("lookingFor"),
      socials: Array.from({ length: links }, (_, i) => ({ label: String(data.get(`label-${i}`) ?? ""), url: String(data.get(`url-${i}`) ?? "") })).filter(link => link.label || link.url),
      isPublic: !profile.isLocal && data.get("isPublic") === "on" };
    const parsed = profileEditSchema.safeParse(input); setInvalid(!parsed.success);
    if (parsed.success) edit.mutate(parsed.data);
  }}>
    <h2 className="text-xl font-semibold">{t("profile.edit")}</h2>
    {profile.isLocal && <p className="text-small text-text-muted">{t("profile.localNote")}</p>}
    {(["displayName", "countryCode", "occupation"] as const).map(key => <label key={key} className="block">{t(`profile.${key}`)}<input name={key} defaultValue={profile[key]} required={key === "displayName"} maxLength={key === "countryCode" ? 2 : 100} className={fieldClass} /></label>)}
    <div><label htmlFor="profile-bio" className="block">{t("profile.bio")}</label><textarea id="profile-bio" name="bio" defaultValue={profile.bio} maxLength={500} rows={3} className={fieldClass} /></div>
    {(["interests"] as const).map(key => <label key={key} className="block">{t(`profile.${key}`)}<input name={key} aria-label={t(`profile.${key}`)} aria-describedby={`${key}-hint`} defaultValue={profile[key].join(", ")} maxLength={500} className={fieldClass} /><span id={`${key}-hint`} className="text-small text-text-muted">{t("profile.tagsHint")}</span></label>)}
    <fieldset><legend>{t("profile.lookingFor")}</legend>{(["accountability","study-buddy","community"]as const).map(value=><label className="flex min-h-11 items-center gap-3" key={value}><input name="lookingFor" type="checkbox" value={value} defaultChecked={profile.lookingFor.includes(value)}/>{t(`roadmap.${value}`)}</label>)}</fieldset>
    <fieldset className="space-y-3"><legend>{t("profile.socials")}</legend>
      {Array.from({ length: links }, (_, i) => <div key={i} className="grid gap-2 sm:grid-cols-2">
        <label className="text-small">{t("profile.linkLabel", { n: i + 1 })}<input name={`label-${i}`} defaultValue={profile.socials[i]?.label ?? ""} maxLength={30} className={fieldClass} /></label>
        <label className="text-small">{t("profile.linkUrl", { n: i + 1 })}<input name={`url-${i}`} type="url" defaultValue={profile.socials[i]?.url ?? ""} maxLength={300} placeholder="https://" className={fieldClass} /></label>
      </div>)}
      {links < 5 && <button type="button" onClick={() => setLinks(n => n + 1)} className="min-h-11 px-3 text-accent">{t("profile.addLink")}</button>}
    </fieldset>
    <label className="flex min-h-11 items-center gap-3"><input name="isPublic" type="checkbox" defaultChecked={profile.isPublic} disabled={profile.isLocal} className="size-5 accent-accent" />{t("profile.public")}</label>
    <p className="text-small text-text-muted">{t("profile.privacyNote")}</p>
    {(invalid || edit.isError) && <p role="alert">{t(invalid ? "profile.invalid" : "profile.error")}</p>}
    {edit.isSuccess && <p role="status">{t("profile.saved")}</p>}
    <button type="submit" disabled={edit.isPending || upload.isPending} className="min-h-11 rounded-xl bg-accent px-6 py-3 font-semibold text-background disabled:opacity-50">{t("profile.save")}</button>
    {!profile.isLocal && <fieldset disabled={upload.isPending || edit.isPending} className="space-y-4 border-t border-border pt-5"><legend className="pt-5">{t("profile.photos")}</legend>
      {(["avatar", "banner"] as const).map(kind => <label key={kind} className="block">{t(`profile.${kind}`)}<input type="file" accept="image/png,image/jpeg,image/webp" className={fieldClass} onChange={event => {
        const file = event.target.files?.[0]; if (file) upload.mutate({ kind, file }); event.target.value = "";
      }} /></label>)}
      <p className="text-small text-text-muted">{t("profile.photoHint")}</p>
      {upload.isError && <p role="alert">{t("profile.imageError")}</p>}
    </fieldset>}
  </form>;
}
export function ProfileScreen({ initialProfile, isLocal }: { initialProfile?: OwnProfile; isLocal: boolean }) {
  const profile = useOwnProfile(initialProfile, isLocal); const { t } = useTranslation();
  const [tab, setTab] = useState("summary");
  return <section data-testid="profile-screen" className="mx-auto max-w-6xl px-6 pt-24 pb-10">
    <AccountControls /><h1 className="mb-6 text-title">{t("profile.title")}</h1>
    {profile.isPending && <p role="status">{t("profile.loading")}</p>}
    {profile.isError && <p role="alert">{t("profile.error")}</p>}
    {profile.data && <div className="grid items-start gap-6 lg:grid-cols-2"><div className="space-y-4">
      <ProfileCard profile={profile.data} />
      <AchievementGrid highestOnly/>
      {!profile.data.isLocal && <Link href={`/people/${profile.data.username}`} className="inline-flex min-h-11 items-center text-accent underline">{t("profile.view")}</Link>}
      <Link href="/stats" className="ml-5 inline-flex min-h-11 items-center text-accent underline">{t("common.stats")}</Link>
    </div><div><div role="tablist" aria-label={t("profile.title")} className="mb-5 flex flex-wrap gap-2">{([['summary', 'roadmap.summary'], ['achievements', 'achievements.title'], ['statistics', 'common.stats'], ['partners', 'roadmap.partners']] as const).map(([key, label]) => <button key={key} role="tab" type="button" aria-selected={tab === key} aria-controls={`profile-tab-${key}`} id={`profile-tab-button-${key}`} tabIndex={tab === key ? 0 : -1} onClick={() => setTab(key)} onKeyDown={event => { const keys = ['summary','achievements','statistics','partners']; if (['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? 3 : (keys.indexOf(tab)+(event.key==='ArrowRight'?1:3))%4; setTab(keys[next]); document.getElementById(`profile-tab-button-${keys[next]}`)?.focus(); } }} className="min-h-11 rounded-xl border border-border px-3 aria-selected:bg-accent/15">{t(label)}</button>)}</div>
      <div role="tabpanel" id={`profile-tab-${tab}`} aria-labelledby={`profile-tab-button-${tab}`}>
       {tab === 'summary' && <ProfileEditor profile={profile.data}/>}
       {tab === 'achievements' && <AchievementGrid/>}
       {tab === 'statistics' && <StatsScreen embedded/>}
       {tab === 'partners' && <div className="space-y-6">{!isLocal && <CommunityBoard area="partners" embedded/>}<CharacterHistory/></div>}
      </div></div></div>}
  </section>;
}
