import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Hợp đồng | 3M Admin",
};

export default function ContractsPage() {
  return <AdminApp activeModuleKey="contracts" />;
}
