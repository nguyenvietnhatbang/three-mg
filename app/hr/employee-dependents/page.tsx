import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Người phụ thuộc | 3M Admin",
};

export default function EmployeeDependentsPage() {
  return <AdminApp activeModuleKey="employee-dependents" />;
}
