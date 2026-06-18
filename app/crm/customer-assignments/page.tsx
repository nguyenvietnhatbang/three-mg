import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Phân công khách hàng | 3M Admin",
};

export default function CustomerAssignmentsPage() {
  return <AdminApp activeModuleKey="customer-assignments" />;
}
