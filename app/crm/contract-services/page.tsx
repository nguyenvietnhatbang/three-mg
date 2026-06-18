import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Dịch vụ hợp đồng | 3M Admin",
};

export default function ContractServicesPage() {
  return <AdminApp activeModuleKey="contract-services" />;
}
