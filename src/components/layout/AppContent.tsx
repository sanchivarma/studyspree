"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSession = pathname.startsWith("/session") || pathname.startsWith("/rooms/");

  return (
    <div className={cn("flex min-h-dvh flex-col", !isSession && "pb-14 md:pb-0 md:pl-16")}>
      <main className="relative flex-1">{children}</main>
    </div>
  );
}
