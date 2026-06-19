import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Bảng lương | 3M Admin",
};

export default function PayrollPage() {
  return <AdminApp activeModuleKey="payroll-periods" />;
}
