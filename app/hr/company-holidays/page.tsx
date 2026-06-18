import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Lịch nghỉ công ty | 3M Admin",
};

export default function CompanyHolidaysPage() {
  return <AdminApp activeModuleKey="company-holidays" />;
}
