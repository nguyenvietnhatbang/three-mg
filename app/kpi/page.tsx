import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "KPI | 3M Admin",
};

export default function KpiPage() {
  return <AdminApp activeModuleKey="kpi-snapshots" />;
}
