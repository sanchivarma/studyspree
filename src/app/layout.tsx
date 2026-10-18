import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "./providers";
import "./globals.css";
import { cookies } from "next/headers";
import { isLocale, translate } from "@/translations";
import { getSceneMediaManifest } from "@/lib/themes/mediaManifest";

const inter = localFont({ src: "../../public/fonts/InterVariable-v1.woff2", weight: "100 900", display: "swap", variable: "--font-inter" });

async function getLocale() {
  const value = (await cookies()).get("ss_locale")?.value;
  return isLocale(value) ? value : "en";
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "StudySpree", description: translate(await getLocale(), "common.tagline") };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [locale, mediaManifest] = await Promise.all([getLocale(), getSceneMediaManifest()]);
  return (
    <html lang={locale} className={`dark ${inter.variable}`}>
      <body><Providers initialLocale={locale} mediaManifest={mediaManifest}>{children}</Providers></body>
    </html>
  );
}
