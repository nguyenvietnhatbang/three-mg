import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Loại khấu trừ | 3M Admin",
};

export default function DeductionTypesPage() {
  return <AdminApp activeModuleKey="deduction-types" />;
}
