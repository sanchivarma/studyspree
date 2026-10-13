import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";
import { cookies } from "next/headers";
import { isLocale, translate } from "@/translations";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

async function getLocale() {
  const value = (await cookies()).get("ss_locale")?.value;
  return isLocale(value) ? value : "en";
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "StudySpree", description: translate(await getLocale(), "common.tagline") };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`dark ${inter.variable}`}>
      <body><Providers initialLocale={locale}>{children}</Providers></body>
    </html>
  );
}
