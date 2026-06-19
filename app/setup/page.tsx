import type { Metadata } from "next";
import { AuthCard } from "@/features/auth/components/auth-card";
import { SetupForm } from "@/features/auth/components/setup-form";

export const metadata: Metadata = {
  title: "Setup admin | 3M Admin",
};

export default function SetupPage() {
  return (
    <AuthCard
      title="Setup admin đầu tiên"
      description="Trang này chỉ dùng khi hệ thống chưa có người dùng nào. Sau khi có user, API setup sẽ tự từ chối."
    >
      <SetupForm />
    </AuthCard>
  );
}
