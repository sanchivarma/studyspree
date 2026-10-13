"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, Flame, Home, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

const items = [
  { label: "common.start", href: "/home", icon: Home },
  { label: "common.study", href: "/study", icon: BookOpen },
  { label: "common.stats", href: "/stats", icon: BarChart3 },
  { label: "common.settings", href: "/settings", icon: Settings },
] as const;

export function AppNav({ showStreak }: { showStreak: boolean }) {
  const pathname = usePathname();
  const { t } = useTranslation();

  if (pathname.startsWith("/session")) return null;

  return (
    <nav
      aria-label={t("common.navLabel")}
      className="fixed inset-x-0 bottom-0 z-50 h-14 border-t border-border bg-surface md:inset-y-0 md:right-auto md:h-dvh md:w-16 md:border-t-0 md:border-r"
    >
      <div className="grid h-full grid-cols-4 items-center gap-2 px-2 md:flex md:flex-col md:gap-3 md:pt-6">
        {items.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:w-11 md:shrink-0 md:gap-0",
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
              <span className="text-[10px] leading-3 md:sr-only">{t(label)}</span>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-[calc(100%+12px)] hidden -translate-y-1/2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-small text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 md:block"
              >
                {t(label)}
              </span>
            </Link>
          );
        })}
      </div>
      {showStreak && pathname !== "/home" && pathname !== "/study" && (
        <div
          role="img"
          aria-label={t("common.ready")}
          className="absolute inset-x-0 bottom-6 hidden items-center justify-center gap-1 text-small text-text-muted md:flex"
        >
          <Flame aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
          <span aria-hidden="true" className="tabular-nums">0</span>
        </div>
      )}
    </nav>
  );
}
