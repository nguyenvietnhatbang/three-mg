import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Doanh thu | 3M Admin",
};

export default function RevenuePage() {
  return <AdminApp activeModuleKey="orders" />;
}
