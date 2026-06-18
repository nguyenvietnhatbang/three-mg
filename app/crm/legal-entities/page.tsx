import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Pháp nhân | 3M Admin",
};

export default function LegalEntitiesPage() {
  return <AdminApp activeModuleKey="legal-entities" />;
}
