"use client";
import { z } from "zod";
import { useCommunity } from "@/hooks/useCommunity";
import { useTranslation } from "@/hooks/useTranslation";

export const contactListsSchema = z.array(z.object({ id: z.uuid(), title: z.string(), members: z.array(z.uuid()) }));

export function ContactSelection({ contacts, lists, onContacts, onLists, includeLists = true }: {
  contacts: string[]; lists: string[];
  onContacts: (ids: string[]) => void; onLists: (ids: string[]) => void; includeLists?: boolean;
}) {
  const query = useCommunity("contacts");
  const { t } = useTranslation();
  const people = query.data?.pages.flatMap(page => page.items).filter(item => item.data.accepted === true) ?? [];
  const groups = contactListsSchema.catch([]).parse(query.data?.pages[0]?.context.lists ?? []);
  const toggle = (values: string[], id: string) => values.includes(id) ? values.filter(value => value !== id) : [...values, id];
  return <fieldset className="space-y-2 rounded-xl border border-border p-3"><legend>{t("calendar.inviteContacts")}</legend>
    {people.map(person => <label key={person.id} className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={contacts.includes(String(person.data.contactId))} onChange={() => onContacts(toggle(contacts, String(person.data.contactId)))}/>{person.title} <span className="text-small text-text-muted">@{person.body}</span></label>)}
    {includeLists && groups.map(list => <label key={list.id} className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={lists.includes(list.id)} onChange={() => onLists(toggle(lists, list.id))}/>{t("contacts.list")}: {list.title}</label>)}
    {!people.length && <p className="text-small text-text-muted">{t("contacts.acceptedHint")}</p>}
    {query.hasNextPage && <button type="button" className="min-h-11 underline" onClick={() => void query.fetchNextPage()}>{t("community.loadMore")}</button>}
  </fieldset>;
}
