import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Loại thu nhập | 3M Admin",
};

export default function IncomeTypesPage() {
  return <AdminApp activeModuleKey="income-types" />;
}
