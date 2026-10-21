"use client";
import { useId, useRef, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useTranslation } from "@/hooks/useTranslation";
import { useCommunityMutation } from "@/hooks/useCommunityMutation";
import { useCommunityUpload } from "@/hooks/useCommunityUpload";
import { useCommunity } from "@/hooks/useCommunity";
import { usePendingDeliveries } from "@/hooks/usePendingDeliveries";
import { nextDeliveryAttempt, type DeliveryAttempt } from "@/lib/community/delivery";
import { communityCommandSchema, type Attachment, type CommunityArea, type CommunityCommand } from "@/lib/community/schemas";
import { resolveCalendarTime } from "@/lib/community/calendar";
import { formatInTimeZone } from "date-fns-tz";
import { now } from "@/lib/clock";
import type { TranslationKey } from "@/translations";
import { buttonClass, fieldClass } from "./styles";
export { buttonClass, fieldClass } from "./styles";
const creators = ["tasks", "feedback", "groups", "spaces", "buddies", "conversations", "messages", "feed", "schedule"];
export function CommunityComposer({ area, id, groupId, parentId, canPost = true }: {
    area: CommunityArea;
    id?: string;
    groupId?: string;
    parentId?: string;
    canPost?: boolean;
}) {
    const { t } = useTranslation();
    const bodyId = useId();
    const profile = useProfile();
    const mutation = useCommunityMutation();
    const upload = useCommunityUpload();
    const [error, setError] = useState<TranslationKey | null>(null);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [recipientQuery, setRecipientQuery] = useState("");
    const [selected, setSelected] = useState<string[]>([]);
    const recipients = useCommunity("recipients", { q: recipientQuery }, area === "conversations" && recipientQuery.length > 1);
    const attempt = useRef<DeliveryAttempt | null>(null);
    const deliveries = usePendingDeliveries();
    const posting = useRef(false);
    const zone = profile.data?.timezone ?? "UTC";
    const today = formatInTimeZone(now(), zone, "yyyy-MM-dd");
    if (!creators.includes(area) || !canPost)
        return null;
    const isTextOnly = area === "messages" || area === "feed";
    const showBody = !["tasks", "schedule", "conversations"].includes(area);
    return <form aria-label={t(isTextOnly ? "community.send" : "community.create")} className="space-y-4 rounded-2xl border border-border bg-surface p-5" onSubmit={event => {
            event.preventDefault();
            if (posting.current || upload.isPending)
                return;
            setError(null);
            const form = event.currentTarget;
            const data = new FormData(form);
            const text = (name: string) => String(data.get(name) ?? "").trim();
            const title = text("title");
            const body = text("body");
            if (isTextOnly) {
                const delivered = new Set(deliveries.flatMap(delivery => delivery.status === "success" && delivery.command && (delivery.command.action === "message.send" || delivery.command.action === "post.create") && delivery.command.data.clientId ? [delivery.command.data.clientId] : []));
                attempt.current = nextDeliveryAttempt(attempt.current, JSON.stringify({ area, id, parentId, groupId, body, attachments, visibility: text("visibility") }), delivered, () => crypto.randomUUID());
            }
            let command: CommunityCommand;
            try {
                switch (area) {
                    case "tasks":
                        command = { action: "task.create", data: { title, date: text("date") } };
                        break;
                    case "feedback":
                        command = communityCommandSchema.parse({ action: "feedback.create", data: { kind: text("kind"), body } });
                        break;
                    case "groups":
                        command = { action: "group.create", data: { title, body, private: data.get("private") === "on" } };
                        break;
                    case "spaces":
                        command = communityCommandSchema.parse({ action: "room.create", data: { title, body, category: text("category"), capacity: Number(data.get("capacity")), visibility: text("visibility"), private: data.get("private") === "on", ...(groupId ? { groupId } : {}) } });
                        break;
                    case "buddies":
                        command = { action: "buddy.save", data: { title, body, subjects: text("subjects").split(",").map(v => v.trim()).filter(Boolean), published: data.get("published") === "on" } };
                        break;
                    case "conversations":
                        command = { action: "thread.create", data: { title, members: selected } };
                        break;
                    case "messages":
                        command = { action: "message.send", data: { id: id!, body, clientId: attempt.current!.clientId, ...(parentId ? { parentId } : {}) } };
                        break;
                    case "feed":
                        command = communityCommandSchema.parse({ action: "post.create", data: { body, clientId: attempt.current!.clientId, visibility: groupId ? "group" : text("visibility"), ...(groupId ? { groupId } : {}), ...(id ? { parentId: id } : {}), attachments } });
                        break;
                    case "schedule": {
                        let startsAt: string;
                        try {
                            startsAt = resolveCalendarTime(text("startsAt"), zone, text("occurrence") === "later" ? "later" : "earlier");
                        }
                        catch {
                            setError("community.invalidTime");
                            return;
                        }
                        command = communityCommandSchema.parse({ action: "event.create", data: { title, startsAt, minutes: Number(data.get("minutes")), capacity: Number(data.get("capacity")), ...(groupId ? { groupId } : {}) } });
                        break;
                    }
                    default: return;
                }
                communityCommandSchema.parse(command);
                posting.current = true;
                mutation.mutate(command, { onSuccess: () => { form.reset(); setAttachments([]); setSelected([]); attempt.current = null; }, onSettled: () => { posting.current = false; } });
            }
            catch {
                setError("community.invalid");
            }
        }}>
  {!isTextOnly && <label className="block">{t("community.title")}<input name="title" required maxLength={area === "tasks" ? 300 : 100} className={fieldClass}/></label>}
  {showBody && <div><label htmlFor={bodyId}>{t("community.body")}</label><textarea id={bodyId} name="body" required={isTextOnly || area === "feedback" || area === "buddies"} maxLength={area === "groups" ? 2000 : area === "spaces" ? 1000 : 4000} rows={isTextOnly ? 3 : 4} className={fieldClass}/></div>}
  {area === "tasks" && <label className="block">{t("community.date")}<input name="date" type="date" required defaultValue={today} className={fieldClass}/></label>}
  {area === "feedback" && <label className="block">{t("community.category")}<select name="kind" className={fieldClass}><option value="idea">{t("community.idea")}</option><option value="issue">{t("community.issue")}</option></select></label>}
  {(area === "groups" || area === "spaces") && <label className="flex min-h-11 items-center gap-3"><input name="private" type="checkbox" className="size-5 accent-accent"/>{t("community.private")}</label>}
  {area === "spaces" && <label className="block">{t("roadmap.visibility")}<select name="visibility" defaultValue="public" className={fieldClass}>{(["public","unlisted","private"]as const).map(v=><option value={v} key={v}>{t(`roadmap.${v}`)}</option>)}</select></label>}
  {area === "spaces" && <label className="block">{t("community.category")}<select name="category" className={fieldClass}>{(["deep", "pomodoro", "chill", "cram"] as const).map(value => <option key={value} value={value}>{t(`community.${value}`)}</option>)}</select></label>}
  {(area === "spaces" || area === "schedule") && <label className="block">{t("community.capacity")}<input type="number" name="capacity" min={1} max={1000} defaultValue={12} required className={fieldClass}/></label>}
  {area === "buddies" && <><label className="block">{t("community.subjects")}<input name="subjects" maxLength={410} className={fieldClass}/></label><label className="flex min-h-11 items-center gap-3"><input name="published" type="checkbox" defaultChecked className="size-5 accent-accent"/>{t("community.publish")}</label></>}
  {area === "conversations" && <fieldset><legend>{t("community.inviteMembers")}</legend><input aria-label={t("community.search")} value={recipientQuery} onChange={event => setRecipientQuery(event.target.value)} className={fieldClass}/><ul className="mt-2 space-y-2">{recipients.data?.pages.flatMap(page => page.items).filter(item => item.data.kind === "person").map(person => <li key={person.id}><label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={selected.includes(person.id)} onChange={event => setSelected(current => event.target.checked ? [...current, person.id] : current.filter(id => id !== person.id))}/>{person.title}</label></li>)}</ul></fieldset>}
  {area === "schedule" && <><p className="text-small text-text-muted">{t("community.timezone")}: {zone}</p><label className="block">{t("community.startsAt")}<input name="startsAt" type="datetime-local" required className={fieldClass}/></label><label className="block">{t("community.dstChoice")}<select name="occurrence" className={fieldClass}><option value="earlier">{t("community.earlier")}</option><option value="later">{t("community.later")}</option></select></label><label className="block">{t("community.minutes")}<select name="minutes" className={fieldClass}><option value="30">30</option><option value="60">60</option></select></label></>}
  {area === "feed" && !groupId && <label className="block">{t("roadmap.visibility")}<select name="visibility" defaultValue="public" className={fieldClass}><option value="public">{t("roadmap.public")}</option><option value="followers">{t("profile.followers")}</option><option value="private">{t("roadmap.private")}</option></select></label>}
  {area === "feed" && <><label className="block">{t("community.attachment")}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif,audio/mpeg,audio/webm,audio/ogg,application/pdf" disabled={attachments.length >= 4 || upload.isPending} className={fieldClass} onChange={event => { const file = event.target.files?.[0]; if (file)
        upload.mutate(file, { onSuccess: value => setAttachments(current => [...current, value].slice(0, 4)) }); event.target.value = ""; }}/></label><p className="text-small text-text-muted">{t("community.attachmentHint")}</p><ul>{attachments.map(file => <li key={file.path} className="flex min-h-11 items-center justify-between gap-3 text-small"><span className="truncate">{file.name}</span><button type="button" className={buttonClass} onClick={() => setAttachments(current => current.filter(item => item.path !== file.path))}>{t("community.remove")}</button></li>)}</ul></>}
  {(error || mutation.isError || upload.isError) && <p role="alert">{t(error ?? "community.unavailable")}</p>}
  {mutation.isSuccess && <p role="status" className="text-small text-text-muted">{t("community.savedNotice")}</p>}
  <button type="submit" disabled={mutation.isPending || upload.isPending} className={`${buttonClass} bg-accent font-semibold text-background`}>{t(isTextOnly ? "community.send" : "community.create")}</button>
 </form>;
}
