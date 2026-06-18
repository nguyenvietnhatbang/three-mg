import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Nhân viên | 3M Admin",
};

export default function EmployeesPage() {
  return <AdminApp activeModuleKey="employees" />;
}
