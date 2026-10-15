import { notFound } from "next/navigation";
import { DevScreen } from "@/components/stats/DevScreen";

export default function DevPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <DevScreen />;
}
