import { invitationResultSchema, invitationErrorSchema, type InvitationErrorCode } from "@/lib/invitations/schemas";
import type { Locale } from "@/translations";
export class InvitationError extends Error {
  constructor(public code: InvitationErrorCode) { super(code); }
}
export const invitationRepository = {
  async send(email: string, locale: Locale) {
    const response = await fetch("/api/invitations", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, locale, requestId: crypto.randomUUID() }), cache: "no-store" });
    const result: unknown = await response.json();
    if (!response.ok) {
      const code = result && typeof result === "object" && "error" in result ? invitationErrorSchema.safeParse(result.error) : null;
      throw new InvitationError(code?.success ? code.data : "unavailable");
    }
    return invitationResultSchema.parse(result);
  },
};
