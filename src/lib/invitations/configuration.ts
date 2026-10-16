import "server-only";
import { z } from "zod";
import { getSiteUrl, isLocalAuth } from "@/lib/auth/config";

export type InvitationConfiguration =
  | { kind: "mailpit"; siteUrl: string; from: string }
  | { kind: "smtp"; siteUrl: string; from: string; host: string; port: number; user: string; pass: string }
  | { kind: "resend"; siteUrl: string; from: string; key: string };

export function invitationConfiguration(): InvitationConfiguration {
  const smtp = [process.env.SMTP_HOST, process.env.SMTP_USER, process.env.SMTP_PASS];
  const forced = process.env.INVITATION_EMAIL_TRANSPORT;
  if (forced && !["mailpit", "smtp", "resend"].includes(forced)) throw new Error("Unknown email transport");
  const hasSmtp = forced === "smtp" || (!forced && smtp.some(Boolean));
  const hasApi = forced === "resend" || (!forced && Boolean(process.env.RESEND_API_KEY));
  const local = isLocalAuth();
  if (forced === "mailpit") {
    if (!local) throw new Error("Local email capture requires local Supabase");
    return { kind: "mailpit", siteUrl: getSiteUrl(), from: "invites@studyspree.local" };
  }
  if (!hasSmtp && !hasApi) {
    if (local) return { kind: "mailpit", siteUrl: getSiteUrl(), from: "invites@studyspree.local" };
    throw new Error("Email is not configured");
  }
  const siteUrl = new URL(process.env.INVITATION_SITE_URL ?? getSiteUrl());
  if (siteUrl.protocol !== "https:" || /^(localhost|127\.|10\.|192\.168\.|0\.0\.0\.0|\[::1\])/.test(siteUrl.hostname)) throw new Error("Public invitation URL required");
  const rawFrom = process.env.INVITATION_FROM || process.env.SMTP_USER || "";
  const from = z.email().parse(rawFrom.match(/<([^<>\r\n]+)>$/)?.[1] ?? rawFrom);
  if (hasSmtp) {
    const values = z.object({ host: z.string().trim().min(1), user: z.email(), pass: z.string().min(1), port: z.coerce.number().pipe(z.union([z.literal(465), z.literal(587)])) }).parse({ host: smtp[0], user: smtp[1], pass: smtp[2], port: process.env.SMTP_PORT || "465" });
    return { kind: "smtp", siteUrl: siteUrl.origin, from, ...values };
  }
  if (!process.env.RESEND_API_KEY) throw new Error("Email API key required");
  return { kind: "resend", siteUrl: siteUrl.origin, from, key: process.env.RESEND_API_KEY };
}

export function invitationDeliveryMode(): "smtp" | "resend" | "mailpit" | "unavailable" {
  try { return invitationConfiguration().kind; } catch { return "unavailable"; }
}
