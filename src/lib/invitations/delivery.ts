import "server-only";
import nodemailer from "nodemailer";
import type { InvitationConfiguration } from "./configuration";
import type { invitationMessage } from "./message";

export async function deliverInvitation(config: InvitationConfiguration, email: string, requestId: string, message: ReturnType<typeof invitationMessage>) {
  if (config.kind === "smtp") {
    const transport = nodemailer.createTransport({ host: config.host, port: config.port, secure: config.port === 465, requireTLS: config.port === 587, auth: { user: config.user, pass: config.pass }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000, disableFileAccess: true, disableUrlAccess: true });
    try {
      const result = await transport.sendMail({ from: { name: "StudySpree", address: config.from }, to: email, ...message, messageId: `<${requestId}@${config.from.split("@")[1]}>` });
      if (!result.accepted?.length || result.rejected?.length) throw new Error("Email not accepted");
      return "sent" as const;
    } finally { transport.close(); }
  }
  const response = config.kind === "resend"
    ? await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json", "Idempotency-Key": `studyspree-invite/${requestId}` }, body: JSON.stringify({ from: `StudySpree <${config.from}>`, to: [email], ...message }), signal: AbortSignal.timeout(15000), cache: "no-store" })
    : await fetch("http://127.0.0.1:54324/api/v1/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ From: { Name: "StudySpree", Email: config.from }, To: [{ Email: email }], Subject: message.subject, Text: message.text, HTML: message.html }), signal: AbortSignal.timeout(10000), cache: "no-store" });
  if (!response.ok) throw new Error("Email not accepted");
  return config.kind === "mailpit" ? "captured" as const : "sent" as const;
}
