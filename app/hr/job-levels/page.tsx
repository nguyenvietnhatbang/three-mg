import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Bậc chức danh | 3M Admin",
};

export default function JobLevelsPage() {
  return <AdminApp activeModuleKey="job-levels" />;
}
