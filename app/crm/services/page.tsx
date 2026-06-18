import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Dịch vụ | 3M Admin",
};

export default function ServicesPage() {
  return <AdminApp activeModuleKey="services" />;
}
