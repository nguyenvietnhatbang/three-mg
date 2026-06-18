import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Số dư phép | 3M Admin",
};

export default function LeaveBalancesPage() {
  return <AdminApp activeModuleKey="leave-balances" />;
}
