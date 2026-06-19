import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Đăng nhập | 3M Admin",
};

export default function LoginPage() {
  return (
    <AuthCard
      title="Đăng nhập"
      description="Truy cập hệ thống quản trị bằng tài khoản đã được cấp quyền."
    >
      <Suspense fallback={<div className="text-sm text-zinc-500">Đang tải form...</div>}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
