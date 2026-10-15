"use client";
import type { PublicPerson } from "@/types/dashboard";
import { useTranslation } from "@/hooks/useTranslation";

export function OnlinePeople({ people }: { people: PublicPerson[] }) {
  const { t } = useTranslation();
  if (!people.length) return null;
  return <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
    <h2 className="font-semibold">{t("dashboard.onlinePeople")}</h2><ul className="mt-3 flex flex-wrap gap-3">{people.map(person => <li key={person.id} className="rounded-xl border border-border px-3 py-2 text-small">{person.displayName}</li>)}</ul>
  </section>;
}
