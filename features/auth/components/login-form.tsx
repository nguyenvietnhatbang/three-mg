"use client";

import { useMemo, useState } from "react";
import { LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ApiItemResponse } from "@/features/shared/components/management/types";
import type { AuthSession } from "@/features/auth/types";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nextUrl = useMemo(() => {
    const value = searchParams.get("next");
    return value?.startsWith("/") ? value : "/crm";
  }, [searchParams]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as ApiItemResponse<AuthSession>;

      if (!response.ok || !payload.success) {
        setError(payload.error?.message ?? "Không đăng nhập được");
        return;
      }

      router.replace(nextUrl);
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Không đăng nhập được");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-zinc-700">Email</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-zinc-700">Mật khẩu</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
        />
      </label>
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        <LogIn className="size-4" />
        {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
      <p className="text-center text-xs text-zinc-500">
        Nếu hệ thống chưa có user, mở trang setup để tạo admin đầu tiên.
      </p>
    </form>
  );
}
