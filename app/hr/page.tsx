import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Nhân sự | 3M Admin",
};

export default function HrPage() {
  return <AdminApp activeModuleKey="employees" />;
}
