"use client";
import Link from "next/link";
import { useState } from "react";
import { useCommunity } from "@/hooks/useCommunity";
import { useCommunityMutation } from "@/hooks/useCommunityMutation";
import { useTranslation } from "@/hooks/useTranslation";
import { ContactSelection, contactListsSchema } from "./ContactSelection";
import { buttonClass } from "./CommunityComposer";

export function ContactsScreen() {
  const { t } = useTranslation();
  const query = useCommunity("contacts");
  const mutation = useCommunityMutation();
  const [username, setUsername] = useState("");
  const [title, setTitle] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [notice, setNotice] = useState(false);
  const items = query.data?.pages.flatMap(page => page.items) ?? [];
  const lists = contactListsSchema.catch([]).parse(query.data?.pages[0]?.context.lists ?? []);
  return <section className="mx-auto max-w-4xl space-y-6 p-4 md:p-8" data-testid="contacts-screen">
    <h1 className="text-title">{t("contacts.title")}</h1>
    <p className="text-text-muted">{t("contacts.description")}</p>
    <Link href="/invite" className="inline-flex min-h-11 items-center underline">{t("invitations.title")}</Link>
    <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); setNotice(false); mutation.mutate({ action: "contact.request", data: { username } }, { onSuccess: () => { setUsername(""); setNotice(true); } }); }}>
      <label className="flex-1">{t("common.username")}<input required maxLength={30} value={username} onChange={event => setUsername(event.target.value)} className="mt-2 block min-h-11 w-full rounded-xl border border-border bg-surface px-3"/></label>
      <button className={buttonClass} disabled={mutation.isPending}>{t("contacts.add")}</button>
    </form>
    {notice && <p role="status">{t("contacts.sent")}</p>}
    {(mutation.isError || query.isError) && <p role="alert">{t("contacts.error")}</p>}
    {query.isPending && <p role="status">{t("community.loading")}</p>}
    <ul className="space-y-2">{items.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3">
      <div><p>{item.title} <span className="text-text-muted">@{item.body}</span></p><p className="text-small text-text-muted">{t(item.data.accepted ? "contacts.accepted" : item.data.incoming ? "contacts.incoming" : "contacts.pending")}</p></div>
      <div className="flex gap-2">{!item.data.accepted && item.data.incoming === true && <button className={buttonClass} disabled={mutation.isPending} onClick={() => mutation.mutate({ action: "contact.accept", data: { id: item.id } })}>{t("contacts.accept")}</button>}
        <button className={buttonClass} disabled={mutation.isPending} onClick={() => mutation.mutate({ action: "contact.remove", data: { id: item.id } })}>{t("community.remove")}</button></div>
    </li>)}</ul>
    {query.hasNextPage && <button className={buttonClass} onClick={() => void query.fetchNextPage()}>{t("community.loadMore")}</button>}
    <form className="space-y-3 rounded-2xl border border-border p-4" onSubmit={event => { event.preventDefault(); mutation.mutate({ action: "contact.list.create", data: { title, members } }, { onSuccess: () => { setTitle(""); setMembers([]); } }); }}>
      <h2 className="text-subtitle">{t("contacts.createList")}</h2>
      <label className="block">{t("contacts.listName")}<input required maxLength={100} value={title} onChange={event => setTitle(event.target.value)} className="mt-2 block min-h-11 w-full rounded-xl border border-border bg-surface px-3"/></label>
      <ContactSelection contacts={members} lists={[]} onContacts={setMembers} onLists={() => {}} includeLists={false}/>
      <button className={buttonClass} disabled={mutation.isPending}>{t("contacts.createList")}</button>
    </form>
    <ul className="space-y-2">{lists.map(list => <li key={list.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"><span>{list.title} <span className="tabular-nums text-text-muted">({list.members.length})</span></span><button className={buttonClass} onClick={() => mutation.mutate({ action: "contact.list.remove", data: { id: list.id } })}>{t("community.remove")}</button></li>)}</ul>
  </section>;
}
