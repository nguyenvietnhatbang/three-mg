import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Đối tác | 3M Admin",
};

export default function PartnersPage() {
  return <AdminApp activeModuleKey="partners" />;
}
