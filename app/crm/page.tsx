import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "CRM | 3M Admin",
};

export default function CrmPage() {
  return <AdminApp activeModuleKey="customers" />;
}
