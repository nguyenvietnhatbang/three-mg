import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Phòng ban | 3M Admin",
};

export default function DepartmentsPage() {
  return <AdminApp activeModuleKey="departments" />;
}
