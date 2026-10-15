import { notFound } from "next/navigation";
import { LiveOverviewSurface } from "@/components/live-overview-surface";
import { appHomePath } from "@/lib/app-home";

export const metadata = { robots: { index: false, follow: false } };

export default function DashboardAliasPage() {
  if (appHomePath() !== "/dashboard") notFound();
  return <LiveOverviewSurface />;
}
