import { notFound } from "next/navigation";
import { DevScreen } from "@/components/stats/DevScreen";
import AppLayout from "@/app/(app)/layout";

export default function DevPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  // Run the environment guard before the authenticated shell can redirect.
  return <AppLayout><DevScreen /></AppLayout>;
}
