import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Đơn nghỉ phép | 3M Admin",
};

export default function LeaveRequestsPage() {
  return <AdminApp activeModuleKey="leave-requests" />;
}
