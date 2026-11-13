import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AuthWarning({ children, id, className, isError = false }: { children: ReactNode; id?: string; className?: string; isError?: boolean }) {
  return <p id={id} role="alert" className={cn("flex items-start gap-2 text-small", isError ? "text-destructive" : "text-warning", className)}>
    <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
    <span>{children}</span>
  </p>;
}
