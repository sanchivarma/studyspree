import { translate, type Locale } from "@/translations";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
export function invitationMessage(name: string, locale: Locale, siteUrl: string) {
  const url = new URL("/login?invite=1", siteUrl).href;
  const sender = name.replace(/[\r\n]+/g, " ").slice(0, 100);
  const subject = translate(locale, "invitations.subject", { name: sender });
  const body = translate(locale, "invitations.emailBody", { name: sender });
  const action = translate(locale, "invitations.join");
  return { subject, text: `${body}\n\n${action}: ${url}`, html: `<p>${escapeHtml(body)}</p><p><a href="${escapeHtml(url)}">${escapeHtml(action)}</a></p>` };
}
