import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Ngoại lệ chính sách | 3M Admin",
};

export default function PolicyOverridesPage() {
  return <AdminApp activeModuleKey="policy-overrides" />;
}
