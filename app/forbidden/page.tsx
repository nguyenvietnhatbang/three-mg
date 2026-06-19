import Link from "next/link";
import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Không có quyền | 3M Admin",
};

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 text-zinc-950">
      <section className="w-full max-w-lg rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-red-50 text-red-700">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Bạn không có quyền truy cập màn này</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Tài khoản hiện tại chưa được cấp quyền cho module hoặc thao tác này.
        </p>
        <Link
          href="/crm/customers"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Về trang chính
        </Link>
      </section>
    </main>
  );
}
