"use server";

import { cookies } from "next/headers";
import { isLocale } from "@/translations/locale";

export async function saveLanguage(value: unknown) {
  if (!isLocale(value)) return;
  (await cookies()).set("ss_locale", value, { path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 31536000 });
}
