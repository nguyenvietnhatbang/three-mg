import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Cấu hình lương cá nhân | 3M Admin",
};

export default function PayrollSettingsPage() {
  return <AdminApp activeModuleKey="payroll-settings" />;
}
