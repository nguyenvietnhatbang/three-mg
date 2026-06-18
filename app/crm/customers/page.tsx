import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Khách hàng | 3M Admin",
};

export default function CustomersPage() {
  return <AdminApp activeModuleKey="customers" />;
}
