import type { ReactNode } from "react";

const labels: Record<string, string> = {
  active: "Đang hoạt động",
  inactive: "Ngưng hoạt động",
  archived: "Lưu trữ",
  draft: "Nháp",
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  expiring: "Sắp hết hạn",
  terminated: "Chấm dứt",
  cancelled: "Đã hủy",
  probation: "Thử việc",
  full_time: "Full-time",
  part_time: "Part-time",
  contractor: "Cộng tác viên",
  other: "Khác",
  gross: "Gross",
  net: "Net",
  taxable: "Chịu thuế",
  non_taxable: "Miễn thuế",
  monthly: "Hàng tháng",
  quarterly: "Hàng quý",
  yearly: "Hàng năm",
  one_time: "Một lần",
  custom: "Tùy chỉnh",
};

const styles: Record<string, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  inactive: "border-zinc-200 bg-zinc-50 text-zinc-600",
  archived: "border-zinc-200 bg-zinc-100 text-zinc-600",
  draft: "border-amber-200 bg-amber-50 text-amber-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  expiring: "border-orange-200 bg-orange-50 text-orange-700",
  terminated: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
  probation: "border-sky-200 bg-sky-50 text-sky-700",
  full_time: "border-emerald-200 bg-emerald-50 text-emerald-700",
  part_time: "border-blue-200 bg-blue-50 text-blue-700",
  contractor: "border-purple-200 bg-purple-50 text-purple-700",
  other: "border-zinc-200 bg-zinc-50 text-zinc-600",
  gross: "border-indigo-200 bg-indigo-50 text-indigo-700",
  net: "border-teal-200 bg-teal-50 text-teal-700",
  taxable: "border-orange-200 bg-orange-50 text-orange-700",
  non_taxable: "border-emerald-200 bg-emerald-50 text-emerald-700",
  monthly: "border-blue-200 bg-blue-50 text-blue-700",
  quarterly: "border-violet-200 bg-violet-50 text-violet-700",
  yearly: "border-cyan-200 bg-cyan-50 text-cyan-700",
  one_time: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  custom: "border-slate-200 bg-slate-50 text-slate-700",
};

export function StatusBadge({ value }: { value: ReactNode }) {
  const key = String(value ?? "");

  return (
    <span
      className={`inline-flex h-6 items-center rounded-full border px-2 text-xs font-medium ${
        styles[key] ?? "border-zinc-200 bg-zinc-50 text-zinc-600"
      }`}
    >
      {labels[key] ?? (key || "Chưa có")}
    </span>
  );
}
