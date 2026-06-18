import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Liên hệ khách hàng | 3M Admin",
};

export default function CustomerContactsPage() {
  return <AdminApp activeModuleKey="customer-contacts" />;
}
