import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Loại phép | 3M Admin",
};

export default function LeaveTypesPage() {
  return <AdminApp activeModuleKey="leave-types" />;
}
